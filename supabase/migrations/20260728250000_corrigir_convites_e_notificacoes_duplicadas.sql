-- Corrige dois problemas observados em teste real:
-- 1. o remetente do convite não era encaminhado junto com quem aceitava;
-- 2. o mesmo evento podia gerar/exibir notificações duplicadas.

ALTER TABLE public.app_notificacoes
  ADD COLUMN IF NOT EXISTS evento_chave text;

COMMENT ON COLUMN public.app_notificacoes.evento_chave IS
  'Chave idempotente do evento que originou a notificacao.';

-- Identifica notificações antigas para que duplicatas já existentes possam ser limpas.
UPDATE public.app_notificacoes
SET evento_chave = CASE
  WHEN tipo = 'nova_mensagem' AND dados ? 'mensagem_id'
    THEN 'mensagem:' || (dados->>'mensagem_id')
  WHEN tipo = 'convite_oracao' AND dados ? 'convite_id'
    THEN 'convite:' || (dados->>'convite_id') || ':pendente'
  WHEN tipo IN ('convite_aceito', 'convite_recusado') AND dados ? 'convite_id'
    THEN 'convite:' || (dados->>'convite_id') || ':' || coalesce(dados->>'status', tipo)
  WHEN tipo = 'mao_levantada' AND dados ? 'sessao_id'
    THEN 'mao_levantada:' || (dados->>'sessao_id')
  ELSE evento_chave
END
WHERE evento_chave IS NULL;

WITH duplicadas AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY usuario_id, evento_chave
      ORDER BY criada_em, id
    ) AS ordem
  FROM public.app_notificacoes
  WHERE evento_chave IS NOT NULL
)
DELETE FROM public.app_notificacoes notificacao
USING duplicadas
WHERE notificacao.id = duplicadas.id
  AND duplicadas.ordem > 1;

CREATE UNIQUE INDEX IF NOT EXISTS app_notificacoes_usuario_evento_uidx
  ON public.app_notificacoes(usuario_id, evento_chave)
  WHERE evento_chave IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notificar_nova_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_remetente_nome text;
  v_evento_chave text := 'mensagem:' || NEW.id::text;
BEGIN
  SELECT u.nome INTO v_remetente_nome
  FROM public.usuarios u
  WHERE u.id = NEW.remetente_id;

  INSERT INTO public.app_notificacoes (
    usuario_id, tipo, titulo, corpo, url, dados, evento_chave
  )
  VALUES (
    NEW.destinatario_id,
    'nova_mensagem',
    'Nova mensagem',
    coalesce(v_remetente_nome, 'Alguém') || ': ' || left(NEW.texto, 120),
    '/chat/' || NEW.remetente_id::text,
    jsonb_build_object(
      'mensagem_id', NEW.id,
      'remetente_id', NEW.remetente_id,
      'tipo', 'nova_mensagem'
    ),
    v_evento_chave
  )
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_convite_oracao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_remetente_nome text;
  v_destinatario_nome text;
  v_evento_chave text;
BEGIN
  SELECT u.nome INTO v_remetente_nome
  FROM public.usuarios u
  WHERE u.id = NEW.remetente_id;

  IF TG_OP = 'INSERT' THEN
    v_evento_chave := 'convite:' || NEW.id::text || ':pendente';

    INSERT INTO public.app_notificacoes (
      usuario_id, tipo, titulo, corpo, url, dados, evento_chave
    )
    VALUES (
      NEW.destinatario_id,
      'convite_oracao',
      'Convite para orar',
      coalesce(v_remetente_nome, 'Alguém') || ' te chamou para orar.',
      '/',
      jsonb_build_object(
        'convite_id', NEW.id,
        'remetente_id', NEW.remetente_id,
        'tipo_conexao', NEW.tipo_conexao_remetente,
        'tipo', 'convite_oracao'
      ),
      v_evento_chave
    )
    ON CONFLICT (usuario_id, evento_chave)
      WHERE evento_chave IS NOT NULL
      DO NOTHING;

    RETURN NEW;
  END IF;

  IF OLD.status = 'pendente' AND NEW.status IN ('aceito', 'recusado') THEN
    SELECT u.nome INTO v_destinatario_nome
    FROM public.usuarios u
    WHERE u.id = NEW.destinatario_id;

    v_evento_chave := 'convite:' || NEW.id::text || ':' || NEW.status;

    INSERT INTO public.app_notificacoes (
      usuario_id, tipo, titulo, corpo, url, dados, evento_chave
    )
    VALUES (
      NEW.remetente_id,
      CASE WHEN NEW.status = 'aceito' THEN 'convite_aceito' ELSE 'convite_recusado' END,
      CASE WHEN NEW.status = 'aceito' THEN 'Convite aceito' ELSE 'Convite recusado' END,
      coalesce(v_destinatario_nome, 'A pessoa convidada') ||
        CASE WHEN NEW.status = 'aceito' THEN ' aceitou orar com você.' ELSE ' não poderá orar agora.' END,
      CASE
        WHEN NEW.status = 'aceito' AND NEW.sala_id IS NOT NULL
          THEN '/sala/' || NEW.sala_id::text
        WHEN NEW.status = 'aceito'
          THEN '/timer/' || NEW.id::text
        ELSE '/'
      END,
      jsonb_build_object(
        'convite_id', NEW.id,
        'destinatario_id', NEW.destinatario_id,
        'status', NEW.status,
        'sala_id', NEW.sala_id,
        'tipo', CASE WHEN NEW.status = 'aceito' THEN 'convite_aceito' ELSE 'convite_recusado' END
      ),
      v_evento_chave
    )
    ON CONFLICT (usuario_id, evento_chave)
      WHERE evento_chave IS NOT NULL
      DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notificar_mao_levantada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_anfitriao_nome text;
BEGIN
  IF NEW.status <> 'aberta' THEN
    RETURN NEW;
  END IF;

  SELECT u.nome INTO v_anfitriao_nome
  FROM public.usuarios u
  WHERE u.id = NEW.anfitriao_id;

  INSERT INTO public.app_notificacoes (
    usuario_id, tipo, titulo, corpo, url, dados, evento_chave
  )
  SELECT
    u.id,
    'mao_levantada',
    'Mão levantada para oração',
    coalesce(v_anfitriao_nome, 'Alguém') || ' está disponível para orar agora.',
    '/?orar_com=' || NEW.id::text,
    jsonb_build_object(
      'sessao_id', NEW.id,
      'anfitriao_id', NEW.anfitriao_id,
      'tipo', 'mao_levantada'
    ),
    'mao_levantada:' || NEW.id::text
  FROM public.usuarios u
  WHERE u.id <> NEW.anfitriao_id
    AND u.auth_user_id IS NOT NULL
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_notificar_sorteio_circulo(
  p_usuario_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.usuario_atual_e_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  INSERT INTO public.app_notificacoes (
    usuario_id, tipo, titulo, corpo, url, dados, evento_chave
  )
  SELECT
    u.id,
    'sorteio_circulo',
    'Nova dupla da semana',
    'Sua missão desta semana é orar por ' || parceiro.nome || '.',
    '/',
    jsonb_build_object(
      'parceiro_id', parceiro.id,
      'parceiro_nome', parceiro.nome,
      'tipo', 'sorteio_circulo'
    ),
    'sorteio:' || current_date::text || ':' || parceiro.id::text
  FROM public.usuarios u
  JOIN public.usuarios parceiro ON parceiro.id = u.orando_por_id
  WHERE u.id = ANY(p_usuario_ids)
    AND u.orando_por_id IS NOT NULL
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Publica a aceitação em uma única atualização. Assim, o evento Realtime e a
-- notificação do remetente já recebem o sala_id quando a opção é voz/vídeo.
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
      tipo_sala, status_sala, host_usuario_id, livekit_room_name
    )
    VALUES (
      CASE
        WHEN v_convite.tipo_conexao_remetente = 'video' OR p_tipo_conexao = 'video'
          THEN 'livre'
        ELSE 'circulo_semana'
      END,
      'ativa',
      v_convite.remetente_id,
      'sala_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)
    )
    RETURNING id INTO v_sala_id;
  END IF;

  IF NOT v_usar_sala THEN
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
