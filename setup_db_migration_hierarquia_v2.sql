-- ============================================================
-- Migration: Hierarquia Angelical v2 — Elo Completo
-- 9 Coros, divisões IV→I, PC, Provas de Ascensão, Temporadas
-- ============================================================

-- 1. Colunas novas em usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS divisao INTEGER CHECK (divisao BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS pontos_comunhao_divisao INTEGER NOT NULL DEFAULT 0 CHECK (pontos_comunhao_divisao BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS temporada_recorde_tier TEXT,
  ADD COLUMN IF NOT EXISTS temporada_recorde_data TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_atividade TIMESTAMPTZ DEFAULT now();

-- 2. Tabela de Temporadas
CREATE TABLE IF NOT EXISTS public.temporadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Provas de Ascensão
CREATE TABLE IF NOT EXISTS public.provas_ascensao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tier_alvo TEXT NOT NULL,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  metas_cumpridas JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'completa', 'expirada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provas_usuario ON public.provas_ascensao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_provas_status ON public.provas_ascensao(status);
CREATE INDEX IF NOT EXISTS idx_temporadas_ativa ON public.temporadas(ativa) WHERE ativa = true;

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provas_ascensao ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
CREATE POLICY "temporadas_select_todos" ON public.temporadas
  FOR SELECT USING (true);

CREATE POLICY "provas_ascensao_select_propria" ON public.provas_ascensao
  FOR SELECT USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "provas_ascensao_insert_propria" ON public.provas_ascensao
  FOR INSERT WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "provas_ascensao_update_propria_ou_admin" ON public.provas_ascensao
  FOR UPDATE USING (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()) OR
    (SELECT papel FROM public.usuarios WHERE auth_user_id = auth.uid()) = 'admin'
  );

-- ============================================================
-- RPC: creditar_pc
-- Adiciona Pontos de Comunhão (0-100) ao usuário
-- Se atingir 100, gatilho para possível Prova de Ascensão
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
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
  END IF;

  SELECT pontos_comunhao_divisao INTO v_pc_atual
  FROM public.usuarios WHERE id = p_usuario_id;

  v_pc_final := LEAST(v_pc_atual + p_quantidade, 100);

  UPDATE public.usuarios
  SET pontos_comunhao_divisao = v_pc_final,
      ultima_atividade = now()
  WHERE id = p_usuario_id;

  RETURN v_pc_final;
END;
$$;

-- ============================================================
-- RPC: creditar_xp (versão atualizada — já ultima_atividade)
-- ============================================================
DROP FUNCTION IF EXISTS public.creditar_xp(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.creditar_xp(
  p_usuario_id UUID,
  p_quantidade INTEGER,
  p_referencia_id TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_novo_xp INTEGER;
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA';
  END IF;

  UPDATE public.usuarios
  SET xp = xp + p_quantidade,
      ultima_atividade = now()
  WHERE id = p_usuario_id
  RETURNING xp INTO v_novo_xp;

  RETURN v_novo_xp;
END;
$$;

-- ============================================================
-- RPC: registrar_evento_engajamento (ATUALIZADO com PC)
-- Agora credita Kesef + XP + PC em uma chamada
-- ============================================================
DROP FUNCTION IF EXISTS public.registrar_evento_engajamento(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.registrar_evento_engajamento(
  p_usuario_id UUID,
  p_tipo_evento TEXT,
  p_referencia_id TEXT DEFAULT NULL
) RETURNS TABLE (
  kesef_creditado BOOLEAN,
  xp_creditado BOOLEAN,
  pc_creditado BOOLEAN,
  kesef_quantidade INTEGER,
  xp_quantidade INTEGER,
  pc_quantidade INTEGER,
  mensagem TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kesef_qtd INTEGER;
  v_xp_qtd INTEGER;
  v_pc_qtd INTEGER;
BEGIN
  -- Mapeia tipo_evento → quantidades
  CASE p_tipo_evento
    WHEN 'oracao' THEN
      v_kesef_qtd := 10;
      v_xp_qtd := 5;
      v_pc_qtd := 6;
    WHEN 'licao' THEN
      v_kesef_qtd := 5;
      v_xp_qtd := 10;
      v_pc_qtd := 8;
    WHEN 'quiz_acerto' THEN
      v_kesef_qtd := 3;
      v_xp_qtd := 3;
      v_pc_qtd := 4;
    WHEN 'streak_7' THEN
      v_kesef_qtd := 15;
      v_xp_qtd := 12;
      v_pc_qtd := 20;
    WHEN 'streak_30' THEN
      v_kesef_qtd := 50;
      v_xp_qtd := 50;
      v_pc_qtd := 60;
    WHEN 'indicacao' THEN
      v_kesef_qtd := 20;
      v_xp_qtd := 15;
      v_pc_qtd := 12;
    ELSE
      RAISE EXCEPTION 'TIPO_EVENTO_INVALIDO: %', p_tipo_evento;
  END CASE;

  -- Tenta creditar_kesef (pode falhar por CAP_DIARIO)
  BEGIN
    PERFORM public.creditar_kesef(p_usuario_id, p_tipo_evento, v_kesef_qtd, p_referencia_id);
    kesef_creditado := true;
    kesef_quantidade := v_kesef_qtd;
  EXCEPTION
    WHEN OTHERS THEN
      kesef_creditado := false;
      kesef_quantidade := 0;
  END;

  -- XP sempre credita (sem cap diário)
  BEGIN
    PERFORM public.creditar_xp(p_usuario_id, v_xp_qtd, p_referencia_id);
    xp_creditado := true;
    xp_quantidade := v_xp_qtd;
  EXCEPTION
    WHEN OTHERS THEN
      xp_creditado := false;
      xp_quantidade := 0;
  END;

  -- PC sempre credita (sem cap diário)
  BEGIN
    PERFORM public.creditar_pc(p_usuario_id, v_pc_qtd, p_referencia_id);
    pc_creditado := true;
    pc_quantidade := v_pc_qtd;
  EXCEPTION
    WHEN OTHERS THEN
      pc_creditado := false;
      pc_quantidade := 0;
  END;

  mensagem := CASE
    WHEN kesef_creditado AND xp_creditado AND pc_creditado THEN 'OK'
    WHEN NOT kesef_creditado AND xp_creditado AND pc_creditado THEN 'CAP_DIARIO_ATINGIDO'
    ELSE 'ERRO_PARCIAL'
  END;

  RETURN NEXT;
END;
$$;

-- ============================================================
-- RPC: calcular_chama (força de engajamento)
-- Retorna nível da chama baseado em ultima_atividade
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_chama(
  p_usuario_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ultima TIMESTAMPTZ;
  v_dias INTEGER;
BEGIN
  SELECT ultima_atividade INTO v_ultima
  FROM public.usuarios WHERE id = p_usuario_id;

  IF v_ultima IS NULL THEN
    RETURN 'apagada';
  END IF;

  v_dias := EXTRACT(DAY FROM now() - v_ultima)::INTEGER;

  RETURN CASE
    WHEN v_dias <= 3 THEN 'acesa'
    WHEN v_dias <= 7 THEN 'fraca'
    WHEN v_dias <= 14 THEN 'oscillando'
    WHEN v_dias <= 20 THEN 'quase_apagada'
    ELSE 'apagada'
  END;
END;
$$;
