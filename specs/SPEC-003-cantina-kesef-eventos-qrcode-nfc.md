# SPEC-003 — Cantina Kesef efêmera com QR Code e NFC

**Status:** proposta funcional e técnica  
**Data:** 11/08/2026  
**Gestor geral indicado:** Charles  
**Local no produto:** rota/aba Tesouro → `Tesouro | Cantina`

## 1. Objetivo

Permitir que membros resgatem, com pontos Kesef, alimentos ou objetos
disponibilizados pela comunidade durante eventos específicos. O sistema deve
operar rapidamente em celular/tablet, manter estoque consistente e encerrar a
exposição dos itens automaticamente ao final do evento.

## 2. Escopo do MVP

- criação e gestão de eventos de Cantina;
- designação de equipe e turnos;
- contribuições/lotes de estoque;
- anúncios temporários vinculados ao evento;
- anúncio prévio e reserva antecipada durante janela configurada;
- aprovisionamento de Kesef e estoque até a retirada;
- PDV para montar um resgate;
- identificação por QR Code;
- confirmação no aparelho autenticado do membro;
- débito Kesef e baixa de estoque atômicos;
- confirmação em tempo real para o operador;
- entrega, cancelamento e estorno auditáveis;
- fechamento automático/manual do evento e destinação de sobras;
- histórico do membro e relatório administrativo.
- retirada pessoal ou por representante previamente autorizado no evento.

NFC entra como segunda etapa do MVP ampliado. O contrato de dados nasce preparado
desde a primeira migration.

## 3. Fora do escopo

- venda por dinheiro, cartão ou PIX;
- saque ou conversão de Kesef;
- remuneração de contribuidor;
- transferências Kesef pessoa a pessoa;
- marketplace ou split entre vendedores;
- entrega fora da janela/local definidos para o evento;
- entrega domiciliar, despacho, motoboy ou logística externa;
- estoque permanente compartilhado automaticamente entre eventos;
- pagamento NFC, cartão emulado ou saldo armazenado em tag;
- gestão fiscal/contábil de valores em reais dentro da carteira do membro.

## 4. Glossário

| Termo | Significado |
|---|---|
| Evento | Janela temporária de operação da Cantina |
| Contribuidor | Quem disponibiliza um lote, sem receber Kesef |
| Lote | Entrada rastreável de estoque em um evento |
| Anúncio | Oferta efêmera visível na janela prévia e/ou durante o evento |
| Reserva | Solicitação antecipada vinculada a um evento futuro |
| Aprovisionamento | Kesef bloqueado, mas ainda não debitado do ledger |
| Ausência | Reserva não retirada após a tolerância configurada |
| Doação por ausência | Destinação do item reservado com consumo do Kesef provisionado |
| Representante | Pessoa autorizada pelo titular a retirar a reserva no evento |
| Caixa | Ponto/terminal lógico que monta o resgate |
| Operador | Responsável por caixa, entrega e atendimento |
| Membro | Titular autenticado que confirma o resgate |
| Intenção | Pedido temporário aguardando confirmação |
| Resgate | Débito Kesef confirmado e baixa de estoque |
| Sobra | Estoque ainda existente após o fechamento |

## 5. Atores, autoridade e responsabilidade

### 5.1 Charles — gestor geral da Cantina

Charles recebe o papel `gestor_cantina`, atribuído por administrador com motivo e
auditoria. Pode:

- criar, abrir, pausar, fechar e cancelar eventos;
- nomear/remover operadores e definir turnos;
- administrar caixas, tags NFC e estoque;
- cadastrar contribuições e destinar sobras;
- consultar relatórios e trilha de auditoria;
- cancelar intenções e autorizar estornos conforme política;
- delegar operação sem compartilhar sua conta.

### 5.2 Operador/responsável pelo resgate

Recebe o papel administrativo `operador_cantina` e uma escala temporária no
evento. Pode operar somente eventos/caixas atribuídos e durante a vigência do
turno. A interface mostra a função “Responsável pelo resgate”, sem alterar sua
patente da Jornada de Serviço.

### 5.3 Contribuidor

Registra ou tem registrada sua cessão/contribuição. Vê um comprovante com evento,
item, quantidade e destinação declarada. Não vê dados de quem resgatou e não
recebe Kesef.

### 5.4 Membro resgatante

Vê somente eventos abertos, escolhe/recebe o pedido montado, confirma em seu
próprio aparelho e consulta seu comprovante e histórico.

Pode indicar e revogar um representante para retirar uma reserva. O titular
continua responsável pela reserva e pelo Kesef provisionado; a autorização não
transfere pontos nem propriedade da carteira.

## 6. Permissões administrativas propostas

| Permissão | Ação |
|---|---|
| `canteen.read` | visualizar eventos e operação |
| `canteen.events.manage` | criar/abrir/pausar/fechar eventos |
| `canteen.team.manage` | atribuir equipe, turnos e caixas |
| `canteen.inventory.manage` | cadastrar lotes, ajustes e sobras |
| `canteen.checkout.operate` | montar intenção e confirmar entrega |
| `canteen.redemptions.read` | consultar resgates do escopo permitido |
| `canteen.redemptions.reverse` | estornar com motivo e auditoria |
| `canteen.reports.read` | consultar relatórios agregados |

`gestor_cantina` recebe todas as permissões acima. `operador_cantina` recebe
`admin.access`, `canteen.read`, `canteen.checkout.operate` e leitura apenas dos
resgates do evento/caixa atribuído. `economy.adjust` não é concedida ao operador.

## 7. Ciclo de vida do evento

```text
rascunho → anunciado → reservas abertas → reservas encerradas → aberto ⇄ pausado → encerrado
                ↘ cancelado ────────────────────────────────────────────────↗
```

### Regras

- `rascunho`: invisível aos membros; aceita estoque e equipe;
- `anunciado`: aparece como próxima Cantina, ainda sem aceitar reservas;
- `reservas abertas`: anúncios efêmeros aparecem antes do evento e aceitam
  reservas dentro da janela configurada;
- `reservas encerradas`: mantém “Meus pedidos” e informação do evento, mas não
  aceita novas reservas;
- `aberto`: anúncios visíveis e resgates habilitados;
- `pausado`: anúncios podem permanecer visíveis com estado de pausa, sem novas
  intenções;
- `encerrado`: anúncios saem imediatamente, ainda que haja estoque;
- `cancelado`: invisível e sem resgate; exige motivo;
- `ends_at` encerra logicamente a visibilidade mesmo se o job de fechamento
  atrasar. Toda consulta e RPC verifica status e horário no servidor;
- reabrir evento encerrado não é permitido. Cria-se novo evento;
- copiar anúncios para outro evento é ação explícita e cria novos lotes/anúncios.

### Estoque remanescente

No fechamento, cada lote com sobra recebe uma destinação:

- `devolvido_ao_contribuidor`;
- `doado`;
- `consumido_comunitariamente`;
- `descartado`;
- `transferencia_explicita` para novo evento, criando novo lote rastreável.

O anúncio anterior permanece histórico e nunca volta a ficar público.

## 8. Experiência na aba Tesouro

### 8.1 Navegação

```text
Tesouro
[ Tesouro ] [ Cantina ]
```

- Tesouro mantém catálogo permanente e solicitação/retirada posterior;
- Cantina exibe somente eventos anunciados, com reservas abertas ou em operação;
- não existe grade estática da Cantina quando não há evento.

### 8.2 Cantina fechada

- estado acolhedor: “A Cantina está fechada agora”;
- próximo evento, se publicado;
- reservas já realizadas e orientação de retirada;
- histórico pessoal de resgates;
- nenhuma sobra do evento anterior aparece como produto disponível.

### 8.3 Cantina aberta — membro

- nome e horário do evento;
- saldo Kesef;
- anúncios temporários com imagem, nome, valor, disponibilidade e alergênicos;
- ações `Ler QR Code` e `Aproximar por NFC` quando suportado;
- fallback explícito de NFC para QR;
- confirmação apresenta evento, caixa, itens, quantidades, total, saldo atual e
  saldo posterior;
- botão final `Confirmar resgate`;
- sucesso apresenta código curto, itens e orientação de retirada.

### 8.4 Cantina anunciada — reserva antecipada

- anúncio informa evento, data, local, contribuidores quando houver consentimento,
  janela de retirada e quantidade disponível para reserva;
- ação principal: `Reservar para este evento`;
- antes de confirmar, o membro vê total provisionado, saldo total, saldo disponível
  depois da reserva, limite por pessoa, prazo de cancelamento, tolerância e regra
  de doação por ausência;
- a carteira distingue `Saldo total`, `Kesef provisionado` e `Disponível`;
- `Meus pedidos` permite acompanhar, cancelar no prazo e abrir o código de retirada;
- em `Quem vai retirar?`, o titular escolhe `Eu` ou indica um representante;
- lembretes são enviados antes do evento e antes do encerramento da tolerância;
- a reserva não é um catálogo permanente nem permanece pública após o evento.

### 8.5 PDV — operador

- evento, caixa e nome do operador sempre visíveis;
- grade de itens grandes com estoque em tempo real;
- carrinho com incremento/remoção;
- `Gerar QR Code` como ação primária;
- estado NFC do caixa e instrução de aproximação;
- cronômetro da intenção;
- confirmação Realtime com nome/foto mínima do membro e código curto;
- `Confirmar entrega`, `Cancelar` e motivo de exceção;
- abas `Reservas` e `Resgates na hora`, com estados preparado, entregue, ausente e
  doado por ausência;
- operador não informa senha, não escolhe usuário manualmente e não força débito.

### 8.6 Interface do contribuidor

- registrar contribuição, quando autorizado, ou conferir registro feito pelo
  gestor;
- item, quantidade, unidade, lote, validade, alergênicos e condições de
  conservação;
- declaração de origem: doação, contribuição pessoal, compra comunitária ou
  despesa reembolsável previamente autorizada;
- confirmação explícita de que a contribuição não gera Kesef nem remuneração
  proporcional aos resgates;
- comprovante sem expor compradores.
- visão agregada de quantidades reservadas, sem identidade dos membros.

### 8.7 Admin — Charles

- visão “Cantina agora”: evento, caixas, operadores e filas;
- criar evento a partir de modelo, sem reativar anúncios antigos;
- configurar abertura/fechamento de reservas, limite por pessoa, prazo de
  cancelamento, tolerância de retirada e destino comunitário das ausências;
- convidar/atribuir operador e revogar acesso imediatamente;
- entrada de estoque por lote e ajuste com justificativa;
- painel de itens críticos, validade e alergênicos;
- fechamento guiado com destinação das sobras;
- relatórios: Kesef retirado, resgates, itens, cancelamentos, estornos, sobras e
  divergência de estoque;
- auditoria por evento, caixa e operador.

## 9. Reserva antecipada e ausência

### 9.1 Estados da reserva

```text
solicitada/aprovisionada → preparada → entregue
          ├─────────────→ cancelada_no_prazo
          ├─────────────→ cancelada_pelo_evento
          ├─────────────→ indisponivel
          └─────────────→ ausente → doada_por_ausencia
```

### 9.2 Regras econômicas e operacionais

- criar a reserva bloqueia, na mesma transação, estoque e Kesef disponível;
- o aprovisionamento não é uma entrada do ledger e não altera o saldo total;
- uma entrega liquida o aprovisionamento e cria um único débito imutável;
- após a janela e tolerância, um operador confirma que o item estava preparado e
  disponível; só então a ausência pode liquidar os pontos e destinar o item;
- mero decurso do horário ou execução de job não penaliza o membro sozinho;
- cancelamento pelo membro até o prazo libera Kesef e estoque;
- cancelamento do evento, falta do produto ou falha operacional sempre libera o
  aprovisionamento, independentemente do horário;
- Charles pode conceder exceção/restaurar Kesef, com motivo, autor e auditoria;
- a regra aceita deve ser versionada no momento da reserva para não mudar depois;
- limites por membro e por anúncio reduzem açambarcamento de itens.

### 9.3 Retirada por QR Code ou NFC

- a reserva possui código/token de retirada de uso único;
- o membro pode mostrar seu QR ao operador ou aproximar o aparelho da tag do caixa;
- QR/NFC apenas localizam a reserva; operador e membro conferem o resumo, e o
  servidor executa a entrega/liquidação de modo idempotente;
- a tag NFC nunca contém saldo, pontos ou autorização de débito.

### 9.4 Retirada por terceiro

- o titular pode indicar um membro autenticado como representante antes da entrega;
- a autorização é específica para uma reserva, revogável e não reutilizável;
- o representante vê somente os dados mínimos necessários: evento, janela, itens
  e código de retirada; não vê saldo ou histórico da carteira do titular;
- no evento, o representante apresenta seu código/QR ou usa o NFC do caixa; o
  operador confere a autorização retornada pelo servidor;
- a entrega ao representante liquida o mesmo aprovisionamento do titular e gera
  comprovante para ambos, sem movimentar Kesef na carteira do representante;
- depois da entrega, a autorização não pode ser trocada ou reutilizada;
- excepcionalmente, Charles ou operador autorizado pode registrar retirada por
  pessoa não cadastrada, mediante confirmação do titular, nome mínimo, motivo e
  auditoria; esse fluxo não deve depender de compartilhar senha ou sessão;
- encaminhar o pedido depois da retirada é responsabilidade privada do titular e
  do representante. A Cantina não coleta endereço nem assume entrega domiciliar.

## 10. QR Code

### Contrato

- QR contém uma URL/deep link com token público aleatório, nunca usuário, itens,
  saldo ou valor confiável;
- token armazenado somente como hash no servidor;
- validade recomendada: 90 segundos;
- uso único e vinculado a evento, caixa e intenção;
- uma intenção confirmada/cancelada/expirada não pode ser reutilizada;
- o cliente busca o resumo autoritativo no servidor antes de confirmar;
- confirmação usa chave de idempotência independente do token público.

Exemplo conceitual:

```text
https://comunhao.app/tesouro/cantina/resgatar?t=<token-aleatorio>
```

## 11. NFC

### 11.1 Decisão do MVP ampliado

NFC não executa o débito. Cada caixa possui uma tag NFC passiva com uma URL e um
`terminal_public_id` fixo. O pedido atual permanece no servidor:

```text
tag NFC → identifica caixa → servidor localiza intenção ativa → membro confirma
```

O mesmo caixa aceita QR Code. Se houver mais de uma intenção, a operação deve
impedir ambiguidade: no MVP, cada caixa terá no máximo uma intenção aguardando
confirmação.

### 11.2 Segurança

- a tag pode ser clonada; por isso ela não autoriza nem contém valor;
- servidor exige membro autenticado, evento aberto, caixa ativo, intenção válida
  e confirmação explícita;
- tela mostra nome do evento/caixa e código curto também visível ao operador;
- aproximações repetidas não criam débitos;
- troca/remoção de tag revoga o `terminal_public_id` no Admin;
- operador não aproxima seu celular para “retirar” Kesef do membro.

### 11.3 Compatibilidade

- Web NFC trabalha com mensagens NDEF e possui disponibilidade limitada a
  navegadores/plataformas compatíveis; exige contexto HTTPS e interação do
  usuário. Não pode ser o único caminho;
- no APK Android, a implementação preferida é um plugin Capacitor local e mínimo
  sobre as APIs NFC nativas, com allowlist de registros NDEF/URLs;
- tags com URL também funcionam como deep link em aparelhos que conseguem abrir
  links NFC, mesmo sem expor Web NFC ao JavaScript;
- iOS deve ser validado em etapa própria com Core NFC/deep links e seus requisitos;
- HCE, telefone-a-telefone e emulação de cartão ficam fora do MVP.

Referências técnicas primárias:

- [W3C Web NFC](https://w3c.github.io/web-nfc/);
- [Android Developers — NFC](https://developer.android.com/develop/connectivity/nfc);
- [Capacitor — criação de plugins](https://capacitorjs.com/docs/plugins/creating-plugins).

## 12. Modelo de dados proposto

### `canteen_events`

`id`, `name`, `type`, `starts_at`, `ends_at`, `reservation_opens_at`,
`reservation_closes_at`, `cancellation_cutoff_at`, `pickup_grace_minutes`,
`no_show_policy_version`, `timezone`, `status`, `location`,
`created_by`, `opened_by`, `closed_by`, `closed_at`, `cancellation_reason`,
`created_at`, `updated_at`.

### `canteen_event_assignments`

`event_id`, `user_id`, `role` (`manager|operator|inventory`), `starts_at`,
`ends_at`, `checkout_id`, `assigned_by`, `revoked_at`, `reason`.

### `canteen_checkouts`

`id`, `event_id`, `name`, `public_id`, `nfc_enabled`, `nfc_tag_version`, `status`,
`active_operator_id`, `created_at`.

### `canteen_contributions`

`id`, `event_id`, `contributor_id`, `source_type`, `declaration_version`,
`notes_private`, `registered_by`, `created_at`.

### `canteen_products`

Modelo reutilizável interno, não anúncio permanente: `id`, `name`, `description`,
`image_url`, `allergens`, `unit`, `active_for_reuse`, `created_by`.

### `canteen_inventory_lots`

`id`, `event_id`, `product_id`, `contribution_id`, `quantity_received`,
`quantity_available`, `expires_at`, `storage_notes`, `status`, `created_by`.

### `canteen_listings`

`id`, `event_id`, `product_id`, `kesef_value`, `display_order`, `status`,
`available_from`, `available_until`, `reservable`, `reservation_limit_per_member`.
Toda leitura pública exige evento anunciado/reservável/aberto e horário vigente.

### `canteen_reservations`

`id`, `event_id`, `member_id`, `status`, `total_kesef`, `hold_id`,
`policy_version`, `pickup_token_hash`, `prepared_at`, `delivered_at`,
`cancelled_at`, `no_show_confirmed_at`, `donated_at`, `handled_by`,
`exception_reason`, `created_at`, `updated_at`.

### `canteen_pickup_authorizations`

`id`, `reservation_id`, `owner_id`, `representative_user_id`,
`representative_name_snapshot`, `status` (`active|revoked|used`), `public_token_hash`,
`authorized_at`, `revoked_at`, `used_at`, `used_by_operator_id`, `exception_reason`.
Somente uma autorização ativa por reserva.

### `canteen_reservation_items`

`reservation_id`, `listing_id`, `inventory_lot_id`, `quantity`, `unit_kesef`,
`total_kesef`. Valores e regras ficam congelados como snapshot.

### `kesef_holds`

`id`, `user_id`, `amount`, `source_type`, `source_id`, `status`
(`active|released|settled`), `expires_at`, `settled_ledger_entry_id`,
`created_at`, `released_at`, `settled_at`. Um índice único impede mais de um hold
ativo para a mesma reserva.

### `canteen_intents`

`id`, `event_id`, `checkout_id`, `operator_id`, `status`, `public_token_hash`,
`expires_at`, `idempotency_key`, `member_id`, `total_kesef`, `confirmed_at`,
`cancelled_at`.

### `canteen_intent_items`

`intent_id`, `listing_id`, `inventory_lot_id`, `quantity`, `unit_kesef`,
`total_kesef`. Valores são snapshots e validados novamente na confirmação.

### `canteen_redemptions`

`id`, `intent_id`, `reservation_id`, `member_id`, `event_id`, `checkout_id`, `operator_id`,
`total_kesef`, `ledger_entry_id`, `status`, `confirmed_at`, `delivered_at`,
`delivered_by`, `reversed_at`, `reversed_by`, `reversal_reason`.

### `canteen_inventory_movements`

Ledger de estoque: `lot_id`, `redemption_id`, `type`, `quantity`,
`balance_before`, `balance_after`, `actor_id`, `reason`, `created_at`.

## 13. Operações transacionais

Além de `canteen_confirm_redemption`, o banco expõe RPCs autoritativas:

- `canteen_create_reservation`: valida janela/limites, bloqueia saldo e lote, cria
  reserva, itens e hold em uma transação;
- `canteen_cancel_reservation`: valida prazo/motivo e libera hold e estoque;
- `canteen_fulfill_reservation`: liquida hold no ledger, baixa estoque e registra
  entrega ao titular ou representante autorizado uma única vez;
- `canteen_authorize_pickup` e `canteen_revoke_pickup`: criam/revogam a autorização
  sem transferir Kesef e sem expor a carteira do titular;
- `canteen_mark_no_show_and_donate`: exige tolerância encerrada, confirmação de
  disponibilidade por operador autorizado, liquida hold e registra a doação;
- `canteen_release_failed_reservation`: libera membro por evento/produto/falha.

### Confirmação de resgate imediato

Uma única RPC `canteen_confirm_redemption` deve:

1. resolver o membro por `auth.uid()`;
2. bloquear membro, intenção, evento e lotes relevantes;
3. validar token/hash, expiração, evento, caixa e status;
4. recalcular itens e total no servidor;
5. verificar saldo Kesef e estoque;
6. criar resgate e itens imutáveis;
7. debitar Kesef com referência ao resgate;
8. baixar lotes e registrar movimentos;
9. marcar intenção como confirmada;
10. emitir evento Realtime após commit;
11. devolver o mesmo resultado em repetição idempotente.

Qualquer erro desfaz tudo. Não existe débito sem estoque nem baixa sem ledger.

## 14. RLS e privacidade

- membro lê eventos/anúncios abertos e apenas seus próprios resgates;
- membro lê somente suas reservas e seus aprovisionamentos;
- representante lê apenas autorizações ativas destinadas a ele e os dados mínimos
  de retirada; não lê carteira, outras reservas ou histórico do titular;
- contribuidor lê apenas suas contribuições, não compradores;
- operador lê somente eventos, caixas e resgates atribuídos;
- gestor lê o domínio Cantina, sem herdar dados pastorais/sensíveis;
- contato do contribuidor não aparece no catálogo;
- relatórios comuns são agregados; consulta nominal exige finalidade operacional;
- tokens, notas privadas e dados de auditoria nunca são públicos;
- policies defendem leitura, enquanto RPCs transacionais controlam escrita.

## 15. Requisitos não funcionais

- confirmação percebida em até 2 segundos em rede saudável;
- operação idempotente sob clique duplo, retry e Realtime duplicado;
- relógio autoritativo do servidor;
- estados offline não podem confirmar resgate;
- QR/NFC expiram com mensagem acionável e regeneração simples;
- botões com alvo mínimo de 44×44 px;
- contraste, foco, leitor de tela e redução de movimento;
- logs sem token bruto, saldo completo ou conteúdo pessoal desnecessário;
- métricas: latência, expiração, falha de estoque, saldo insuficiente, estorno e
  divergência, sem conteúdo sensível.
- jobs enviam lembretes e sinalizam ausências, mas não liquidam Kesef sem a
  confirmação operacional exigida;
- criação concorrente de reservas nunca permite saldo disponível ou estoque
  reservável negativos.

## 16. Critérios de aceite principais

- item some para todos quando evento fecha, mesmo com estoque;
- tentativa após `ends_at` falha no banco, mesmo com tela antiga;
- QR repetido não duplica débito ou estoque;
- NFC clonado não autoriza resgate;
- operador não consegue debitar por outro usuário;
- membro vê saldo anterior/posterior antes de confirmar;
- confirmação atualiza PDV em tempo real;
- falta de NFC sempre oferece QR;
- sobras exigem destinação antes do fechamento operacional completo;
- contribuidor nunca recebe Kesef pelo volume resgatado;
- Charles consegue atribuir e revogar operador no Admin com auditoria;
- função “Responsável pelo resgate” não modifica patente/XP.
- reserva reduz saldo disponível, mas não o saldo total antes da liquidação;
- o mesmo Kesef provisionado não pode ser usado em outro resgate;
- cancelamento no prazo e falha da organização liberam pontos e estoque;
- ausência confirmada liquida uma vez, registra a doação e não permite retirada;
- passagem automática do horário, sem confirmação do operador, não consome Kesef;
- QR e NFC recuperam a mesma reserva e não duplicam entrega.
- representante autorizado retira sem receber Kesef ou acesso à carteira do titular;
- autorização revogada/usada não permite nova retirada;
- nenhuma interface solicita endereço ou oferece entrega domiciliar.

## 17. Decisões abertas

1. Prazo final de expiração do QR: proposta de 90 segundos.
2. O membro pode montar o próprio carrinho ou somente o operador no MVP?
   Recomendação: operador monta; reduz fila dupla e divergência de estoque.
3. Como atender membro sem aparelho? Requer fluxo assistido separado e aprovação
   de segurança; não usar débito administrativo silencioso.
4. Prazo de cancelamento e tolerância de retirada por tipo de evento. Proposta
   inicial: cancelar até o início do evento e tolerância configurável de 30 minutos.
5. Quais informações alimentares são obrigatórias conforme operação/localidade?
6. Qual política de estorno depois de item entregue?
7. O nome do contribuidor será visível? Recomendação: não por padrão; somente com
   consentimento e finalidade comunitária clara.
8. Destino padrão dos itens de ausência e quem pode recebê-los sem exposição de
   dados pessoais. Proposta: distribuição comunitária registrada de forma agregada.
