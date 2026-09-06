# Auditoria do fluxo de notificações — 2026-08-09

## Escopo e evidência

Auditoria estática do fluxo de notificações internas, Realtime, Web Push e push nativo Android. Foram examinados o cliente React/Capacitor, configuração Android, migrations, Edge Function FCM e estado remoto visível pela CLI do Supabase. Não houve envio real para um aparelho nesta rodada.

## Diagnóstico principal (corrigido no lote atual)

O APK `development` instalado (`dev.9`) não pode receber push fora do aplicativo por decisão explícita do build daquela versão:

- `.env.development.local`: `VITE_ENABLE_NATIVE_PUSH=false`;
- `nativePushService.ts`: interrompe o registro nativo nesse canal;
- `android/app/build.gradle`: desativa `processDebugGoogleServices`;
- o debug usa `applicationId` `br.com.igreja.oracao.dev`;
- o `google-services.json` possui somente o cliente `br.com.igreja.oracao`.

Com isso, nenhum token FCM do APK `dev.9` é registrado em `push_dispositivos`. O Realtime continua funcionando somente enquanto o app está aberto.

Em 2026-08-09, o pacote `br.com.igreja.oracao.dev` foi cadastrado no Firebase, o `google-services.json` foi atualizado com os dois clientes Android, o bloqueio do Gradle foi removido e `VITE_ENABLE_NATIVE_PUSH` foi ativado. O build debug passou por `processDebugGoogleServices` e incorporou o App ID correto da variante development. A ativação no aparelho depende da instalação do próximo APK do lote.

## Jornada auditada

1. **Evento de domínio → `app_notificacoes` — parcialmente saudável.** Existem triggers para mensagens, convites, respostas, mão levantada, EBD, Mural, sorteio, pedidos assíncronos e status de resgate. Alguns eventos planejados ainda não possuem produtor confirmado, como lembrete EBD e estoque baixo.
2. **Persistência e idempotência — saudável.** `evento_chave` e índice único impedem duplicatas por usuário/evento; o cliente também deduplica por ID/chave.
3. **Sino interno e Realtime — saudável com o app aberto.** Existe assinatura compartilhada por usuário, contagem de não lidas, leitura individual/global e exclusão de mensagens privadas do sino.
4. **Preferências e horário silencioso — implementado.** As categorias e o fuso horário são avaliados no servidor FCM e no alerta Web. Falta apenas feedback visível sobre permissão negada/estado do aparelho.
5. **Registro FCM no Android — corrigido no código, pendente de instalação.** Continua bloqueado somente no APK `dev.9` já instalado.
6. **Disparo remoto — preparado, mas o gatilho externo ainda requer prova operacional.** A Edge Function `enviar-push-fcm` está `ACTIVE` (versão 12) e os segredos `FIREBASE_SERVICE_ACCOUNT_BASE64` e `PUSH_WEBHOOK_SECRET` existem. O webhook de banco que chama a função não está versionado no repositório; sua existência e execução precisam ser confirmadas por uma entrega real/log remoto.
7. **Entrega e deduplicação FCM — estruturalmente saudável.** `push_entregas` impede envio repetido por notificação/aparelho e tokens inválidos são desativados.
8. **Abertura e roteamento — saudável nos casos testados.** Convites, oração, Mural e EBD possuem rotas específicas. Cinco arquivos de teste, com 21 testes, passaram.

## Correção necessária

1. Registrar no Firebase um aplicativo Android para `br.com.igreja.oracao.dev`.
2. Baixar um `google-services.json` contendo os clientes de produção e desenvolvimento.
3. Remover o bloqueio de `processDebugGoogleServices`.
4. Definir `VITE_ENABLE_NATIVE_PUSH=true` no canal development.
5. Gerar o próximo APK mantendo o mesmo `applicationId` `.dev`, para atualizar o app instalado.
6. No aparelho: conceder permissão, autenticar, confirmar criação do token e enviar evento de teste com app em primeiro plano, segundo plano e encerrado.
7. Confirmar no Supabase a entrada em `push_entregas` e o resultado da Edge Function; se não houver entrada, configurar/reparar o Database Webhook.

## Riscos adicionais

- A solicitação de permissão ocorre automaticamente ao autenticar, sem explicação contextual.
- Falhas de registro são silenciosas para o usuário e para a interface administrativa.
- O módulo administrativo de notificações ainda aparece como planejado, dificultando diagnóstico de entregas.
- Canais Android são criados, mas o payload FCM não define explicitamente `channel_id`; convém mapear o tipo ao canal no servidor.

## Critério de aceite

Uma notificação de convite deve: criar exatamente um registro interno, produzir exatamente uma entrega para o aparelho ativo, aparecer com o app encerrado, abrir a rota correta e marcar o registro como lido. Preferências desativadas e horário silencioso devem impedir o alerta nativo sem apagar a atividade interna.
