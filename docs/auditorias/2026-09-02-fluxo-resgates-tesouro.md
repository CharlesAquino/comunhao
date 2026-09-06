# Auditoria — fluxo de resgates do Tesouro

Data: 2026-09-02  
Modo de evidência: inspeção estática do código e das migrations. Não substitui teste ponta a ponta com contas de membro e operador.

## Pergunta operacional

Quando um membro solicita um item, como o responsável pela Loja é avisado e como o pedido segue até a entrega?

## Fluxo implementado

1. O membro seleciona um produto e confirma a solicitação na aba Tesouro.
   - Saúde: boa. A tela informa que a reserva e o débito ocorrem somente depois da aprovação.
2. A RPC `solicitar_resgate_loja` valida autenticação, disponibilidade, variante, limite por membro, saldo e idempotência; então cria um pedido `pendente`.
   - Saúde: boa. O membro não pode criar pedidos para outra pessoa e repetições não duplicam a operação.
3. O operador encontra a fila entrando em Administração > Loja e estoque. O painel administrativo também mostra o total de pedidos pendentes quando é carregado ou atualizado manualmente.
   - Saúde: parcial. Não existe notificação criada para o operador no instante da solicitação, nem atualização em tempo real dessa fila/resumo.
4. O operador aprova ou rejeita. Na aprovação, a operação transacional baixa o estoque, debita Kesef, gera código de retirada, registra a movimentação e grava auditoria administrativa.
   - Saúde: boa. A transação impede débito/baixa inconsistentes e registra quem processou.
5. O membro recebe notificação de aprovado, rejeitado ou entregue; o sistema já possui sino, Realtime, push e preferências de Tesouro para esses eventos.
   - Saúde: boa para o membro. O mesmo canal ainda não é usado no sentido membro → operador quando o pedido nasce.
6. O operador marca o pedido como entregue.
   - Saúde: boa. A entrega fica com horário e responsável. A visão de operação, contudo, ainda não prioriza pedidos por urgência ou prazo.

## Decisão de estoque atual

Pedidos pendentes **não reservam estoque**. Dois membros podem solicitar a última unidade; o primeiro aprovado recebe a baixa e os demais podem ser rejeitados por falta de estoque. Isso é coerente com a mensagem atual do produto (“garantido após aprovação”), mas exige revisão rápida da fila.

## Principais riscos

- O operador precisa lembrar de abrir ou atualizar o Admin para descobrir um pedido novo.
- Não há responsável explícito, prazo de atendimento nem escalonamento para pedidos pendentes.
- A ordem da fila não destaca “mais antigo”, “estoque crítico” ou “membro aguardando há mais tempo”.
- A aprovação tardia pode frustrar o membro se o estoque acabar entre solicitação e análise.
- O relatório operacional é exportável, mas não há KPI próprio para tempo de aprovação, rejeição por falta de estoque ou pedidos envelhecidos.

## Melhorias recomendadas

### Prioridade 0 — conhecimento imediato do pedido

Criar um trigger de `insert` em `loja_pedidos` que gere uma `app_notificacao` idempotente para todos os usuários com `store.manage` (incluindo Charles). A notificação deve abrir `/admin/loja`, trazer membro, item, quantidade e horário. Como o app já distribui `app_notificacoes` por Realtime e push, isso habilita sino e push sem criar um canal paralelo.

Também assinar Realtime em `loja_pedidos` na página administrativa ou atualizar o resumo periodicamente enquanto a tela estiver aberta, para a fila mudar sem recarregar manualmente.

Status em 2026-09-02: implementada. A criação de um pedido agora gera `loja_pedido_novo` para cada responsável com `store.manage`, com destino para `/admin/loja`. O registro segue pelo sino, Realtime e push existentes. A tabela `loja_pedidos` também foi publicada no Realtime, atualizando o resumo administrativo e a fila da Loja.

### Prioridade 1 — fila de operação

Separar no Admin uma fila “Ação necessária” acima do histórico, com filtros `pendente`, `aprovado aguardando retirada`, `estoque baixo` e `mais antigo primeiro`. Cada pedido deve exibir tempo de espera, membro, item/variante, Kesef, estoque atual e ações de aprovar/rejeitar.

Adicionar indicadores: pendentes agora, tempo médio até decisão, taxa de aprovação, rejeições por estoque, entregas em atraso e itens com maior procura.

Status em 2026-09-02: parcialmente implementada. A fila prioriza pendentes e, dentro de cada status, os pedidos mais antigos; a tela mostra pedidos que exigem ação, retiradas aguardando membro, tempo médio de resposta e a pendência mais antiga. Taxas históricas e motivos estruturados de rejeição continuam como próxima evolução.

### Prioridade 2 — regra de reserva

Escolher explicitamente entre:

- **Solicitação sem reserva** (o modelo atual): simples e adequado a baixo volume; exige SLA curto de análise.
- **Reserva temporária no pedido**: bloqueia estoque por um período, depois libera automaticamente se o operador não decidir; reduz frustração, mas precisa de expiração, fila e reversão auditável.

Para o estágio atual, manteria o modelo atual e adotaria um SLA visível de aprovação — por exemplo, “analisar em até 24 h”. A reserva temporária entra quando houver recorrência de concorrência pelo mesmo item.

### Prioridade 3 — responsabilidade e comunicação

Permitir atribuir um pedido a um operador, registrar uma nota interna e avisar o membro quando a retirada estiver disponível. Depois, acrescentar lembrete automático de retirada e política de expiração/cancelamento para produtos não buscados.

Status em 2026-09-03: a comunicação logística foi implementada. Ao processar um resgate, o operador escolhe entre previsão em definição, entrega agendada ou alinhamento de retirada. A escolha exige data/horário/local quando aplicável, registra uma linha do tempo acessível ao membro em “Meus resgates” e dispara uma notificação do Tesouro. Alterações posteriores de logística também entram no histórico e notificam o membro. Atribuição nominal de responsável, notas exclusivamente internas, lembrete e expiração continuam como evolução futura.

## Evidências consultadas

- `src/pages/Loja.tsx`: interface de solicitação, fila administrativa, aprovação, rejeição e entrega.
- `supabase/migrations/20260807120000_lote_continuidade_comunhao.sql`: criação transacional do pedido, processamento, auditoria e notificações de status ao membro.
- `src/pages/admin/AdminDashboard.tsx` e `supabase/migrations/20260730030000_admin_governance_foundation.sql`: contador de pendências carregado no resumo administrativo.
- `src/services/notificationService.ts`: suporte existente para sino, Realtime e push de registros em `app_notificacoes`.
