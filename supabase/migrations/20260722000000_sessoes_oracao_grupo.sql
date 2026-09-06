-- Migration: sessoes_oracao_grupo (Oração em Grupo - Mão Levantada)
-- Cria tabelas, RPCs, RLS e adiciona ao realtime

-- 1. Tabela principal
CREATE TABLE IF NOT EXISTS sessoes_oracao_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anfitriao_id UUID NOT NULL REFERENCES usuarios(id),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'encerrada')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  encerrada_em TIMESTAMPTZ
);

-- 2. Tabela de participantes
CREATE TABLE IF NOT EXISTS sessoes_oracao_grupo_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES sessoes_oracao_grupo(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  entrou_em TIMESTAMPTZ DEFAULT now(),
  saiu_em TIMESTAMPTZ,
  UNIQUE(sessao_id, usuario_id)
);

-- 3. RLS
ALTER TABLE sessoes_oracao_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_oracao_grupo_participantes ENABLE ROW LEVEL SECURITY;

-- Sessões: qualquer um vê abertas, anfitrião vê as próprias
CREATE POLICY "sessoes_grupo_select" ON sessoes_oracao_grupo
  FOR SELECT USING (
    status = 'aberta' OR
    anfitriao_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "sessoes_grupo_insert" ON sessoes_oracao_grupo
  FOR INSERT WITH CHECK (
    anfitriao_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "sessoes_grupo_update" ON sessoes_oracao_grupo
  FOR UPDATE USING (
    anfitriao_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- Participantes: visíveis para quem vê a sessão
CREATE POLICY "participantes_select" ON sessoes_oracao_grupo_participantes
  FOR SELECT USING (
    sessao_id IN (
      SELECT id FROM sessoes_oracao_grupo WHERE status = 'aberta'
    ) OR
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "participantes_insert" ON sessoes_oracao_grupo_participantes
  FOR INSERT WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "participantes_update" ON sessoes_oracao_grupo_participantes
  FOR UPDATE USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- 4. RPCs (SECURITY DEFINER)
-- Abrir sessão
CREATE OR REPLACE FUNCTION abrir_sessao_grupo()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_sessao_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM usuarios WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO'; END IF;

  IF EXISTS (SELECT 1 FROM sessoes_oracao_grupo WHERE anfitriao_id = v_user_id AND status = 'aberta') THEN
    RAISE EXCEPTION 'SESSAO_JA_ABERTA';
  END IF;

  INSERT INTO sessoes_oracao_grupo (anfitriao_id, status)
  VALUES (v_user_id, 'aberta')
  RETURNING id INTO v_sessao_id;

  INSERT INTO sessoes_oracao_grupo_participantes (sessao_id, usuario_id)
  VALUES (v_sessao_id, v_user_id);

  RETURN json_build_object('id', v_sessao_id, 'status', 'aberta', 'anfitriao_id', v_user_id);
END;
$$;

-- Entrar na sessão
CREATE OR REPLACE FUNCTION entrar_sessao_grupo(p_sessao_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_anfitriao_id uuid;
  v_status text;
BEGIN
  SELECT id INTO v_user_id FROM usuarios WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO'; END IF;

  SELECT anfitriao_id, status INTO v_anfitriao_id, v_status
  FROM sessoes_oracao_grupo WHERE id = p_sessao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSAO_NAO_ENCONTRADA'; END IF;
  IF v_status = 'encerrada' THEN RAISE EXCEPTION 'SESSAO_ENCERRADA'; END IF;

  INSERT INTO sessoes_oracao_grupo_participantes (sessao_id, usuario_id)
  VALUES (p_sessao_id, v_user_id)
  ON CONFLICT (sessao_id, usuario_id)
  DO UPDATE SET saiu_em = NULL, entrou_em = now()
  WHERE sessoes_oracao_grupo_participantes.saiu_em IS NOT NULL;

  RETURN json_build_object('id', p_sessao_id, 'status', v_status, 'anfitriao_id', v_anfitriao_id);
END;
$$;

-- Sair da sessão (transfere anfitrião se necessário)
-- Se a sessão já estiver encerrada, só retorna sucesso (não levanta erro)
CREATE OR REPLACE FUNCTION sair_sessao_grupo(p_sessao_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_anfitriao_id uuid;
  v_proximo_id uuid;
  v_status text;
BEGIN
  SELECT id INTO v_user_id FROM usuarios WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO'; END IF;

  SELECT anfitriao_id, status INTO v_anfitriao_id, v_status
  FROM sessoes_oracao_grupo WHERE id = p_sessao_id;
  IF NOT FOUND THEN RETURN json_build_object('success', true); END IF;
  IF v_status = 'encerrada' THEN RETURN json_build_object('success', true); END IF;

  UPDATE sessoes_oracao_grupo_participantes
  SET saiu_em = now()
  WHERE sessao_id = p_sessao_id AND usuario_id = v_user_id AND saiu_em IS NULL;

  -- Se quem saiu é o anfitrião, transfere para o próximo na ordem de entrada
  IF v_user_id = v_anfitriao_id THEN
    SELECT p.usuario_id INTO v_proximo_id
    FROM sessoes_oracao_grupo_participantes p
    WHERE p.sessao_id = p_sessao_id AND p.saiu_em IS NULL AND p.usuario_id != v_user_id
    ORDER BY p.entrou_em ASC
    LIMIT 1;

    IF v_proximo_id IS NOT NULL THEN
      UPDATE sessoes_oracao_grupo
      SET anfitriao_id = v_proximo_id
      WHERE id = p_sessao_id;
    ELSE
      -- Ninguém mais na sala, encerra
      UPDATE sessoes_oracao_grupo
      SET status = 'encerrada', encerrada_em = now()
      WHERE id = p_sessao_id;
    END IF;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Finalizar sessão (só anfitrião)
-- Não marca saiu_em dos participantes — evita eventos falsos de "saiu" pelo Realtime
CREATE OR REPLACE FUNCTION finalizar_sessao_grupo(p_sessao_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_anfitriao_id uuid;
  v_status text;
BEGIN
  SELECT id INTO v_user_id FROM usuarios WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO'; END IF;

  SELECT anfitriao_id, status INTO v_anfitriao_id, v_status
  FROM sessoes_oracao_grupo WHERE id = p_sessao_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'SESSAO_NAO_ENCONTRADA'; END IF;
  IF v_status = 'encerrada' THEN RAISE EXCEPTION 'SESSAO_JA_ENCERRADA'; END IF;
  IF v_anfitriao_id != v_user_id THEN RAISE EXCEPTION 'APENAS_ANFITRIAO'; END IF;

  UPDATE sessoes_oracao_grupo
  SET status = 'encerrada', encerrada_em = now()
  WHERE id = p_sessao_id;

  RETURN json_build_object('id', p_sessao_id, 'status', 'encerrada');
END;
$$;

-- Listar sessões abertas (para MocidadeGrid)
CREATE OR REPLACE FUNCTION listar_sessoes_grupo_abertas()
RETURNS TABLE(sessao_id uuid, anfitriao_id uuid, anfitriao_nome text, anfitriao_foto text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sg.id, sg.anfitriao_id, u.nome, u.foto_url
  FROM sessoes_oracao_grupo sg
  JOIN usuarios u ON u.id = sg.anfitriao_id
  WHERE sg.status = 'aberta'
  ORDER BY sg.criado_em DESC;
END;
$$;

-- 5. REPLICA IDENTITY (para Realtime enviar dados completos)
ALTER TABLE sessoes_oracao_grupo REPLICA IDENTITY FULL;
ALTER TABLE sessoes_oracao_grupo_participantes REPLICA IDENTITY FULL;

-- 6. Adicionar ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessoes_oracao_grupo;
ALTER PUBLICATION supabase_realtime ADD TABLE sessoes_oracao_grupo_participantes;
