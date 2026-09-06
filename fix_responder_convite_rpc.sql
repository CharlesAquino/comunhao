-- ============================================================
-- Fix: RPC responder_convite_oracao — livekit_room_name
-- Problema: gen_random_uuid()::text retornava NULL no contexto
-- Solução: usar md5+random+clock_timestamp como fallback seguro
-- ============================================================

CREATE OR REPLACE FUNCTION public.responder_convite_oracao(
  p_convite_id UUID,
  p_resposta TEXT,
  p_tipo_conexao TEXT DEFAULT 'aceite'
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
