# Push nativo Android — Firebase Cloud Messaging

Esta atualização mantém `app_notificacoes` como fonte de verdade e adiciona entrega nativa pelo FCM.

## O que passa a funcionar

- alerta na barra do Android mesmo com o aplicativo fechado;
- som, vibração e ícone próprio do Comunhão;
- prévia do título e do corpo da mensagem;
- ponto/indicador no ícone do aplicativo em launchers compatíveis;
- toque na notificação abrindo a rota correta;
- canais separados para Mensagens, Oração e Avisos;
- idempotência por notificação e aparelho para não duplicar push;
- fallback para o Realtime atual quando o push nativo não estiver configurado.

## 1. Criar o aplicativo Android no Firebase

No Firebase Console, crie ou escolha um projeto e adicione um aplicativo Android com o pacote:

```text
br.com.igreja.oracao
```

Baixe `google-services.json` e coloque em:

```text
android/app/google-services.json
```

Não altere o package name dentro desse arquivo.

## 2. Instalar o plugin Capacitor

Na raiz do projeto:

```bash
npm install @capacitor/push-notifications@8.1.2
npx cap sync android
```

O sync deve listar `@capacitor/push-notifications` entre os plugins Android.

## 3. Aplicar a migration

```bash
npx supabase db push --dry-run
npx supabase db push
```

Migration esperada:

```text
20260728253000_push_fcm_dispositivos.sql
```

Ela cria:

- `push_dispositivos`;
- `push_entregas`;
- RPC `registrar_push_dispositivo`;
- RPC `desativar_push_dispositivo`.

## 4. Configurar a conta de serviço do Firebase no Supabase

No Firebase Console:

1. Configurações do projeto;
2. Contas de serviço;
3. Gerar nova chave privada;
4. salve o JSON fora da pasta pública do projeto.

No terminal, troque o caminho abaixo pelo arquivo real:

```bash
export FIREBASE_SERVICE_ACCOUNT_BASE64="$(base64 -w0 "$HOME/Downloads/firebase-service-account.json")"

npx supabase secrets set \
  --project-ref csxrhvgfnkqmkehgmnkp \
  FIREBASE_SERVICE_ACCOUNT_BASE64="$FIREBASE_SERVICE_ACCOUNT_BASE64"

unset FIREBASE_SERVICE_ACCOUNT_BASE64
```

Nunca envie o JSON da conta de serviço para o GitHub, Drive público ou chat.

## 5. Publicar a Edge Function

```bash
npx supabase functions deploy enviar-push-fcm \
  --no-verify-jwt \
  --project-ref csxrhvgfnkqmkehgmnkp
```

A função não fica aberta: mesmo com `--no-verify-jwt`, ela exige que o request carregue exatamente a `SUPABASE_SERVICE_ROLE_KEY` no header `Authorization` ou `apikey`.

## 6. Criar o Database Webhook

No Dashboard do Supabase:

1. Database → Webhooks → Create webhook;
2. nome: `app_notificacoes_enviar_push`;
3. tabela: `public.app_notificacoes`;
4. evento: somente `INSERT`;
5. destino: Supabase Edge Function;
6. função: `enviar-push-fcm`;
7. método: `POST`;
8. adicione autenticação com a Service Role Key;
9. use um timeout de alguns segundos, pois a função comunica com o Firebase.

O webhook envia o registro recém-criado. A função localiza todos os aparelhos ativos daquele usuário e envia uma notificação para cada token FCM.

## 7. Gerar o APK

```bash
npm run lint -- --quiet
npm run build
npm test -- pushNotificationConfig notificationDeduplication notificationRouting conviteRouting sorteio adminAuth constants
npx cap sync android

cd android
./gradlew assembleDebug
```

APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 8. Teste ponta a ponta

1. Instale o APK novo;
2. abra o app e aceite a permissão de notificações;
3. faça login;
4. confirme no Supabase que surgiu uma linha em `push_dispositivos`;
5. feche totalmente o aplicativo;
6. usando outra conta, envie uma mensagem ou levante a mão;
7. confirme alerta na barra, som/vibração, preview e ponto no ícone;
8. toque na notificação e confirme a abertura da tela correta;
9. confirme uma linha `enviado` em `push_entregas`.

## Diagnóstico rápido

### Nenhuma linha em `push_dispositivos`

- confira `google-services.json`;
- execute `npx cap sync android` novamente;
- confirme que a permissão foi concedida;
- veja o Logcat para erros de registro FCM.

### Linha em `push_dispositivos`, mas nenhum push

- confira o Database Webhook;
- confira os logs da função `enviar-push-fcm`;
- confirme o secret `FIREBASE_SERVICE_ACCOUNT_BASE64`;
- confirme que a API Firebase Cloud Messaging está habilitada.

### Push aparece duas vezes

- verifique se existe apenas uma linha de `push_entregas` para o par notificação/aparelho;
- o payload usa `tag` baseada em `evento_chave`, fazendo o Android substituir reentregas do mesmo evento;
- no APK, o Realtime não cria alerta local quando o FCM está ativo.
