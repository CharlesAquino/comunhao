-- Permite retomar uma mão já levantada após recarregar o app ou perder a
-- conexão, em vez de bloquear o usuário com SESSAO_JA_ABERTA.

CREATE OR REPLACE FUNCTION public.abrir_sessao_grupo()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_sessao_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.usuarios
  WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USUARIO_NAO_ENCONTRADO';
  END IF;

  SELECT id INTO v_sessao_id
  FROM public.sessoes_oracao_grupo
  WHERE anfitriao_id = v_user_id
    AND status = 'aberta'
  ORDER BY criado_em DESC
  LIMIT 1;

  IF v_sessao_id IS NOT NULL THEN
    INSERT INTO public.sessoes_oracao_grupo_participantes (sessao_id, usuario_id)
    VALUES (v_sessao_id, v_user_id)
    ON CONFLICT (sessao_id, usuario_id)
    DO UPDATE SET saiu_em = NULL, entrou_em = now();

    RETURN json_build_object(
      'id', v_sessao_id,
      'status', 'aberta',
      'anfitriao_id', v_user_id,
      'retomada', true
    );
  END IF;

  INSERT INTO public.sessoes_oracao_grupo (anfitriao_id, status)
  VALUES (v_user_id, 'aberta')
  RETURNING id INTO v_sessao_id;

  INSERT INTO public.sessoes_oracao_grupo_participantes (sessao_id, usuario_id)
  VALUES (v_sessao_id, v_user_id);

  RETURN json_build_object(
    'id', v_sessao_id,
    'status', 'aberta',
    'anfitriao_id', v_user_id,
    'retomada', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.abrir_sessao_grupo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abrir_sessao_grupo() TO authenticated;

