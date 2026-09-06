-- Notificações internas para mensagens, convites de oração e mão levantada.
-- Os registros são entregues ao cliente pelo Realtime configurado na migration anterior.

CREATE OR REPLACE FUNCTION public.notificar_nova_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_remetente_nome text;
BEGIN
  SELECT u.nome INTO v_remetente_nome
  FROM public.usuarios u
  WHERE u.id = NEW.remetente_id;

  INSERT INTO public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
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
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mensagens_criar_notificacao ON public.mensagens;
CREATE TRIGGER mensagens_criar_notificacao
AFTER INSERT ON public.mensagens
FOR EACH ROW
EXECUTE FUNCTION public.notificar_nova_mensagem();

CREATE OR REPLACE FUNCTION public.notificar_convite_oracao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_remetente_nome text;
  v_destinatario_nome text;
BEGIN
  SELECT u.nome INTO v_remetente_nome
  FROM public.usuarios u
  WHERE u.id = NEW.remetente_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
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
      )
    );
    RETURN NEW;
  END IF;

  IF OLD.status = 'pendente' AND NEW.status IN ('aceito', 'recusado') THEN
    SELECT u.nome INTO v_destinatario_nome
    FROM public.usuarios u
    WHERE u.id = NEW.destinatario_id;

    INSERT INTO public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
    VALUES (
      NEW.remetente_id,
      CASE WHEN NEW.status = 'aceito' THEN 'convite_aceito' ELSE 'convite_recusado' END,
      CASE WHEN NEW.status = 'aceito' THEN 'Convite aceito' ELSE 'Convite recusado' END,
      coalesce(v_destinatario_nome, 'A pessoa convidada') ||
        CASE WHEN NEW.status = 'aceito' THEN ' aceitou orar com você.' ELSE ' não poderá orar agora.' END,
      CASE
        WHEN NEW.status = 'aceito' AND NEW.sala_id IS NOT NULL THEN '/sala/' || NEW.sala_id::text
        ELSE '/'
      END,
      jsonb_build_object(
        'convite_id', NEW.id,
        'destinatario_id', NEW.destinatario_id,
        'status', NEW.status,
        'sala_id', NEW.sala_id,
        'tipo', CASE WHEN NEW.status = 'aceito' THEN 'convite_aceito' ELSE 'convite_recusado' END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS convites_oracao_criar_notificacao_insert ON public.convites_oracao;
CREATE TRIGGER convites_oracao_criar_notificacao_insert
AFTER INSERT ON public.convites_oracao
FOR EACH ROW
EXECUTE FUNCTION public.notificar_convite_oracao();

DROP TRIGGER IF EXISTS convites_oracao_criar_notificacao_update ON public.convites_oracao;
CREATE TRIGGER convites_oracao_criar_notificacao_update
AFTER UPDATE OF status ON public.convites_oracao
FOR EACH ROW
EXECUTE FUNCTION public.notificar_convite_oracao();

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

  INSERT INTO public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
  SELECT
    u.id,
    'mao_levantada',
    'Mão levantada para oração',
    coalesce(v_anfitriao_nome, 'Alguém') || ' está disponível para orar agora.',
    '/',
    jsonb_build_object(
      'sessao_id', NEW.id,
      'anfitriao_id', NEW.anfitriao_id,
      'tipo', 'mao_levantada'
    )
  FROM public.usuarios u
  WHERE u.id <> NEW.anfitriao_id
    AND u.auth_user_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessao_grupo_criar_notificacao ON public.sessoes_oracao_grupo;
CREATE TRIGGER sessao_grupo_criar_notificacao
AFTER INSERT ON public.sessoes_oracao_grupo
FOR EACH ROW
EXECUTE FUNCTION public.notificar_mao_levantada();

REVOKE ALL ON FUNCTION public.notificar_nova_mensagem() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notificar_convite_oracao() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notificar_mao_levantada() FROM PUBLIC;
