-- Push notifications nativas via Firebase Cloud Messaging (Android/Capacitor).
-- O token FCM é vinculado ao perfil público do usuário por RPC autenticada.

CREATE TABLE IF NOT EXISTS public.push_dispositivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_fcm text NOT NULL UNIQUE,
  plataforma text NOT NULL DEFAULT 'android',
  dispositivo text,
  app_version text,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_uso_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_dispositivos_plataforma_check
    CHECK (plataforma IN ('android', 'ios'))
);

CREATE INDEX IF NOT EXISTS push_dispositivos_usuario_ativo_idx
  ON public.push_dispositivos(usuario_id, ativo);

ALTER TABLE public.push_dispositivos ENABLE ROW LEVEL SECURITY;

-- O cliente grava tokens somente por RPC. Nem o próprio usuário precisa ler o token.
DROP POLICY IF EXISTS push_dispositivos_sem_acesso_direto ON public.push_dispositivos;

CREATE TABLE IF NOT EXISTS public.push_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id uuid NOT NULL REFERENCES public.app_notificacoes(id) ON DELETE CASCADE,
  dispositivo_id uuid NOT NULL REFERENCES public.push_dispositivos(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processando',
  tentativas integer NOT NULL DEFAULT 1,
  fcm_message_name text,
  ultimo_erro text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notificacao_id, dispositivo_id),
  CONSTRAINT push_entregas_status_check
    CHECK (status IN ('processando', 'enviado', 'falhou', 'ignorado'))
);

CREATE INDEX IF NOT EXISTS push_entregas_notificacao_idx
  ON public.push_entregas(notificacao_id);

ALTER TABLE public.push_entregas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.registrar_push_dispositivo(
  p_token text,
  p_plataforma text DEFAULT 'android',
  p_dispositivo text DEFAULT NULL,
  p_app_version text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usuario_id uuid;
  v_dispositivo_id uuid;
BEGIN
  v_usuario_id := public.usuario_atual_id();

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'USER_PROFILE_NOT_LINKED';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN
    RAISE EXCEPTION 'PUSH_TOKEN_INVALIDO';
  END IF;

  IF p_plataforma NOT IN ('android', 'ios') THEN
    RAISE EXCEPTION 'PUSH_PLATAFORMA_INVALIDA';
  END IF;

  INSERT INTO public.push_dispositivos (
    usuario_id,
    token_fcm,
    plataforma,
    dispositivo,
    app_version,
    ativo,
    ultimo_uso_em,
    atualizado_em
  )
  VALUES (
    v_usuario_id,
    trim(p_token),
    p_plataforma,
    left(p_dispositivo, 250),
    left(p_app_version, 50),
    true,
    now(),
    now()
  )
  ON CONFLICT (token_fcm)
  DO UPDATE SET
    usuario_id = EXCLUDED.usuario_id,
    plataforma = EXCLUDED.plataforma,
    dispositivo = EXCLUDED.dispositivo,
    app_version = EXCLUDED.app_version,
    ativo = true,
    ultimo_uso_em = now(),
    atualizado_em = now()
  RETURNING id INTO v_dispositivo_id;

  RETURN v_dispositivo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.desativar_push_dispositivo(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.push_dispositivos
  SET
    ativo = false,
    atualizado_em = now()
  WHERE token_fcm = p_token
    AND usuario_id = public.usuario_atual_id();
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_push_dispositivo(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_push_dispositivo(text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.desativar_push_dispositivo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desativar_push_dispositivo(text) TO authenticated;

COMMENT ON TABLE public.push_dispositivos IS
  'Tokens FCM dos aparelhos que podem receber notificacoes nativas.';
COMMENT ON TABLE public.push_entregas IS
  'Controle idempotente das tentativas de envio de push por aparelho.';
