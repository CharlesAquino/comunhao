-- ============================================================
-- Migration: Tabela de Patentes + Prova de Ascensão + Temporada
-- ============================================================

-- 0. Tabela de patentes (referência para as RPCs)
CREATE TABLE IF NOT EXISTS public.patentes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  xp_min INTEGER NOT NULL,
  ordem INTEGER NOT NULL
);

INSERT INTO public.patentes (id, nome, xp_min, ordem) VALUES
  ('anjo', 'Anjo', 0, 1),
  ('arcanjo', 'Arcanjo', 300, 2),
  ('principado', 'Principado', 800, 3),
  ('potestade', 'Potestade', 1800, 4),
  ('virtude', 'Virtude', 3500, 5),
  ('dominacao', 'Dominação', 6000, 6),
  ('trono', 'Trono', 9500, 7),
  ('querubim', 'Querubim', 13500, 8),
  ('serafim', 'Serafim', 18500, 9)
ON CONFLICT (id) DO NOTHING;

-- 1. Inserir temporada atual (2026.3 — 3º trimestre EBD)
INSERT INTO public.temporadas (nome, inicio, fim, ativa)
SELECT 'Temporada 2026.3', '2026-07-01 00:00:00-03', '2026-09-30 23:59:59-03', true
WHERE NOT EXISTS (SELECT 1 FROM public.temporadas WHERE nome = 'Temporada 2026.3');

-- ============================================================
-- RPC: iniciar_prova_ascensao
-- Dispara a Prova quando usuário enche 100 PC na divisão I
-- ============================================================
CREATE OR REPLACE FUNCTION public.iniciar_prova_ascensao(
  p_usuario_id UUID
) RETURNS public.provas_ascensao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prova public.provas_ascensao;
  v_xp_atual INTEGER;
  v_patente_atual RECORD;
  v_proxima_patente RECORD;
  v_metas JSONB;
BEGIN
  -- Verifica se já tem prova ativa
  SELECT * INTO v_prova
  FROM public.provas_ascensao
  WHERE usuario_id = p_usuario_id AND status = 'ativa'
  LIMIT 1;

  IF FOUND THEN
    RETURN v_prova;
  END IF;

  -- Encontra patente atual e próxima
  SELECT xp INTO v_xp_atual FROM public.usuarios WHERE id = p_usuario_id;

  SELECT * INTO v_patente_atual
  FROM public.patentes
  WHERE xp_min <= v_xp_atual
  ORDER BY xp_min DESC
  LIMIT 1;

  SELECT * INTO v_proxima_patente
  FROM public.patentes
  WHERE ordem = v_patente_atual.ordem + 1;

  -- Se já é Serafim (não tem próximo), não cria prova
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PATENTE_MAXIMA';
  END IF;

  v_metas := jsonb_build_array(
    jsonb_build_object('descricao', 'Orar 2 vezes', 'cumprida', false),
    jsonb_build_object('descricao', 'Concluir 1 lição', 'cumprida', false),
    jsonb_build_object('descricao', 'Interceder no Mural', 'cumprida', false)
  );

  INSERT INTO public.provas_ascensao (usuario_id, tier_alvo, expira_em, metas_cumpridas, status)
  VALUES (
    p_usuario_id,
    v_proxima_patente.nome,
    now() + interval '7 days',
    v_metas,
    'ativa'
  )
  RETURNING * INTO v_prova;

  RETURN v_prova;
END;
$$;

-- ============================================================
-- ATUALIZAR: creditar_pc — agora com verificação de Prova
-- ============================================================
CREATE OR REPLACE FUNCTION public.creditar_pc(
  p_usuario_id UUID,
  p_quantidade INTEGER,
  p_referencia_id TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pc_atual INTEGER;
  v_pc_final INTEGER;
  v_xp_atual INTEGER;
  v_patente RECORD;
  v_proxima_patente RECORD;
  v_divisao INTEGER;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
  END IF;

  SELECT pontos_comunhao_divisao, xp
  INTO v_pc_atual, v_xp_atual
  FROM public.usuarios WHERE id = p_usuario_id;

  v_pc_final := LEAST(v_pc_atual + p_quantidade, 100);

  UPDATE public.usuarios
  SET pontos_comunhao_divisao = v_pc_final,
      ultima_atividade = now()
  WHERE id = p_usuario_id;

  -- Se atingiu 100 PC, verifica se está na divisão I
  IF v_pc_final = 100 THEN
    SELECT * INTO v_patente
    FROM public.patentes
    WHERE xp_min <= v_xp_atual
    ORDER BY xp_min DESC
    LIMIT 1;

    SELECT * INTO v_proxima_patente
    FROM public.patentes
    WHERE ordem = v_patente.ordem + 1;

    IF FOUND THEN
      -- Calcula divisão: I (4) = último quartil do intervalo
      -- Só dispara prova se estiver na divisão I
      v_divisao := 4;
      -- Verifica se XP está no último quartil do intervalo
      IF v_xp_atual >= v_proxima_patente.xp_min - ((v_proxima_patente.xp_min - v_patente.xp_min) / 4)::INTEGER THEN
        PERFORM public.iniciar_prova_ascensao(p_usuario_id);
      END IF;
    END IF;
  END IF;

  RETURN v_pc_final;
END;
$$;

-- ============================================================
-- RPC: verificar_prova_ascensao
-- Verifica provas ativas e atualiza metas cumpridas
-- Se completas, promove o usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.verificar_prova_ascensao(
  p_prova_id UUID
) RETURNS TABLE (concluida BOOLEAN, metas_cumpridas INTEGER, total_metas INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prova public.provas_ascensao;
  v_usuario_id UUID;
  v_inicio TIMESTAMPTZ;
  v_contador INTEGER;
  v_metas_atualizadas JSONB;
  v_cumpridas INTEGER := 0;
  v_total INTEGER := 0;
  v_xp_atual INTEGER;
  v_proximo_xp INTEGER;
BEGIN
  SELECT * INTO v_prova
  FROM public.provas_ascensao
  WHERE id = p_prova_id AND status = 'ativa'
  FOR UPDATE;

  IF NOT FOUND THEN
    concluida := false; metas_cumpridas := 0; total_metas := 0;
    RETURN NEXT; RETURN;
  END IF;

  IF now() > v_prova.expira_em THEN
    UPDATE public.provas_ascensao SET status = 'expirada' WHERE id = p_prova_id;
    concluida := false; metas_cumpridas := 0;
    total_metas := jsonb_array_length(v_prova.metas_cumpridas);
    RETURN NEXT; RETURN;
  END IF;

  v_usuario_id := v_prova.usuario_id;
  v_inicio := v_prova.iniciada_em;
  v_metas_atualizadas := '[]'::jsonb;

  FOR i IN 0..jsonb_array_length(v_prova.metas_cumpridas) - 1 LOOP
    v_total := v_total + 1;

    CASE v_prova.metas_cumpridas->i->>'descricao'
      WHEN 'Orar 2 vezes' THEN
        SELECT COUNT(*)::INTEGER INTO v_contador
        FROM public.historico_oracoes
        WHERE (usuario_1_id = v_usuario_id OR usuario_2_id = v_usuario_id)
          AND finalizado_em >= v_inicio;

      WHEN 'Concluir 1 lição' THEN
        SELECT COUNT(*)::INTEGER INTO v_contador
        FROM public.kesef_ledger
        WHERE usuario_id = v_usuario_id
          AND tipo = 'licao'
          AND criado_em >= v_inicio;

      WHEN 'Interceder no Mural' THEN
        SELECT COUNT(*)::INTEGER INTO v_contador
        FROM public.intercessoes
        WHERE usuario_id = v_usuario_id
          AND criado_em >= v_inicio;

      ELSE
        v_contador := 0;
    END CASE;

    IF v_contador > 0 THEN
      v_cumpridas := v_cumpridas + 1;
      v_metas_atualizadas := v_metas_atualizadas || jsonb_build_object(
        'descricao', v_prova.metas_cumpridas->i->>'descricao',
        'cumprida', true
      );
    ELSE
      v_metas_atualizadas := v_metas_atualizadas || v_prova.metas_cumpridas->i;
    END IF;
  END LOOP;

  UPDATE public.provas_ascensao SET metas_cumpridas = v_metas_atualizadas WHERE id = p_prova_id;

  -- Se 3/3 cumpridas, promove!
  IF v_cumpridas >= 3 THEN
    UPDATE public.provas_ascensao SET status = 'completa' WHERE id = p_prova_id;

    SELECT xp INTO v_xp_atual FROM public.usuarios WHERE id = v_usuario_id;

    SELECT xp_min INTO v_proximo_xp
    FROM public.patentes WHERE nome = v_prova.tier_alvo;

    UPDATE public.usuarios
    SET
      xp = GREATEST(xp, v_proximo_xp),
      pontos_comunhao_divisao = 0,
      temporada_recorde_tier = v_prova.tier_alvo,
      temporada_recorde_data = now()
    WHERE id = v_usuario_id;
  END IF;

  concluida := v_cumpridas >= 3;
  metas_cumpridas := v_cumpridas;
  total_metas := v_total;
  RETURN NEXT;
END;
$$;

-- ============================================================
-- RPC: verificar_provas_pendentes
-- Varre provas ativas de um usuário (ou todas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verificar_provas_pendentes(
  p_usuario_id UUID DEFAULT NULL
) RETURNS TABLE (prova_id UUID, concluida BOOLEAN, tier_alvo TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prova RECORD;
  v_result RECORD;
BEGIN
  FOR v_prova IN
    SELECT * FROM public.provas_ascensao
    WHERE status = 'ativa'
      AND (p_usuario_id IS NULL OR usuario_id = p_usuario_id)
  LOOP
    SELECT * INTO v_result
    FROM public.verificar_prova_ascensao(v_prova.id);

    prova_id := v_prova.id;
    concluida := v_result.concluida;
    tier_alvo := v_prova.tier_alvo;
    status := CASE WHEN v_result.concluida THEN 'completa' ELSE 'em_andamento' END;
    RETURN NEXT;
  END LOOP;

  -- Se não houver provas ativas
  IF NOT FOUND THEN
    prova_id := NULL;
    concluida := false;
    tier_alvo := NULL;
    status := 'sem_prova';
    RETURN NEXT;
  END IF;
END;
$$;
