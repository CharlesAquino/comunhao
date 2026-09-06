# Plano de implementação — Cantina Kesef

**Base:** ADR-003 + SPEC-003 + `PLANO_ACAO_CALIBRACAO_ECONOMIA_KESEF_CANTINA.md`  
**Criado em:** 11/08/2026  
**Atualizado em:** 14/08/2026  
**Estado:** MVP funcional no ambiente remoto; pendem E2E autenticado, automações, Realtime, QA móvel e publicação de release

## Estado atual — 14/08/2026

### Escopo implementado

#### Administração e eventos

- Charles possui o papel administrativo `gestor_cantina`, separado de patente e XP.
- Eventos possuem nome, tipo, local, início, fim, janela de reservas, prazo de
  cancelamento, tolerância e estado operacional.
- O gestor pode criar, editar e publicar eventos; eventos encerrados ou cancelados
  não podem ser editados.
- A edição atualiza os períodos dos anúncios e gera registro no
  `admin_audit_log`.
- O estado do evento é sincronizado durante a leitura da vitrine: anunciado,
  reservas abertas/encerradas, aberto ou encerrado.

#### Produtos, anúncios e estoque

- Produto-base e anúncio eventual são entidades distintas.
- Cada anúncio pertence a um evento e possui valor Kesef, estoque, limite por
  membro e cota reservável próprios.
- Cadastro inclui nome, descrição, imagem WebP, unidade, alergênicos, origem,
  validade e conservação.
- Anúncios nascem em rascunho e somente aparecem após `Publicar vitrine`.
- A vitrine aparece em `Tesouro → Cantina`, agrupada por evento, e deixa de ser
  retornada após o fim do evento, mesmo com estoque remanescente.
- Movimentos de entrada, reserva, liberação e resgate são registrados com saldo
  anterior, posterior e responsável.

#### Reserva antecipada

- O membro consulta detalhes e reserva durante a janela configurada.
- Criação usa lock, idempotência, limite por membro, cota reservável, saldo e
  estoque na mesma transação.
- A reserva gera código e QR de retirada e aparece em `Meus resgates`.
- Cancelamento dentro do prazo devolve estoque e Kesef.
- O titular pode autorizar um representante por username.
- Após o evento, o operador pode marcar ausência e destinar o item à doação; o
  Kesef permanece resgatado e a ação é auditada.

> **Decisão técnica atual:** o chamado “aprovisionamento” é representado por um
> débito imediato no `kesef_ledger`, com estorno no cancelamento. Não existe ainda
> uma tabela `kesef_holds` nem separação visual entre saldo total, provisionado e
> disponível. Antes de ampliar o módulo, decidir se este modelo permanece ou se
> será migrado para holds reais.

#### Resgate imediato e PDV

- O operador monta um carrinho com múltiplos anúncios no Admin.
- O servidor bloqueia estoque e cria uma solicitação com código e TTL de cinco
  minutos.
- O operador apresenta QR ou código; o membro autoriza exclusivamente pela
  `Carteira Kesef`.
- A Carteira oferece `Ler QR Code`, `Resgatar com código` e a opção NFC com
  detecção real de suporte.
- Antes da confirmação são exibidos itens, quantidades, total, saldo atual e saldo
  posterior.
- Confirmação debita o ledger e vincula usuário, horário, operador, evento e itens.
- Cancelamento ou expiração libera o estoque. A limpeza automática hoje é
  oportunística: executada quando RPCs relacionadas são chamadas.
- O QR não contém saldo nem dados pessoais; apenas tipo e identificador/código da
  solicitação. A autoridade continua no servidor.

#### Retirada e relatórios

- Operadores autorizados consultam a fila, buscam por código/nome/username/produto
  e confirmam a retirada dentro da janela operacional.
- Reuso de código e transições inválidas são recusados no banco.
- O relatório protegido por `canteen.reports.read` reúne resgates imediatos,
  reservas retiradas e reservas doadas.
- O painel mostra operações únicas, unidades, Kesef, usuário, produto, data/hora,
  operador e representante, com busca, filtro por origem/evento e exportação CSV.
- Horários são armazenados como `timestamptz` e exibidos em
  `America/Sao_Paulo`.

### Migrations da Cantina aplicadas remotamente

| Migration | Entrega principal |
|---|---|
| `20260811123000` | papéis, permissões, eventos, equipe e métricas |
| `20260811223000` / `224000` | correções das métricas e Gini |
| `20260813203000` | produtos, contribuições, lotes, anúncios e imagens |
| `20260813210000` / `211000` | publicação e vitrine pública eventual |
| `20260813213000` | reservas, débito/aprovisionamento e cancelamento |
| `20260813220000` | retirada presencial e auditoria |
| `20260813223000` | PDV e resgate imediato com TTL |
| `20260813224500` | representante e ausência/doação |
| `20260813225500` | edição auditada de evento |
| `20260813231000` / `232000` | sincronização de status e correção da vitrine |
| `20260814100000` | relatório administrativo e CSV |

### Validação executada

- build Vite aprovado após as entregas;
- suíte atual: 35 arquivos e 167 testes aprovados;
- migrations alinhadas no Supabase remoto;
- RPC da vitrine verificada depois da correção `42702`;
- lint sem erros novos; permanecem avisos preexistentes fora do módulo;
- teste operacional completo com dois aparelhos ainda não executado.

## Pendências para produção — ordem recomendada

### P0 — Integridade e teste obrigatório

- [ ] Criar testes SQL/pgtap para locks, saldo exato, estoque unitário, repetição,
  expiração, cancelamento e transições de estado.
- [ ] Criar E2E autenticado com gestor, operador e dois membros sintéticos.
- [ ] Executar roteiro real com dois celulares: carrinho → QR/código → confirmação
  → retorno ao caixa → relatório.
- [ ] Testar duas reservas e dois resgates simultâneos no último item.
- [ ] Decidir formalmente entre débito imediato da reserva e `kesef_holds` reais;
  alinhar textos e saldo da Carteira à decisão.
- [ ] Criar unicidade explícita no ledger por resgate/reserva e testar estorno
  duplicado.
- [ ] Adicionar rate limit e auditoria de tentativas inválidas de código.

### P1 — Operação confiável

- [ ] Atualizar o PDV via Supabase Realtime quando o membro confirmar, expirar ou
  cancelar, com retorno visual e sonoro.
- [ ] Agendar limpeza de solicitações expiradas, sem depender de novo acesso.
- [ ] Agendar ciclo de eventos e anúncios, mantendo os filtros de horário como
  barreira de segurança.
- [ ] Criar encerramento formal do evento com reconciliação do estoque físico,
  sobras, descarte e novo lote quando aplicável.
- [ ] Implementar estorno excepcional, de uso único, autorizado e auditado.
- [ ] Exigir confirmação explícita de disponibilidade antes de registrar ausência.

### P2 — Produto e UX

- [ ] Substituir `window.prompt` do representante por busca e confirmação em tela
  própria, incluindo revogação.
- [ ] Criar comprovante pessoal de resgate imediato e histórico semântico na
  Carteira (`Cantina`, produto/evento), em vez do rótulo genérico da lojinha.
- [ ] Paginar relatório e adicionar período/status quando o volume crescer.
- [ ] Implementar leitor QR do operador para códigos de retirada de reservas.
- [ ] Refinar PDV para o layout de maquininha aprovado, incluindo sucesso,
  falha, timeout e retomada após perda de rede.
- [ ] Adicionar acessibilidade, estados offline/rede lenta e mensagens de erro por
  código de domínio.

### P3 — NFC e dispositivos

- [ ] Validar câmera/`BarcodeDetector` nos navegadores e celulares-alvo; manter
  código manual como fallback obrigatório.
- [ ] Fazer prova com tags NFC NDEF em Chrome Android/PWA e APK.
- [ ] Criar plugin Capacitor se Web NFC não for estável no APK.
- [ ] Não tratar aproximação telefone-a-telefone como disponível: navegador não
  oferece emulação de cartão NFC e iOS possui limitações adicionais.
- [ ] Implementar allowlist, rotação e revogação das tags físicas antes de uso.

### P4 — Governança e release

- [ ] Aprovar procedimento sanitário, alergênicos, validade, conservação e descarte.
- [ ] Formalizar retenção dos registros, acesso/exportação e resposta a incidente.
- [ ] Executar piloto curto com estoque pequeno, duas contas sintéticas e plano de
  reversão.
- [ ] Fazer QA autenticado Android/web, gerar release web/APK e publicar no host.
- [ ] Monitorar ruptura, tempo de atendimento, falhas, saldo insuficiente e
  drenagem Kesef antes de alterar valores.

## Roteiro futuro — teste com dois celulares

1. No Admin, selecionar um evento aberto e confirmar estoque publicado.
2. No celular do operador, montar o pedido e tocar em `Solicitar confirmação`.
3. No celular do membro, abrir `Carteira → Resgatar com Kesef`.
4. Ler o QR ou digitar o código de seis caracteres.
5. Conferir itens, quantidades, total e saldo posterior; confirmar.
6. Verificar débito único no ledger e baixa única no estoque.
7. Atualizar o PDV manualmente enquanto Realtime não estiver implementado.
8. Conferir usuário, horário, quantidades e operador no relatório/CSV.
9. Repetir código e confirmar que o servidor rejeita replay.
10. Repetir com saldo insuficiente, cancelamento e expiração de cinco minutos.

## Estratégia

A Cantina será um domínio novo dentro da experiência do Tesouro. Reutiliza o
ledger Kesef e a governança administrativa, mas não reutiliza `loja_itens` e
`loja_pedidos` como fonte canônica: catálogo permanente e evento efêmero possuem
ciclos, estoque e entrega diferentes.

## Sequência executiva

| Fase | Entrega | Dependência | Gate |
|---|---|---|---|
| C0 | decisões econômica, pastoral, sanitária e operacional | nenhuma | ADR aprovada |
| C1 | papéis, permissões e modelo de eventos | C0 | testes SQL/RLS |
| C2 | estoque por lote e anúncios efêmeros | C1 | fechamento esconde tudo |
| C3 | reservas antecipadas + aprovisionamento Kesef | C2 | concorrência e cancelamento aprovados |
| C4 | PDV + intenção + QR Code | C2–C3 | pedido autoritativo e expiração |
| C5 | confirmação/liquidação transacional Kesef | C4 | concorrência/idempotência aprovadas |
| C6 | interfaces + NFC por tag de caixa | C3–C5 | QA autenticado e fallback QR |
| C7 | piloto controlado e observabilidade | todas | decisão go/no-go |

## C0 — Fechar decisões

- [ ] Aprovar formalmente Kesef como benefício fechado, sem transferência/saque.
- [ ] Aprovar nomenclatura: contribuição, anúncio, resgate, operador e gestor.
- [ ] Confirmar Charles como `gestor_cantina` e definir substituto autorizado.
- [ ] Definir quem pode registrar contribuições e quais comprovantes são necessários.
- [ ] Definir alimentos permitidos, alergênicos, validade, conservação e descarte.
- [ ] Validar o fluxo com contador/assessoria jurídica e vigilância sanitária local.
- [ ] Definir política de estorno, falta de aparelho e conflitos na entrega.
- [ ] Aprovar prazo de cancelamento, tolerância, lembretes e destino de item não retirado.
- [ ] Aprovar procedimento excepcional para representante que não possui conta.
- [ ] Medir emissão Kesef e projetar valores iniciais sem usar cotação em reais.
- [ ] Executar os gates E0–E3 do plano de calibração antes de publicar qualquer
  valor de item em Kesef.

## C1 — Fundação de segurança e eventos

- [x] Migration aditiva local de papéis `gestor_cantina` e `operador_cantina`.
- [x] Criar permissões granulares `canteen.*` e atualizar tipos TypeScript.
- [ ] Seed/atribuição auditada de Charles como gestor, usando o ID remoto confirmado;
  nunca identificar por nome ou telefone em migration genérica.
- [x] Criar fundação local de eventos, atribuições e políticas RLS; caixas ficam na
  próxima migration, junto do PDV.
- [ ] Criar RPCs de ciclo de vida com versão esperada, idempotência e auditoria.
- [ ] Criar job de encerramento, mantendo `ends_at` como barreira no banco mesmo se
  o job atrasar.
- [ ] Testar operador fora do turno, evento expirado e revogação em sessão ativa.

### Entrega local de 11/08/2026

- migration `20260811123000_cantina_fundacao_e_metricas_kesef.sql` criada;
- módulo Admin `Cantina e economia` criado;
- criação de evento em rascunho, sem anúncios ou valores;
- painel agregado das últimas 12 semanas: emissão, segmentos, saldos,
  concentração e drenagem;
- build aprovado e 35 arquivos/167 testes aprovados;
- implantação remota e teste SQL/RLS autenticado ainda pendentes.

## C2 — Contribuições, lotes e anúncios temporários

- [x] Criar produtos reutilizáveis internos, contribuições, lotes, anúncios e
  movimentos de estoque.
- [x] Criar bucket próprio `cantina-produtos`, com imagens WebP e escrita restrita
  a `canteen.inventory.manage`.
- [ ] Criar formulário de contribuição com declaração versionada.
- [x] Criar entrada inicial de lote com motivo, responsável e auditoria; ajustes
  posteriores ainda pendentes.
- [ ] Consultas públicas retornam anúncio apenas durante sua janela prévia ou evento.
- [ ] Fechamento exige destinação de sobras e encerra todos os anúncios.
- [ ] Testar virada de horário, fuso de São Paulo, pausa e estoque remanescente.

### Entrega remota de 13/08/2026

- produto-base separado do anúncio do evento;
- valor Kesef, quantidade, limite por membro e cota reservável pertencem ao anúncio;
- criação integrada de descrição, imagem, origem, lote e anúncio em rascunho;
- o mesmo produto pode receber valores e estoques diferentes em eventos futuros;
- nenhum anúncio é publicado automaticamente após o cadastro;
- migration `20260813203000` aplicada remotamente;
- build e 35 arquivos/167 testes aprovados.

## C3 — Reservas e aprovisionamento Kesef

- [ ] Criar reservas, itens, `kesef_holds` e snapshots da política aceita.
- [ ] Calcular `saldo disponível = ledger - holds ativos` em consulta canônica.
- [ ] Implementar criação atômica: reservar estoque e Kesef ou não criar nada.
- [ ] Implementar cancelamento no prazo, cancelamento do evento e indisponibilidade.
- [ ] Implementar liquidação na entrega e doação por ausência confirmada.
- [ ] Criar autorização de retirada por terceiro, revogável e vinculada à reserva.
- [ ] Criar limites por membro/item e impedir saldo/estoque disponível negativo.
- [ ] Agendar lembretes sem permitir que jobs debitem Kesef automaticamente.
- [ ] Testar duas reservas simultâneas, duplo clique, cancelamento concorrente,
  evento cancelado, falta de produto e política versionada.
- [ ] Testar representante autorizado, revogado, já utilizado e sem acesso à carteira.

## C4 — PDV e QR Code

- [ ] Criar modo Cantina dentro do Admin e tela de PDV responsiva.
- [ ] Criar carrinho local somente como rascunho; servidor cria a intenção final.
- [ ] Criar token aleatório, armazenar hash, TTL e limite de uma intenção ativa por
  caixa no MVP.
- [ ] Renderizar QR com deep link e fallback copiável sem expor conteúdo sensível.
- [ ] Criar rota autenticada `/tesouro/cantina/resgatar`.
- [ ] Exibir resumo buscado do servidor e saldo posterior.
- [ ] Expirar/cancelar intenção e liberar reserva de estoque de modo idempotente.
- [ ] Testar screenshot, token adulterado, expirado, reutilizado e caixa concorrente.

## C5 — Confirmação e ledger

- [ ] Implementar `canteen_confirm_redemption` em uma única transação.
- [ ] Adicionar tipo de ledger específico, por exemplo `cantina_resgate`, mantendo
  quantidade negativa e referência ao resgate.
- [ ] Definir unicidade por resgate no ledger.
- [ ] Bloquear usuário/lotes para impedir saldo ou estoque negativo.
- [ ] Criar estorno transacional que devolve Kesef somente uma vez e define se o
  estoque retorna ao lote.
- [ ] Publicar Realtime somente após commit.
- [ ] Testes SQL de duas confirmações simultâneas, retry, estoque unitário, saldo
  exato, evento fechando e estorno duplicado.
- [ ] Garantir unicidade entre liquidação de reserva e resgate imediato.
- [ ] Exigir confirmação de disponibilidade/preparo antes de marcar ausência.

## C6 — Interfaces e NFC

### Membro

- [ ] Subaba Cantina no Tesouro; estados fechada, programada, aberta e pausada.
- [ ] Leitura QR, opção NFC quando suportada e fallback.
- [ ] Confirmação, comprovante e histórico pessoal.
- [ ] Estado anunciado, reserva antecipada e seção `Meus pedidos`.
- [ ] Carteira com saldo total, provisionado e disponível.
- [ ] Cancelamento no prazo, lembretes e código de retirada QR/NFC.
- [ ] Escolha `Eu vou retirar` ou `Outra pessoa vai retirar` em Meus pedidos.

### Operador

- [ ] PDV com botões grandes, carrinho, estoque e intenção ativa.
- [ ] Confirmação Realtime e entrega por código curto.
- [ ] Filas separadas de reservas e resgates na hora; preparo, entrega e ausência.
- [ ] Conferência do titular/representante sem compartilhamento de conta ou senha.
- [ ] Insígnia funcional temporária “Responsável pelo resgate”.

### Contribuidor

- [ ] Registro/conferência de contribuição e lote.
- [ ] Declaração de ausência de conversão/remuneração em Kesef.
- [ ] Comprovante e destinação de sobras, sem dados de compradores.

### Charles/gestor

- [ ] Dashboard geral, criação de evento, equipe/turnos, caixas e tags.
- [ ] Estoque, sobras, auditoria, cancelamentos, estornos e relatórios.
- [ ] Gestão de papéis no Admin usando as primitives já existentes.
- [ ] Configuração de janela, limites, tolerância, regra de ausência e exceções.

### NFC

- [ ] Prova técnica com tags NDEF contendo deep link HTTPS e identificador público
  de caixa.
- [ ] Validar leitura em Chrome Android/PWA, APK Android e aparelhos-alvo reais.
- [ ] Criar plugin Capacitor local se Web NFC não atender o APK com estabilidade.
- [ ] Adicionar allowlist de URL/registro NDEF e mensagens de permissão/indisponibilidade.
- [ ] Implementar resolução servidor `checkout public id → intenção ativa`.
- [ ] Revogar/rotacionar tag pelo Admin e registrar versão física.
- [ ] Testar tag clonada, caixa inativo, evento encerrado, duas aproximações e
  ausência de NFC.
- [ ] Só depois avaliar iOS/Core NFC e telefone-a-telefone; não bloquear o piloto.

## C7 — Piloto

- [ ] Executar E4 do plano de calibração econômica durante o piloto.
- [ ] Usar um evento curto, um caixa, dois operadores e poucos itens não críticos.
- [ ] Criar contas de teste e dados sintéticos antes do evento real.
- [ ] Ensaiar abertura, resgate QR, NFC, expiração, estorno e fechamento.
- [ ] Conferir estoque físico versus movimentos do sistema.
- [ ] Medir tempo de atendimento, falhas, saldo insuficiente e desistências.
- [ ] Coletar feedback separado de membro, operador, contribuidor e gestor.
- [ ] Revisar valores Kesef somente por dados de circulação, nunca por equivalência
  direta com reais.
- [ ] Registrar `go/no-go` para ampliar a outros eventos.

## Estratégia de testes

- unitários: estados, expiração, mensagens e cálculo de total;
- componentes: carrinho, confirmação, fallback QR/NFC e acessibilidade;
- SQL/pgtap: RLS, permissões, locks, idempotência, ledger e estoque;
- E2E autenticado: gestor, operador, dois membros e contribuidor, incluindo reserva;
- dispositivo: câmera, NFC, deep link, modo avião, rede lenta e retomada;
- carga curta: múltiplos resgates simultâneos no intervalo do culto;
- segurança: replay, token adivinhado/clonado, troca de caixa e operador revogado.

## Definition of Done

- ADR e decisões abertas aprovadas;
- nenhuma tela ou relatório sugere conversão Kesef/real;
- papéis administrativos não alteram patente/XP;
- evento encerrado não expõe nem permite resgate de item;
- QR e NFC levam ao mesmo resumo autoritativo;
- QR continua funcionando em todo aparelho suportado;
- confirmação é atômica e idempotente;
- aprovisionamento impede gasto duplo sem antecipar o débito;
- ausência nunca é liquidada sem confirmação de disponibilidade pelo operador;
- retirada por terceiro é auditada sem transferir Kesef ou expor a carteira;
- nenhuma tela ou processo oferece entrega domiciliar;
- RLS prova isolamento entre membro, contribuidor, operador e gestor;
- sobras possuem destinação auditada;
- piloto reconcilia ledger, resgates e estoque físico;
- documentação operacional, rollback e resposta a incidente estão publicadas.

## Riscos prioritários

| Risco | Mitigação |
|---|---|
| Kesef adquirir equivalência informal com real | proibir conversão, P2P e preço indexado |
| operador debitar sem consentimento | confirmação exclusiva do membro autenticado |
| estoque ser reservado acima do disponível | locks e aprovisionamento transacional |
| membro perder Kesef por falha/ausência mal apurada | hold, lembretes, tolerância, confirmação e exceção auditada |
| Kesef provisionado ser gasto duas vezes | saldo disponível canônico e locks no banco |
| terceiro retirar sem autorização | autorização por reserva, revogação, uso único e conferência no servidor |
| retirada ser confundida com delivery | linguagem, escopo e ausência de coleta de endereço |
| QR/tag clonados | identificador sem autoridade, TTL, status e confirmação |
| NFC incompatível | QR obrigatório e feature detection |
| itens permanecerem após evento | filtro no banco por status + horário |
| patente confundida com permissão | papéis `canteen.*` separados de XP |
| sobra migrar sem rastreio | destinação obrigatória e novo lote explícito |
| alimento impróprio/alergênico | lote, validade, conservação e processo sanitário |
| Charles virar ponto único de falha | substituto auditado e delegação por turno |
