CREATE TABLE IF NOT EXISTS public.app_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  corpo text NOT NULL,
  url text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  lida boolean NOT NULL DEFAULT false,
  criada_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_notificacoes_select_proprio_ou_admin ON public.app_notificacoes;
DROP POLICY IF EXISTS app_notificacoes_update_proprio_ou_admin ON public.app_notificacoes;

CREATE POLICY app_notificacoes_select_proprio_ou_admin ON public.app_notificacoes
  FOR SELECT TO authenticated
  USING (usuario_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

CREATE POLICY app_notificacoes_update_proprio_ou_admin ON public.app_notificacoes
  FOR UPDATE TO authenticated
  USING (usuario_id = public.usuario_atual_id() OR public.usuario_atual_e_admin())
  WITH CHECK (usuario_id = public.usuario_atual_id() OR public.usuario_atual_e_admin());

ALTER TABLE public.app_notificacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notificacoes;

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

  INSERT INTO public.app_notificacoes (usuario_id, tipo, titulo, corpo, url, dados)
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
    )
  FROM public.usuarios u
  JOIN public.usuarios parceiro ON parceiro.id = u.orando_por_id
  WHERE u.id = ANY(p_usuario_ids)
    AND u.orando_por_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_notificar_sorteio_circulo(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_notificar_sorteio_circulo(uuid[]) TO authenticated;
