-- Comunhão 1.4.0-dev.1 — Mural Social (ambiente de desenvolvimento)
-- Escopo: tipos de publicação, uma foto por post, comentários, selo via XP,
-- intercessão persistente e prioridade para pedidos sem resposta.

-- 1) Evolução segura da tabela de publicações existente.
DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.pedidos'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.pedidos DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado',
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ultima_atualizacao_em timestamptz,
  ADD COLUMN IF NOT EXISTS permite_comentarios boolean NOT NULL DEFAULT true;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_tipo_social_check
  CHECK (tipo IN ('em_clamor', 'testemunho', 'reflexao', 'gratidao'));

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_status_social_check;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_status_social_check
  CHECK (status IN ('publicado', 'em_oracao', 'acompanhamento', 'testemunho', 'encerrado'));

CREATE INDEX IF NOT EXISTS pedidos_mural_social_idx
  ON public.pedidos (tipo, status, criado_em DESC);

-- 2) Uma mídia por publicação nesta primeira etapa.
CREATE TABLE IF NOT EXISTS public.mural_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacao_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/webp',
  largura integer NOT NULL CHECK (largura > 0 AND largura <= 1440),
  altura integer NOT NULL CHECK (altura > 0 AND altura <= 1800),
  tamanho_bytes integer NOT NULL CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 1200000),
  texto_alternativo text CHECK (char_length(COALESCE(texto_alternativo, '')) <= 240),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mural_midias_uma_por_publicacao UNIQUE (publicacao_id),
  CONSTRAINT mural_midias_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS mural_midias_autor_idx
  ON public.mural_midias (autor_id, criado_em DESC);

ALTER TABLE public.mural_midias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mural_midias_select_autenticado ON public.mural_midias;
DROP POLICY IF EXISTS mural_midias_insert_autor ON public.mural_midias;
DROP POLICY IF EXISTS mural_midias_update_autor_ou_admin ON public.mural_midias;
DROP POLICY IF EXISTS mural_midias_delete_autor_ou_admin ON public.mural_midias;

CREATE POLICY mural_midias_select_autenticado ON public.mural_midias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY mural_midias_insert_autor ON public.mural_midias
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = public.usuario_atual_id()
    AND EXISTS (
      SELECT 1
      FROM public.pedidos p
      WHERE p.id = publicacao_id
        AND p.autor_id = public.usuario_atual_id()
    )
  );

CREATE POLICY mural_midias_update_autor_ou_admin ON public.mural_midias
  FOR UPDATE TO authenticated
  USING (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin())
  WITH CHECK (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

CREATE POLICY mural_midias_delete_autor_ou_admin ON public.mural_midias
  FOR DELETE TO authenticated
  USING (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

-- 3) Comentários reais, limitados a 500 caracteres.
CREATE TABLE IF NOT EXISTS public.mural_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacao_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  comentario_pai_id uuid REFERENCES public.mural_comentarios(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 500),
  criado_em timestamptz NOT NULL DEFAULT now(),
  editado_em timestamptz,
  CONSTRAINT mural_comentarios_sem_auto_resposta CHECK (comentario_pai_id IS NULL OR comentario_pai_id <> id)
);

CREATE INDEX IF NOT EXISTS mural_comentarios_publicacao_idx
  ON public.mural_comentarios (publicacao_id, criado_em ASC);
CREATE INDEX IF NOT EXISTS mural_comentarios_autor_idx
  ON public.mural_comentarios (autor_id, criado_em DESC);

ALTER TABLE public.mural_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mural_comentarios_select_autenticado ON public.mural_comentarios;
DROP POLICY IF EXISTS mural_comentarios_insert_autor ON public.mural_comentarios;
DROP POLICY IF EXISTS mural_comentarios_update_autor_ou_admin ON public.mural_comentarios;
DROP POLICY IF EXISTS mural_comentarios_delete_autor_ou_admin ON public.mural_comentarios;

CREATE POLICY mural_comentarios_select_autenticado ON public.mural_comentarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY mural_comentarios_insert_autor ON public.mural_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = public.usuario_atual_id()
    AND EXISTS (
      SELECT 1
      FROM public.pedidos p
      WHERE p.id = publicacao_id
        AND p.permite_comentarios = true
        AND p.status <> 'encerrado'
    )
  );

CREATE POLICY mural_comentarios_update_autor_ou_admin ON public.mural_comentarios
  FOR UPDATE TO authenticated
  USING (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin())
  WITH CHECK (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

CREATE POLICY mural_comentarios_delete_autor_ou_admin ON public.mural_comentarios
  FOR DELETE TO authenticated
  USING (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

-- Garante que uma resposta pertença à mesma publicação.
CREATE OR REPLACE FUNCTION public.validar_comentario_pai_mural()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_publicacao_pai uuid;
BEGIN
  IF NEW.comentario_pai_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT publicacao_id INTO v_publicacao_pai
  FROM public.mural_comentarios
  WHERE id = NEW.comentario_pai_id;

  IF v_publicacao_pai IS NULL OR v_publicacao_pai <> NEW.publicacao_id THEN
    RAISE EXCEPTION 'COMMENT_PARENT_MUST_BELONG_TO_SAME_PUBLICATION';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mural_comentarios_validar_pai ON public.mural_comentarios;
CREATE TRIGGER mural_comentarios_validar_pai
BEFORE INSERT OR UPDATE OF comentario_pai_id, publicacao_id
ON public.mural_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.validar_comentario_pai_mural();

-- 4) Atualização temporal automática.
CREATE OR REPLACE FUNCTION public.mural_marcar_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_mural_marcar_atualizado ON public.pedidos;
CREATE TRIGGER pedidos_mural_marcar_atualizado
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.mural_marcar_atualizado_em();

CREATE OR REPLACE FUNCTION public.mural_marcar_comentario_editado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.texto IS DISTINCT FROM OLD.texto THEN
    NEW.editado_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mural_comentarios_marcar_editado ON public.mural_comentarios;
CREATE TRIGGER mural_comentarios_marcar_editado
BEFORE UPDATE ON public.mural_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.mural_marcar_comentario_editado();

-- Atualiza o produtor de nova publicação para os quatro tipos sociais.
CREATE OR REPLACE FUNCTION public.notificar_nova_publicacao_mural()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_autor_nome text;
  v_titulo text;
  v_acao text;
  v_evento_chave text := 'mural:pedido:' || NEW.id::text;
BEGIN
  SELECT u.nome
    INTO v_autor_nome
  FROM public.usuarios u
  WHERE u.id = NEW.autor_id;

  v_titulo := CASE NEW.tipo
    WHEN 'testemunho' THEN 'Novo testemunho no mural'
    WHEN 'reflexao' THEN 'Nova reflexão no mural'
    WHEN 'gratidao' THEN 'Nova gratidão no mural'
    ELSE 'Novo pedido de oração'
  END;

  v_acao := CASE NEW.tipo
    WHEN 'testemunho' THEN ' compartilhou um testemunho: '
    WHEN 'reflexao' THEN ' compartilhou uma reflexão: '
    WHEN 'gratidao' THEN ' compartilhou uma gratidão: '
    ELSE ' publicou um pedido: '
  END;

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
    coalesce(v_autor_nome, 'Alguém') || v_acao || left(coalesce(NEW.texto, ''), 140),
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

REVOKE ALL ON FUNCTION public.notificar_nova_publicacao_mural() FROM PUBLIC;

-- 5) Atividade real ao comentar uma publicação.
CREATE OR REPLACE FUNCTION public.notificar_comentario_publicacao_mural()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_autor_publicacao uuid;
  v_autor_comentario_nome text;
  v_evento_chave text := 'mural:comentario:' || NEW.id::text;
BEGIN
  SELECT p.autor_id
    INTO v_autor_publicacao
  FROM public.pedidos p
  WHERE p.id = NEW.publicacao_id;

  IF v_autor_publicacao IS NULL OR v_autor_publicacao = NEW.autor_id THEN
    RETURN NEW;
  END IF;

  SELECT u.nome
    INTO v_autor_comentario_nome
  FROM public.usuarios u
  WHERE u.id = NEW.autor_id;

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
    v_autor_publicacao,
    'comentario_publicacao',
    'Novo comentário no seu pedido',
    coalesce(v_autor_comentario_nome, 'Alguém') || ' comentou: ' || left(NEW.texto, 140),
    '/mural?pedido=' || NEW.publicacao_id::text,
    jsonb_build_object(
      'pedido_id', NEW.publicacao_id,
      'publicacao_id', NEW.publicacao_id,
      'comentario_id', NEW.id,
      'autor_comentario_id', NEW.autor_id,
      'autor_comentario_nome', v_autor_comentario_nome
    ),
    v_evento_chave
  )
  ON CONFLICT (usuario_id, evento_chave)
    WHERE evento_chave IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mural_comentarios_criar_atividade ON public.mural_comentarios;
CREATE TRIGGER mural_comentarios_criar_atividade
AFTER INSERT ON public.mural_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.notificar_comentario_publicacao_mural();

REVOKE ALL ON FUNCTION public.notificar_comentario_publicacao_mural() FROM PUBLIC;

-- 6) Storage privado. As imagens são servidas por URL assinada pelo cliente autenticado.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mural-media',
  'mural-media',
  false,
  1200000,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS mural_media_storage_select ON storage.objects;
DROP POLICY IF EXISTS mural_media_storage_insert ON storage.objects;
DROP POLICY IF EXISTS mural_media_storage_update ON storage.objects;
DROP POLICY IF EXISTS mural_media_storage_delete ON storage.objects;

CREATE POLICY mural_media_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mural-media');

CREATE POLICY mural_media_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mural-media'
    AND (storage.foldername(name))[1] = public.usuario_atual_id()::text
  );

CREATE POLICY mural_media_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mural-media'
    AND ((storage.foldername(name))[1] = public.usuario_atual_id()::text OR public.usuario_atual_e_admin())
  )
  WITH CHECK (
    bucket_id = 'mural-media'
    AND ((storage.foldername(name))[1] = public.usuario_atual_id()::text OR public.usuario_atual_e_admin())
  );

CREATE POLICY mural_media_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'mural-media'
    AND ((storage.foldername(name))[1] = public.usuario_atual_id()::text OR public.usuario_atual_e_admin())
  );

-- 7) Realtime para comentários e mídias, sem duplicar entradas na publicação.
ALTER TABLE public.mural_comentarios REPLICA IDENTITY FULL;
ALTER TABLE public.mural_midias REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mural_comentarios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mural_comentarios;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mural_midias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mural_midias;
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mural_comentarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mural_midias TO authenticated;
