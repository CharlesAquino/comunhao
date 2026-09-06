# Hotfix: autenticação do webhook de push

A função `enviar-push-fcm` deixa de comparar o cabeçalho do webhook com a variável legada `SUPABASE_SERVICE_ROLE_KEY` e passa a usar um segredo exclusivo:

- variável da Edge Function: `PUSH_WEBHOOK_SECRET`
- cabeçalho do Database Webhook: `x-webhook-secret`

## Aplicação

1. Copie este ZIP sobre a raiz do projeto.
2. Gere e salve um segredo:

```bash
PUSH_WEBHOOK_SECRET="$(openssl rand -hex 32)"
printf 'Copie este valor para o webhook: %s\n' "$PUSH_WEBHOOK_SECRET"

npx supabase secrets set \
  --project-ref csxrhvgfnkqmkehgmnkp \
  PUSH_WEBHOOK_SECRET="$PUSH_WEBHOOK_SECRET"
```

3. Publique a função:

```bash
npx supabase functions deploy enviar-push-fcm \
  --no-verify-jwt \
  --project-ref csxrhvgfnkqmkehgmnkp
```

4. Edite o Database Webhook e deixe os cabeçalhos:

```text
Content-Type: application/json
x-webhook-secret: <o valor gerado acima>
```

Remova `Authorization` e `apikey` deste webhook.

5. Envie uma nova mensagem e consulte `net._http_response`. O registro novo deve sair de 401 para 200.
