-- Autenticação cotidiana por username, mantendo o telefone apenas como
-- identificador interno, integração WhatsApp e canal de recuperação.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS username_normalizado TEXT,
  ADD COLUMN IF NOT EXISTS email_recuperacao TEXT,
  ADD COLUMN IF NOT EXISTS telefone_verificado_em TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.normalizar_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(regexp_replace(trim(COALESCE(p_username, '')), '[^a-zA-Z0-9._]', '', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.validar_e_normalizar_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_normalizado TEXT;
BEGIN
  IF NEW.username IS NULL OR trim(NEW.username) = '' THEN
    RETURN NEW;
  END IF;

  v_normalizado := public.normalizar_username(NEW.username);
  IF lower(trim(NEW.username)) <> v_normalizado THEN
    RAISE EXCEPTION 'USERNAME_FORMAT_INVALID';
  END IF;
  IF length(v_normalizado) < 4 OR length(v_normalizado) > 24 THEN
    RAISE EXCEPTION 'USERNAME_LENGTH_INVALID';
  END IF;
  IF v_normalizado !~ '^[a-z][a-z0-9._]{3,23}$' THEN
    RAISE EXCEPTION 'USERNAME_FORMAT_INVALID';
  END IF;
  IF v_normalizado = ANY (ARRAY[
    'admin', 'administrador', 'professor', 'suporte', 'comunhao',
    'oracao', 'pastor', 'sistema', 'moderador', 'guardiao'
  ]) THEN
    RAISE EXCEPTION 'USERNAME_RESERVED';
  END IF;

  NEW.username := trim(NEW.username);
  NEW.username_normalizado := v_normalizado;
  IF NEW.email_recuperacao IS NOT NULL AND trim(NEW.email_recuperacao) = '' THEN
    NEW.email_recuperacao := NULL;
  END IF;
  IF NEW.email_recuperacao IS NOT NULL THEN
    NEW.email_recuperacao := lower(trim(NEW.email_recuperacao));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_normalizar_username ON public.usuarios;
CREATE TRIGGER usuarios_normalizar_username
  BEFORE INSERT OR UPDATE OF username, email_recuperacao
  ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.validar_e_normalizar_username();

-- Gera usernames compatíveis para os perfis existentes. Em colisões, acrescenta
-- os últimos quatro caracteres do UUID, mantendo todos os vínculos atuais.
DO $$
DECLARE
  v_usuario RECORD;
  v_base TEXT;
  v_candidato TEXT;
BEGIN
  FOR v_usuario IN
    SELECT id, nome
    FROM public.usuarios
    WHERE username IS NULL OR trim(username) = ''
    ORDER BY criado_em NULLS LAST, id
  LOOP
    v_base := public.normalizar_username(v_usuario.nome);
    IF v_base = '' OR v_base !~ '^[a-z]' THEN
      v_base := 'membro';
    END IF;
    v_base := left(v_base, 18);
    IF length(v_base) < 4 THEN
      v_base := rpad(v_base, 4, '0');
    END IF;
    IF v_base = ANY (ARRAY[
      'admin', 'administrador', 'professor', 'suporte', 'comunhao',
      'oracao', 'pastor', 'sistema', 'moderador', 'guardiao'
    ]) THEN
      v_base := left(v_base || 'membro', 18);
    END IF;

    v_candidato := v_base;
    IF EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE username_normalizado = public.normalizar_username(v_candidato)
        AND id <> v_usuario.id
    ) THEN
      v_candidato := left(v_base, 18) || right(replace(v_usuario.id::text, '-', ''), 4);
    END IF;

    UPDATE public.usuarios
    SET username = v_candidato,
        telefone_verificado_em = COALESCE(telefone_verificado_em, ultima_verificacao, criado_em, now())
    WHERE id = v_usuario.id;
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_normalizado_unique
  ON public.usuarios(username_normalizado)
  WHERE username_normalizado IS NOT NULL;

ALTER TABLE public.usuarios
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN username_normalizado SET NOT NULL;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_email_recuperacao_formato;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_email_recuperacao_formato
  CHECK (
    email_recuperacao IS NULL
    OR email_recuperacao ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

CREATE INDEX IF NOT EXISTS usuarios_email_recuperacao_idx
  ON public.usuarios(email_recuperacao)
  WHERE email_recuperacao IS NOT NULL;

-- Rate limit compartilhado pelas Edge Functions de login e recuperação.
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_hash TEXT NOT NULL,
  finalidade TEXT NOT NULL CHECK (finalidade IN ('login', 'otp_registro', 'otp_recuperacao')),
  tentativas INTEGER NOT NULL DEFAULT 1,
  janela_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  bloqueado_ate TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chave_hash, finalidade)
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;

-- View usada por experiências comunitárias. Telefone, e-mail, auth_user_id e
-- device_id não fazem parte do contrato público.
CREATE OR REPLACE VIEW public.usuarios_publicos
WITH (security_invoker = true)
AS
SELECT
  id,
  nome,
  username,
  foto_url,
  status_anel,
  papel,
  pontos_comunhao,
  xp,
  streak_dias,
  orando_por_id,
  sendo_orado_por_id,
  criado_em
FROM public.usuarios;

GRANT SELECT ON public.usuarios_publicos TO authenticated;

-- A policy de linhas existente continua permitindo a experiência comunitária,
-- mas os grants de coluna impedem que clientes autenticados peçam os canais
-- privados diretamente pelo PostgREST.
REVOKE SELECT ON public.usuarios FROM anon, authenticated;
GRANT SELECT (
  id,
  auth_user_id,
  nome,
  username,
  foto_url,
  status_anel,
  papel,
  pontos_comunhao,
  xp,
  streak_dias,
  orando_por_id,
  sendo_orado_por_id,
  codigo_indicacao,
  indicado_por_id,
  ultima_verificacao,
  last_login,
  criado_em
) ON public.usuarios TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_contatos_duplas()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  telefone TEXT,
  orando_por_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.usuario_atual_e_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;
  RETURN QUERY
  SELECT u.id, u.nome::text, u.telefone::text, u.orando_por_id
  FROM public.usuarios u
  WHERE u.orando_por_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_contatos_duplas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_contatos_duplas() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_metricas_contatos()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  telefone TEXT,
  foto_url TEXT,
  status_anel TEXT,
  pontos_comunhao INTEGER,
  streak_dias INTEGER,
  papel TEXT,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.usuario_atual_e_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;
  RETURN QUERY
  SELECT
    u.id, u.nome::text, u.telefone::text, u.foto_url::text, u.status_anel::text,
    u.pontos_comunhao::integer, u.streak_dias::integer, u.papel::text, u.last_login
  FROM public.usuarios u
  ORDER BY u.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_metricas_contatos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_metricas_contatos() TO authenticated;

-- A policy por linha, sozinha, permitiria ao dono da linha tentar trocar papel,
-- telefone ou pontuação. Este trigger mantém esses campos sob controle do
-- backend e libera apenas administradores e service_role.
CREATE OR REPLACE FUNCTION public.proteger_campos_sensiveis_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT public.usuario_atual_e_admin()
     AND (
       NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR
       NEW.telefone IS DISTINCT FROM OLD.telefone OR
       NEW.username IS DISTINCT FROM OLD.username OR
       NEW.username_normalizado IS DISTINCT FROM OLD.username_normalizado OR
       NEW.email_recuperacao IS DISTINCT FROM OLD.email_recuperacao OR
       NEW.telefone_verificado_em IS DISTINCT FROM OLD.telefone_verificado_em OR
       NEW.papel IS DISTINCT FROM OLD.papel OR
       NEW.pontos_comunhao IS DISTINCT FROM OLD.pontos_comunhao OR
       NEW.xp IS DISTINCT FROM OLD.xp OR
       NEW.streak_dias IS DISTINCT FROM OLD.streak_dias OR
       NEW.orando_por_id IS DISTINCT FROM OLD.orando_por_id OR
       NEW.sendo_orado_por_id IS DISTINCT FROM OLD.sendo_orado_por_id OR
       NEW.codigo_indicacao IS DISTINCT FROM OLD.codigo_indicacao OR
       NEW.indicado_por_id IS DISTINCT FROM OLD.indicado_por_id
     )
  THEN
    RAISE EXCEPTION 'SENSITIVE_PROFILE_FIELDS';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_proteger_campos_sensiveis ON public.usuarios;
CREATE TRIGGER usuarios_proteger_campos_sensiveis
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_sensiveis_usuario();

COMMENT ON COLUMN public.usuarios.telefone IS
  'Canal privado, usado somente por Edge Functions, recuperação e administração autorizada.';
COMMENT ON COLUMN public.usuarios.email_recuperacao IS
  'Canal privado e opcional para recuperação de conta.';
