-- Corrige o acesso ponta a ponta às salas LiveKit e adiciona feedback explícito
-- quando alguém aceita uma mão levantada.

-- 1) Garante que as duas pessoas do convite sejam participantes da sala criada.
CREATE OR REPLACE FUNCTION public.responder_convite_oracao(
  p_convite_id uuid,
  p_resposta text,
  p_tipo_conexao text DEFAULT 'aceite'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_convite public.convites_oracao%ROWTYPE;
  v_usuario_id uuid;
  v_sala_id uuid;
  v_usar_sala boolean;
BEGIN
  SELECT u.id INTO v_usuario_id
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid();

  SELECT * INTO v_convite
  FROM public.convites_oracao
  WHERE id = p_convite_id
  FOR UPDATE;

  IF v_convite.id IS NULL THEN
    RAISE EXCEPTION 'CONVITE_NAO_ENCONTRADO';
  END IF;

  IF v_convite.status <> 'pendente' THEN
    RAISE EXCEPTION 'CONVITE_JA_RESPONDIDO';
  END IF;

  IF v_convite.destinatario_id <> v_usuario_id THEN
    RAISE EXCEPTION 'NAO_AUTORIZADO';
  END IF;

  IF p_resposta = 'recusado' THEN
    UPDATE public.convites_oracao
    SET status = 'recusado'
    WHERE id = p_convite_id;

    RETURN jsonb_build_object('status', 'recusado');
  END IF;

  IF p_resposta <> 'aceito' THEN
    RAISE EXCEPTION 'RESPOSTA_INVALIDA';
  END IF;

  IF p_tipo_conexao NOT IN ('aceite', 'voz', 'video') THEN
    RAISE EXCEPTION 'TIPO_CONEXAO_INVALIDO';
  END IF;

  v_usar_sala := v_convite.tipo_conexao_remetente IN ('voz', 'video')
    AND p_tipo_conexao IN ('voz', 'video');

  IF v_usar_sala THEN
    INSERT INTO public.salas_oracao (
      tipo_sala, status_sala, host_usuario_id, livekit_room_name, iniciada_em
    )
    VALUES (
      CASE
        WHEN v_convite.tipo_conexao_remetente = 'video' OR p_tipo_conexao = 'video'
          THEN 'livre'
        ELSE 'circulo_semana'
      END,
      'ativa',
      v_convite.remetente_id,
      'sala_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
      now()
    )
    RETURNING id INTO v_sala_id;

    INSERT INTO public.salas_oracao_participantes (sala_id, usuario_id)
    VALUES
      (v_sala_id, v_convite.remetente_id),
      (v_sala_id, v_convite.destinatario_id)
    ON CONFLICT (sala_id, usuario_id)
    DO UPDATE SET desconectado_em = NULL;
  ELSE
    INSERT INTO public.sessoes_oracao_timer (convite_id, usuario_id)
    VALUES
      (p_convite_id, v_convite.remetente_id),
      (p_convite_id, v_convite.destinatario_id)
    ON CONFLICT (convite_id, usuario_id) DO NOTHING;
  END IF;

  UPDATE public.convites_oracao
  SET
    status = 'aceito',
    tipo_conexao_destinatario = p_tipo_conexao,
    iniciado_em = now(),
    sala_id = v_sala_id
  WHERE id = p_convite_id;

  RETURN jsonb_build_object(
    'status', 'aceito',
    'sala_id', v_sala_id,
    'conexao_final', CASE WHEN v_usar_sala THEN 'voz_video' ELSE 'aceite' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.responder_convite_oracao(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_convite_oracao(uuid, text, text) TO authenticated;

-- Corrige salas já aceitas antes desta migration.
INSERT INTO public.salas_oracao_participantes (sala_id, usuario_id)
SELECT convite.sala_id, participante.usuario_id
FROM public.convites_oracao convite
CROSS JOIN LATERAL (
  VALUES (convite.remetente_id), (convite.destinatario_id)
) AS participante(usuario_id)
WHERE convite.status = 'aceito'
  AND convite.sala_id IS NOT NULL
ON CONFLICT (sala_id, usuario_id)
DO UPDATE SET desconectado_em = NULL;

-- 2) Corrige as políticas para o modelo atual de identidade (usuarios.id != auth.uid()).
DROP POLICY IF EXISTS "usuarios_veem_salas_que_participam" ON public.salas_oracao;
DROP POLICY IF EXISTS "usuarios_veem_salas_aguardando" ON public.salas_oracao;
DROP POLICY IF EXISTS "salas_oracao_select_participante" ON public.salas_oracao;

CREATE POLICY "salas_oracao_select_participante"
  ON public.salas_oracao
  FOR SELECT TO authenticated
  USING (
    host_usuario_id = public.usuario_atual_id()
    OR EXISTS (
      SELECT 1
      FROM public.salas_oracao_participantes participante
      WHERE participante.sala_id = salas_oracao.id
        AND participante.usuario_id = public.usuario_atual_id()
        AND participante.desconectado_em IS NULL
    )
  );

DROP POLICY IF EXISTS "usuarios_veem_proprias_participacoes" ON public.salas_oracao_participantes;
DROP POLICY IF EXISTS "salas_participantes_select_proprio" ON public.salas_oracao_participantes;

CREATE POLICY "salas_participantes_select_proprio"
  ON public.salas_oracao_participantes
  FOR SELECT TO authenticated
  USING (usuario_id = public.usuario_atual_id());

-- 3) Cria feedback persistente para anfitrião e pessoa que aceitou a mão levantada.
CREATE OR REPLACE FUNCTION public.notificar_aceite_mao_levantada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_anfitriao_nome text;
  v_aceitante_nome text;
BEGIN
  IF OLD.aceito_por_id IS NOT NULL OR NEW.aceito_por_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_anfitriao_nome
  FROM public.usuarios
  WHERE id = NEW.anfitriao_id;

  SELECT nome INTO v_aceitante_nome
  FROM public.usuarios
  WHERE id = NEW.aceito_por_id;

  INSERT INTO public.app_notificacoes (
    usuario_id, tipo, titulo, corpo, url, dados, evento_chave
  )
  VALUES
  (
    NEW.anfitriao_id,
    'mao_aceita',
    'Aceitou orar com você',
    coalesce(v_aceitante_nome, 'Alguém') || ' aceitou orar com você.',
    '/',
    jsonb_build_object(
      'sessao_id', NEW.id,
      'parceiro_id', NEW.aceito_por_id,
      'parceiro_nome', v_aceitante_nome,
      'tipo', 'mao_aceita'
    ),
    'mao_aceita:' || NEW.id::text || ':' || NEW.anfitriao_id::text
  ),
  (
    NEW.aceito_por_id,
    'orando_com',
    'Orando com você',
    'Você aceitou orar com ' || coalesce(v_anfitriao_nome, 'essa pessoa') || '.',
    '/',
    jsonb_build_object(
      'sessao_id', NEW.id,
      'parceiro_id', NEW.anfitriao_id,
      'parceiro_nome', v_anfitriao_nome,
      'tipo', 'orando_com'
    ),
    'orando_com:' || NEW.id::text || ':' || NEW.aceito_por_id::text
  )
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessao_grupo_notificar_aceite ON public.sessoes_oracao_grupo;
CREATE TRIGGER sessao_grupo_notificar_aceite
AFTER UPDATE OF aceito_por_id ON public.sessoes_oracao_grupo
FOR EACH ROW
EXECUTE FUNCTION public.notificar_aceite_mao_levantada();

REVOKE ALL ON FUNCTION public.notificar_aceite_mao_levantada() FROM PUBLIC;
