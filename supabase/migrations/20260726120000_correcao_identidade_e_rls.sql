-- Corrige a separação entre auth.users.id e public.usuarios.id.
-- Não altera chaves primárias existentes: apenas vincula auth_user_id e usa
-- helpers SECURITY DEFINER para as policies.

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_auth_user_id_unique
  ON public.usuarios(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.usuario_atual_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM public.usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.usuario_atual_e_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT papel = 'admin'
    FROM public.usuarios
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  ), false)
$$;

REVOKE ALL ON FUNCTION public.usuario_atual_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.usuario_atual_e_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_atual_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_atual_e_admin() TO authenticated;

-- Vincula com segurança uma conta Auth a um perfil legado de mesmo telefone.
-- O telefone informado precisa coincidir com o telefone verificado no JWT.
CREATE OR REPLACE FUNCTION public.vincular_usuario_auth_seguro(p_telefone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_jwt_phone TEXT := regexp_replace(COALESCE(auth.jwt() ->> 'phone', ''), '\D', '', 'g');
  v_phone TEXT := regexp_replace(COALESCE(p_telefone, ''), '\D', '', 'g');
  v_usuario_id UUID;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;
  IF v_jwt_phone = '' OR v_jwt_phone <> v_phone THEN
    RAISE EXCEPTION 'PHONE_DOES_NOT_MATCH_AUTH';
  END IF;

  SELECT id INTO v_usuario_id
  FROM public.usuarios
  WHERE regexp_replace(telefone, '\D', '', 'g') = v_phone
  LIMIT 1
  FOR UPDATE;

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_user_id = v_auth_uid AND id <> v_usuario_id
  ) THEN
    RAISE EXCEPTION 'AUTH_ALREADY_LINKED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = v_usuario_id
      AND auth_user_id IS NOT NULL
      AND auth_user_id <> v_auth_uid
  ) THEN
    RAISE EXCEPTION 'PROFILE_ALREADY_LINKED';
  END IF;

  UPDATE public.usuarios
  SET auth_user_id = v_auth_uid
  WHERE id = v_usuario_id;

  RETURN v_usuario_id;
END;
$$;

REVOKE ALL ON FUNCTION public.vincular_usuario_auth_seguro(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vincular_usuario_auth_seguro(TEXT) TO authenticated;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_select_todos ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update_proprio_ou_admin ON public.usuarios;
DROP POLICY IF EXISTS usuarios_delete_apenas_admin ON public.usuarios;
CREATE POLICY usuarios_select_todos ON public.usuarios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY usuarios_update_proprio_ou_admin ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = public.usuario_atual_id() OR public.usuario_atual_e_admin())
  WITH CHECK (id = public.usuario_atual_id() OR public.usuario_atual_e_admin());
CREATE POLICY usuarios_delete_apenas_admin ON public.usuarios
  FOR DELETE TO authenticated USING (public.usuario_atual_e_admin());

DROP POLICY IF EXISTS pedidos_insert_autenticado ON public.pedidos;
DROP POLICY IF EXISTS pedidos_update_autor_ou_admin ON public.pedidos;
DROP POLICY IF EXISTS pedidos_delete_autor_ou_admin ON public.pedidos;
CREATE POLICY pedidos_insert_autenticado ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = public.usuario_atual_id());
CREATE POLICY pedidos_update_autor_ou_admin ON public.pedidos
  FOR UPDATE TO authenticated
  USING (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin())
  WITH CHECK (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());
CREATE POLICY pedidos_delete_autor_ou_admin ON public.pedidos
  FOR DELETE TO authenticated
  USING (autor_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

DROP POLICY IF EXISTS intercessoes_insert_autenticado ON public.intercessoes;
DROP POLICY IF EXISTS intercessoes_update_proprio_ou_admin ON public.intercessoes;
DROP POLICY IF EXISTS intercessoes_delete_proprio_ou_admin ON public.intercessoes;
CREATE POLICY intercessoes_insert_autenticado ON public.intercessoes
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = public.usuario_atual_id());
CREATE POLICY intercessoes_update_proprio_ou_admin ON public.intercessoes
  FOR UPDATE TO authenticated
  USING (usuario_id = public.usuario_atual_id() OR public.usuario_atual_e_admin())
  WITH CHECK (usuario_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());
CREATE POLICY intercessoes_delete_proprio_ou_admin ON public.intercessoes
  FOR DELETE TO authenticated
  USING (usuario_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());
