-- Migração: Convites de Oração + Timer Sincronizado
-- Cria suporte para o fluxo de convite → aceite (silêncio/voz/vídeo) → timer

-- ============================================================
-- Tabela: convites_oracao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.convites_oracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aceito', 'recusado', 'expirado')),
  tipo_conexao_remetente TEXT CHECK (tipo_conexao_remetente IN ('aceite', 'voz', 'video')),
  tipo_conexao_destinatario TEXT CHECK (tipo_conexao_destinatario IN ('aceite', 'voz', 'video')),
  sala_id UUID REFERENCES public.salas_oracao(id) ON DELETE SET NULL,
  iniciado_em TIMESTAMPTZ,
  finalizado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_convites_destinatario_pendente
  ON public.convites_oracao(destinatario_id, status)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_convites_remetente
  ON public.convites_oracao(remetente_id);

-- ============================================================
-- Tabela: sessoes_oracao_timer (para o modo "aceite" - silêncio)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessoes_oracao_timer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id UUID NOT NULL REFERENCES public.convites_oracao(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status_presenca TEXT NOT NULL DEFAULT 'orando'
    CHECK (status_presenca IN ('orando', 'finalizou', 'ausente')),
  entrou_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  saiu_em TIMESTAMPTZ,
  UNIQUE(convite_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_sessoes_timer_convite
  ON public.sessoes_oracao_timer(convite_id);

-- ============================================================
-- RPC: enviar_convite_oracao
-- ============================================================
CREATE OR REPLACE FUNCTION public.enviar_convite_oracao(
  p_destinatario_id UUID,
  p_tipo_conexao TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remetente_id UUID;
  v_convite_id UUID;
BEGIN
  -- Obtém o ID do usuário logado
  SELECT id INTO v_remetente_id
  FROM public.usuarios
  WHERE auth_user_id = auth.uid();

  IF v_remetente_id IS NULL THEN
    RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO';
  END IF;

  -- Garante que não há convite pendente entre os mesmos dois
  IF EXISTS (
    SELECT 1 FROM public.convites_oracao
    WHERE remetente_id IN (v_remetente_id, p_destinatario_id)
      AND destinatario_id IN (v_remetente_id, p_destinatario_id)
      AND status = 'pendente'
  ) THEN
    RAISE EXCEPTION 'CONVITE_PENDENTE_EXISTENTE';
  END IF;

  -- Garante que o remetente não tem sala ativa
  IF EXISTS (
    SELECT 1 FROM public.salas_oracao so
    JOIN public.salas_oracao_participantes sop ON sop.sala_id = so.id
    WHERE sop.usuario_id = v_remetente_id
      AND so.status_sala = 'ativa'
  ) THEN
    RAISE EXCEPTION 'REMETENTE_EM_SALA_ATIVA';
  END IF;

  INSERT INTO public.convites_oracao (remetente_id, destinatario_id, tipo_conexao_remetente)
  VALUES (v_remetente_id, p_destinatario_id, p_tipo_conexao)
  RETURNING id INTO v_convite_id;

  RETURN v_convite_id;
END;
$$;

-- ============================================================
-- RPC: responder_convite_oracao
-- ============================================================
CREATE OR REPLACE FUNCTION public.responder_convite_oracao(
  p_convite_id UUID,
  p_resposta TEXT,  -- 'aceito' ou 'recusado'
  p_tipo_conexao TEXT DEFAULT 'aceite'  -- 'aceite', 'voz', 'video'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite RECORD;
  v_sala_id UUID;
  v_resultado JSONB;
BEGIN
  SELECT * INTO v_convite
  FROM public.convites_oracao
  WHERE id = p_convite_id
  FOR UPDATE;

  IF v_convite.id IS NULL THEN
    RAISE EXCEPTION 'CONVITE_NAO_ENCONTRADO';
  END IF;

  IF v_convite.status != 'pendente' THEN
    RAISE EXCEPTION 'CONVITE_JA_RESPONDIDO';
  END IF;

  -- Verifica se o destinatário é o usuário logado
  IF v_convite.destinatario_id != (
    SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'NAO_AUTORIZADO';
  END IF;

  IF p_resposta = 'recusado' THEN
    UPDATE public.convites_oracao
    SET status = 'recusado'
    WHERE id = p_convite_id;
    RETURN jsonb_build_object('status', 'recusado');
  END IF;

  -- Resposta = aceito
  UPDATE public.convites_oracao
  SET status = 'aceito',
      tipo_conexao_destinatario = p_tipo_conexao,
      iniciado_em = now()
  WHERE id = p_convite_id;

  INSERT INTO public.sessoes_oracao_timer (convite_id, usuario_id)
  VALUES (p_convite_id, v_convite.remetente_id);

  INSERT INTO public.sessoes_oracao_timer (convite_id, usuario_id)
  VALUES (p_convite_id, v_convite.destinatario_id);

  -- Se ambos escolheram voz ou vídeo, cria sala LiveKit
  IF (v_convite.tipo_conexao_remetente IN ('voz', 'video')
      AND p_tipo_conexao IN ('voz', 'video')) THEN

    INSERT INTO public.salas_oracao (tipo_sala, status_sala, host_usuario_id, livekit_room_name)
    VALUES (
      CASE WHEN v_convite.tipo_conexao_remetente = 'video' OR p_tipo_conexao = 'video'
        THEN 'livre' ELSE 'circulo_semana' END,
      'ativa',
      v_convite.remetente_id,
      'sala_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)
    )
    RETURNING id INTO v_sala_id;

    UPDATE public.convites_oracao
    SET sala_id = v_sala_id
    WHERE id = p_convite_id;
  END IF;

  v_resultado := jsonb_build_object(
    'status', 'aceito',
    'sala_id', v_sala_id,
    'conexao_final',
    CASE
      WHEN (v_convite.tipo_conexao_remetente IN ('voz', 'video')
            AND p_tipo_conexao IN ('voz', 'video'))
      THEN 'voz_video'
      ELSE 'aceite'
    END
  );

  RETURN v_resultado;
END;
$$;

-- ============================================================
-- RPC: finalizar_sessao_timer
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalizar_sessao_timer(
  p_convite_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_convite RECORD;
  v_duracao_segundos INTEGER;
  v_resultado JSONB;
BEGIN
  SELECT id INTO v_usuario_id
  FROM public.usuarios
  WHERE auth_user_id = auth.uid();

  -- Marca como finalizado
  UPDATE public.sessoes_oracao_timer
  SET status_presenca = 'finalizou', saiu_em = now()
  WHERE convite_id = p_convite_id AND usuario_id = v_usuario_id;

  -- Verifica se ambos finalizaram
  SELECT * INTO v_convite FROM public.convites_oracao WHERE id = p_convite_id;

  IF EXISTS (
    SELECT 1 FROM public.sessoes_oracao_timer
    WHERE convite_id = p_convite_id AND status_presenca = 'finalizou'
    HAVING COUNT(*) = 2
  ) THEN
    UPDATE public.convites_oracao
    SET status = 'finalizado', finalizado_em = now()
    WHERE id = p_convite_id;

    v_duracao_segundos := EXTRACT(EPOCH FROM (now() - v_convite.iniciado_em))::INTEGER;

    RETURN jsonb_build_object(
      'status', 'finalizado',
      'duracao_segundos', v_duracao_segundos,
      'tipo_conexao', v_convite.tipo_conexao_remetente
    );
  END IF;

  RETURN jsonb_build_object('status', 'aguardando_parceiro');
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.convites_oracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_oracao_timer ENABLE ROW LEVEL SECURITY;

-- Convites: remetente ou destinatário podem ver
CREATE POLICY convites_select ON public.convites_oracao
  FOR SELECT USING (
    remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY convites_insert ON public.convites_oracao
  FOR INSERT WITH CHECK (
    remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY convites_update ON public.convites_oracao
  FOR UPDATE USING (
    destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- Timer: só quem participa vê
CREATE POLICY timer_select ON public.sessoes_oracao_timer
  FOR SELECT USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY timer_insert ON public.sessoes_oracao_timer
  FOR INSERT WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY timer_update ON public.sessoes_oracao_timer
  FOR UPDATE USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- Tabela: mensagens (chat de texto)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON public.mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON public.mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_par ON public.mensagens(
  LEAST(remetente_id, destinatario_id),
  GREATEST(remetente_id, destinatario_id)
);

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY mensagens_select ON public.mensagens
  FOR SELECT USING (
    remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY mensagens_insert ON public.mensagens
  FOR INSERT WITH CHECK (
    remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY mensagens_update ON public.mensagens
  FOR UPDATE USING (
    destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );
