-- Dispara a Edge Function de push sempre que uma notificacao interna e criada.
-- O segredo compartilhado permanece no Vault do banco e nunca e versionado.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.configurar_segredo_webhook_push(p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 32 THEN
    RAISE EXCEPTION 'PUSH_WEBHOOK_SECRET_INVALIDO';
  END IF;

  SELECT id
    INTO v_secret_id
    FROM vault.secrets
   WHERE name = 'push_webhook_secret'
   LIMIT 1;

  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      p_secret,
      'push_webhook_secret',
      'Segredo compartilhado entre o trigger de notificacoes e a Edge Function FCM'
    );
  ELSE
    PERFORM vault.update_secret(
      v_secret_id,
      p_secret,
      'push_webhook_secret',
      'Segredo compartilhado entre o trigger de notificacoes e a Edge Function FCM'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.configurar_segredo_webhook_push(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.configurar_segredo_webhook_push(text) FROM anon;
REVOKE ALL ON FUNCTION public.configurar_segredo_webhook_push(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.configurar_segredo_webhook_push(text) TO service_role;

CREATE OR REPLACE FUNCTION public.disparar_webhook_push_notificacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret
    INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'push_webhook_secret'
   LIMIT 1;

  IF v_secret IS NULL OR length(v_secret) < 32 THEN
    RAISE WARNING 'Webhook de push nao configurado: segredo ausente';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://csxrhvgfnkqmkehgmnkp.supabase.co/functions/v1/enviar-push-fcm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- A notificacao interna nunca deve falhar por indisponibilidade do provedor push.
    RAISE WARNING 'Falha ao enfileirar webhook de push: %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.disparar_webhook_push_notificacao() FROM PUBLIC;

DROP TRIGGER IF EXISTS app_notificacoes_enviar_push_fcm
  ON public.app_notificacoes;

CREATE TRIGGER app_notificacoes_enviar_push_fcm
AFTER INSERT ON public.app_notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.disparar_webhook_push_notificacao();

COMMENT ON FUNCTION public.disparar_webhook_push_notificacao() IS
  'Enfileira o envio FCM de novas notificacoes usando pg_net e segredo armazenado no Vault.';
