# Continuação — notificações e fluxo de oração

## Implementado

- Notificação do sorteio semanal.
- Notificação automática para nova mensagem.
- Notificação automática para convite **Orar com**.
- Redirecionamento dos dois participantes para a mesma sala/timer após o aceite.
- Notificação para quem enviou o convite quando ele for aceito ou recusado.
- Remoção de notificações duplicadas por chave idempotente do evento.
- Central de notificações no topo do app, com contador, leitura individual e **marcar todas**.
- Notificação **Levantar a mão** enviada para toda a mocidade, exceto para quem levantou.
- Botão **Orar junto** na central de notificações e na tela inicial.
- A pessoa que levanta a mão fica aguardando; ela não entra na sala compartilhada sozinha.
- A primeira pessoa que aceita entra junto com o anfitrião; tentativas posteriores recebem aviso de que o momento já foi atendido.

## Migrations novas

```text
supabase/migrations/20260728250000_corrigir_convites_e_notificacoes_duplicadas.sql
supabase/migrations/20260728251000_mao_levantada_com_aceite.sql
```

Aplicar no Supabase remoto:

```bash
npx supabase db push --dry-run
npx supabase db push
```

## Validação local

```bash
npm ci
npm run lint -- --quiet
npm run build
npm test -- sorteio adminAuth constants conviteRouting notificationRouting
```

## Roteiro de teste com duas contas

1. Charles chama a dupla da semana para **Orar com**.
2. A dupla aceita por voz; ambos devem abrir a mesma sala.
3. Charles toca em **Levantar a mão**; ele deve permanecer na tela de espera, sem abrir a sala.
4. Outra conta deve receber o alerta com **Orar junto**.
5. Ao aceitar, a sala compartilhada deve abrir para os dois.
6. Uma terceira conta que tentar aceitar deve ver que o pedido já foi atendido.
7. Cada evento deve gerar apenas uma notificação por usuário.

## Observação importante

O Realtime gera notificações do sistema enquanto o app/PWA está aberto ou ativo em segundo plano conforme o navegador permitir. Receber alertas com o aplicativo totalmente encerrado exige concluir o envio Web Push no backend usando `push_subscriptions` e as chaves VAPID.
