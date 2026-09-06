ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS participa_sorteio BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usuarios.participa_sorteio IS
  'Indica se o usuario foi marcado pelo admin para participar do sorteio do circulo de oracao.';

DROP FUNCTION IF EXISTS public.admin_listar_metricas_contatos();

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
  participa_sorteio BOOLEAN,
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
    u.id,
    u.nome::text,
    u.telefone::text,
    u.foto_url::text,
    u.status_anel::text,
    u.pontos_comunhao::integer,
    u.streak_dias::integer,
    u.papel::text,
    u.participa_sorteio,
    u.last_login
  FROM public.usuarios u
  ORDER BY u.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_metricas_contatos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_metricas_contatos() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_atualizar_participacao_sorteio(
  p_usuario_id UUID,
  p_participa_sorteio BOOLEAN
)
RETURNS public.usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario public.usuarios;
BEGIN
  IF NOT public.usuario_atual_e_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  UPDATE public.usuarios
  SET participa_sorteio = p_participa_sorteio
  WHERE id = p_usuario_id
  RETURNING * INTO v_usuario;

  IF v_usuario.id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  RETURN v_usuario;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_atualizar_participacao_sorteio(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_participacao_sorteio(UUID, BOOLEAN) TO authenticated;

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
       NEW.participa_sorteio IS DISTINCT FROM OLD.participa_sorteio OR
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
