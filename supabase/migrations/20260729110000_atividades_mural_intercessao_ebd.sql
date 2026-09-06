-- Central de Atividades: produtores reais para Mural, intercessões e EBD.
-- Comentários e curtidas não são criados aqui porque o projeto atual ainda
-- não possui tabelas/fluxos reais para esses recursos.

CREATE INDEX IF NOT EXISTS app_notificacoes_usuario_nao_lida_idx
  ON public.app_notificacoes (usuario_id, criada_em DESC)
  WHERE lida = false;

-- 1) Quando alguém passa a interceder por um pedido, avisa o autor do pedido.
CREATE OR REPLACE FUNCTION public.notificar_intercessao_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_autor_id uuid;
  v_intercessor_nome text;
  v_pedido_texto text;
  v_evento_chave text;
BEGIN
  SELECT p.autor_id, p.texto
    INTO v_autor_id, v_pedido_texto
  FROM public.pedidos p
  WHERE p.id = NEW.pedido_id;

  IF v_autor_id IS NULL OR v_autor_id = NEW.usuario_id THEN
    RETURN NEW;
  END IF;

  SELECT u.nome
    INTO v_intercessor_nome
  FROM public.usuarios u
  WHERE u.id = NEW.usuario_id;

  v_evento_chave :=
    'intercessao:' || NEW.pedido_id::text || ':' || NEW.usuario_id::text || ':' ||
    coalesce(NEW.criado_em::text, clock_timestamp()::text);

  INSERT INTO public.app_notificacoes (
    usuario_id,
    tipo,
    titulo,
    corpo,
    url,
    dados,
    evento_chave
  )
  VALUES (
    v_autor_id,
    'intercessao_pedido',
    'Nova intercessão',
    coalesce(v_intercessor_nome, 'Alguém') || ' está intercedendo pelo seu pedido.',
    '/mural?pedido=' || NEW.pedido_id::text,
    jsonb_build_object(
      'pedido_id', NEW.pedido_id,
      'autor_id', v_autor_id,
      'intercessor_id', NEW.usuario_id,
      'intercessor_nome', v_intercessor_nome,
      'pedido_resumo', left(coalesce(v_pedido_texto, ''), 160)
    ),
    v_evento_chave
  )
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intercessoes_criar_atividade ON public.intercessoes;
CREATE TRIGGER intercessoes_criar_atividade
AFTER INSERT ON public.intercessoes
FOR EACH ROW
EXECUTE FUNCTION public.notificar_intercessao_pedido();

REVOKE ALL ON FUNCTION public.notificar_intercessao_pedido() FROM PUBLIC;

-- 2) Quando um pedido/testemunho entra no mural, avisa os demais usuários.
CREATE OR REPLACE FUNCTION public.notificar_nova_publicacao_mural()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_autor_nome text;
  v_titulo text;
  v_corpo text;
  v_evento_chave text := 'mural:pedido:' || NEW.id::text;
BEGIN
  SELECT u.nome
    INTO v_autor_nome
  FROM public.usuarios u
  WHERE u.id = NEW.autor_id;

  v_titulo := CASE
    WHEN NEW.tipo = 'testemunho' THEN 'Novo testemunho no mural'
    ELSE 'Novo pedido de oração'
  END;

  v_corpo :=
    coalesce(v_autor_nome, 'Alguém') ||
    CASE
      WHEN NEW.tipo = 'testemunho' THEN ' compartilhou um testemunho: '
      ELSE ' publicou um pedido: '
    END ||
    left(coalesce(NEW.texto, ''), 140);

  INSERT INTO public.app_notificacoes (
    usuario_id,
    tipo,
    titulo,
    corpo,
    url,
    dados,
    evento_chave
  )
  SELECT
    u.id,
    'nova_publicacao_mural',
    v_titulo,
    v_corpo,
    '/mural?pedido=' || NEW.id::text,
    jsonb_build_object(
      'pedido_id', NEW.id,
      'autor_id', NEW.autor_id,
      'autor_nome', v_autor_nome,
      'tipo_publicacao', NEW.tipo
    ),
    v_evento_chave
  FROM public.usuarios u
  WHERE u.id <> NEW.autor_id
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_criar_atividade_mural ON public.pedidos;
CREATE TRIGGER pedidos_criar_atividade_mural
AFTER INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.notificar_nova_publicacao_mural();

REVOKE ALL ON FUNCTION public.notificar_nova_publicacao_mural() FROM PUBLIC;

-- 3) Lição criada no módulo EBD clássico.
CREATE OR REPLACE FUNCTION public.notificar_nova_licao_ebd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evento_chave text := 'ebd:licao:' || NEW.id::text;
BEGIN
  INSERT INTO public.app_notificacoes (
    usuario_id,
    tipo,
    titulo,
    corpo,
    url,
    dados,
    evento_chave
  )
  SELECT
    u.id,
    'nova_licao',
    'Nova lição da EBD',
    'A lição “' || coalesce(NEW.titulo, 'Nova lição') || '” já está disponível.',
    '/ebd?licao=' || NEW.id::text,
    jsonb_build_object(
      'licao_id', NEW.id,
      'titulo', NEW.titulo,
      'ordem', NEW.ordem,
      'origem', 'licoes'
    ),
    v_evento_chave
  FROM public.usuarios u
  WHERE true
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS licoes_criar_atividade ON public.licoes;
CREATE TRIGGER licoes_criar_atividade
AFTER INSERT ON public.licoes
FOR EACH ROW
EXECUTE FUNCTION public.notificar_nova_licao_ebd();

REVOKE ALL ON FUNCTION public.notificar_nova_licao_ebd() FROM PUBLIC;

-- 4) Lição publicada pelo EBD Studio/editorial.
CREATE OR REPLACE FUNCTION public.notificar_publicacao_ebd_editorial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evento_chave text;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  v_evento_chave :=
    'ebd:editorial:' || NEW.id::text || ':v' || coalesce(NEW.versao, 1)::text;

  INSERT INTO public.app_notificacoes (
    usuario_id,
    tipo,
    titulo,
    corpo,
    url,
    dados,
    evento_chave
  )
  SELECT
    u.id,
    'nova_licao',
    'Nova lição publicada',
    'Lição ' || NEW.numero::text || ': ' || coalesce(NEW.titulo, 'Nova lição'),
    '/ebd?editorial=' || NEW.id::text,
    jsonb_build_object(
      'licao_id', NEW.id,
      'editorial_licao_id', NEW.id,
      'numero', NEW.numero,
      'titulo', NEW.titulo,
      'versao', NEW.versao,
      'origem', 'ebd_editorial_lessons'
    ),
    v_evento_chave
  FROM public.usuarios u
  WHERE true
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ebd_editorial_criar_atividade_insert ON public.ebd_editorial_lessons;
CREATE TRIGGER ebd_editorial_criar_atividade_insert
AFTER INSERT ON public.ebd_editorial_lessons
FOR EACH ROW
EXECUTE FUNCTION public.notificar_publicacao_ebd_editorial();

DROP TRIGGER IF EXISTS ebd_editorial_criar_atividade_update ON public.ebd_editorial_lessons;
CREATE TRIGGER ebd_editorial_criar_atividade_update
AFTER UPDATE OF status ON public.ebd_editorial_lessons
FOR EACH ROW
EXECUTE FUNCTION public.notificar_publicacao_ebd_editorial();

REVOKE ALL ON FUNCTION public.notificar_publicacao_ebd_editorial() FROM PUBLIC;
