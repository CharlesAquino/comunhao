CREATE OR REPLACE FUNCTION public.admin_listar_elegiveis_sorteio(
  p_last_login_min timestamptz
)
RETURNS TABLE (
  id uuid
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
  SELECT u.id
  FROM public.usuarios u
  WHERE u.participa_sorteio = true
    AND u.auth_user_id IS NOT NULL
    AND u.last_login >= p_last_login_min
  ORDER BY u.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_elegiveis_sorteio(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_elegiveis_sorteio(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_aplicar_sorteio_circulo(
  p_relacoes jsonb
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

  WITH payload AS (
    SELECT
      (item->>'id')::uuid AS id,
      (item->>'orando_por_id')::uuid AS orando_por_id,
      (item->>'sendo_orado_por_id')::uuid AS sendo_orado_por_id
    FROM jsonb_array_elements(p_relacoes) AS item
  ),
  updated AS (
    UPDATE public.usuarios u
    SET
      orando_por_id = payload.orando_por_id,
      sendo_orado_por_id = payload.sendo_orado_por_id
    FROM payload
    WHERE u.id = payload.id
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_aplicar_sorteio_circulo(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_aplicar_sorteio_circulo(jsonb) TO authenticated;
