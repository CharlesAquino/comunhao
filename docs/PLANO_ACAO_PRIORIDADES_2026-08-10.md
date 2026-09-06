# Plano de ação das prioridades pós-dev.20

**Criado em:** 10/08/2026  
**Linha de referência:** `1.4.0-dev.20` / `versionCode 14020`  
**Status:** plano vigente; execução ainda não iniciada  
**Escopo:** segurança documental, Editorial EBD, privacidade, QA mobile e saúde técnica

Este plano converte os achados da auditoria de 10/08 em uma sequência de entrega.
Ele não declara como concluído nenhum trabalho remoto que não tenha evidência.

## Resultado esperado

Ao final, o aplicativo deve:

- entregar somente a lição cuja vigência contém a data corrente;
- permitir que a semana publicada permaneça estável enquanto cada dia futuro
  continua editável e publicável de forma independente;
- persistir progresso EBD privado no servidor, sob RLS, sem vazamento entre
  lições ou versões;
- tratar domingo por um contrato editorial explícito;
- possuir procedimentos operacionais verificáveis de privacidade e incidentes;
- ter a `dev.20` validada em sessão autenticada no mobile;
- ter a função `buscar-memoria-rag` reconciliada com o workspace oficial;
- encerrar os avisos conhecidos de hooks, bundle e texto legado.

## Regras de execução

1. Cada item só muda para concluído com evidência anexada no documento de sessão
   ou no PR: teste, captura, consulta remota, log ou decisão aprovada.
2. Migration local não prova schema remoto. Deploy local não prova função remota.
3. Mudança de contrato EBD exige migration reversível/aditiva, teste SQL, teste
   de serviço e cenário autenticado antes da remoção do caminho antigo.
4. Dados privados de progresso não usam `localStorage` como fonte canônica;
   cache local, quando existir, é apenas uma réplica identificada por usuário,
   lição e versão.
5. Documentos com dados pessoais ou credenciais não devem reproduzir valores
   reais, mesmo em exemplos ou evidências de incidente.
6. As definições jurídicas devem receber revisão profissional antes de abertura
   pública ampla. Este plano organiza a operação, mas não substitui parecer legal.

## Ordem crítica

```text
0. conter credencial possivelmente exposta
   -> 1. fechar decisões de produto e contratos
   -> 2. vigência semanal
   -> 3. separar semana e dias
   -> 4. progresso remoto + RLS
   -> 5. domingo especial
   -> 6. privacidade operacional
   -> 7. QA mobile autenticado
   -> 8. RAG e dívida técnica
   -> 9. regressão e liberação
```

As fases 6 e 8 podem avançar em paralelo depois da fase 1, mas não retiram os
gates das fases 2 a 5. O QA final deve usar o modelo de dados definitivo.

## Quadro executivo

| Fase | Prioridade | Entrega | Dependência | Gate de saída |
|---|---|---|---|---|
| 0 | P0 imediato | Contenção da credencial | nenhuma | rotação ou invalidação comprovada |
| 1 | P0 | Decisões e contratos aprovados | fase 0 iniciada | ADR/spec sem questões bloqueantes |
| 2 | P0 | Vigência semanal canônica | fase 1 | lição futura não substitui a atual |
| 3 | P0 | Publicação de semana e dia separadas | fase 2 | rascunho futuro editável após publicação |
| 4 | P0 | Progresso remoto com RLS | fases 2 e 3 | isolamento autenticado provado |
| 5 | P1 | Domingo especial | fases 1 e 3 | regra editorial e renderização aprovadas |
| 6 | P0/P1 | Governança de privacidade | fase 1 | procedimentos, responsáveis e SLAs aprovados |
| 7 | P1 | QA mobile autenticado da dev.20+ | fases 2 a 6 | `design-qa.md` deixa de estar bloqueado |
| 8 | P1/P2 | RAG reconciliado e avisos corrigidos | fase 1 | metadado remoto e checks técnicos limpos |
| 9 | P0 | Regressão, observabilidade e release | todas | decisão explícita de liberar ou não liberar |

## Fase 0 — Contenção de credencial e registro do incidente

**Objetivo:** eliminar primeiro a possibilidade de uso de uma senha real exposta
em documentação histórica.

### Ações

- [ ] Identificar, sem copiar o segredo para novos documentos, a conta e todos os
  ambientes em que a senha redigida poderia ter sido reutilizada.
- [ ] Se não for possível provar que a senha já está inválida, rotacioná-la
  imediatamente em todos os ambientes aplicáveis e revogar sessões/tokens ativos.
- [ ] Verificar logs de autenticação e ações administrativas no intervalo entre a
  primeira exposição conhecida e a rotação; preservar evidências sem dados
  pessoais desnecessários.
- [ ] Confirmar por busca que telefone e senha não permanecem em arquivos ativos,
  cópias, artefatos de release ou histórico acessível. Não imprimir os valores no
  terminal ou relatório.
- [ ] Abrir registro mínimo do incidente: descoberta, provável origem, alcance,
  contenção, impacto observado, responsável, datas e decisão de comunicação.
- [ ] Registrar a lição aprendida: exemplos usam dados sintéticos; documentação e
  releases passam por verificação automática de segredos.

### Critérios de aceite

- a credencial está comprovadamente inválida ou rotacionada;
- sessões derivadas foram avaliadas e, quando cabível, revogadas;
- não há valor real reaparecendo em documentação ativa;
- existe dono e trilha de decisão do incidente.

> **Gate:** nenhuma publicação ampla deve ocorrer enquanto a validade da senha
> permanecer desconhecida.

## Fase 1 — Fechar contratos e decisões de produto

**Objetivo:** evitar que migrations e UI cristalizem decisões implícitas.

### Decisões obrigatórias

- [ ] Definir a semana canônica da EBD: timezone `America/Sao_Paulo`, início,
  término inclusivo/exclusivo e comportamento exato na virada.
- [ ] Definir se uma semana pode ser antecipada, substituída ou arquivada e quem
  possui cada permissão.
- [ ] Escolher o modelo de publicação: documento de trabalho + snapshots públicos
  imutáveis (preferido) ou estado independente por dia.
- [ ] Definir domingo especial: propósito, tipos de bloco permitidos, obrigatórios,
  recompensa, conclusão, disponibilidade e fallback quando não for produzido.
- [ ] Definir se progresso acompanha `lesson_id + published_version` ou uma
  identidade estável de bloco entre versões. A regra de migração de progresso em
  republicação deve ser explícita.
- [ ] Definir responsáveis por privacidade: controlador, operador(es), canal do
  titular, aprovador pastoral e responsável por incidentes.

### Artefatos

- ADR do modelo editorial e da vigência;
- spec do progresso remoto e matriz de RLS;
- contrato do domingo especial com exemplos válidos e inválidos;
- matriz RACI resumida de privacidade e incidentes.

### Critério de aceite

Não há questão aberta capaz de alterar schema, identidade do progresso, regra de
liberação ou experiência de domingo.

## Fase 2 — Vigência semanal real da EBD

**Objetivo:** impedir que conteúdo futuro publicado antecipadamente substitua a
lição corrente.

### Implementação

- [ ] Adicionar vigência canônica (`valid_from`, `valid_until`) à entidade ou ao
  snapshot público, com timezone e semântica documentados.
- [ ] Criar restrição no banco contra intervalos publicados sobrepostos. Tratar
  explicitamente registros históricos antes de tornar a restrição obrigatória.
- [ ] Criar RPC transacional para publicar/ativar uma vigência, com permissão,
  versão esperada, idempotência e auditoria.
- [ ] Trocar `getPublishedEditorialLesson()` de “maior número publicado” para
  “intervalo que contém agora”. Número passa a ser ordenação editorial, não
  critério de vigência.
- [ ] Definir retorno para nenhuma lição vigente, falha de rede e cache offline;
  cache expirado não pode se apresentar silenciosamente como atual.
- [ ] Observar a virada semanal e registrar qual snapshot foi selecionado.

### Testes mínimos

- SQL: intervalo anterior, atual, futuro, fronteiras e tentativa de sobreposição;
- serviço: atual vence a futura mesmo quando a futura tem número maior;
- timezone: sábado/domingo e virada no horário de São Paulo;
- Realtime/offline: nova semana aparece somente quando sua vigência começa;
- rollback: publicação inválida não remove a semana corrente.

### Critério de aceite

Com duas semanas publicadas — uma corrente e outra futura — todos os clientes
continuam recebendo a corrente até a fronteira definida.

## Fase 3 — Separar publicação da semana e publicação de cada dia

**Objetivo:** preservar uma versão pública estável sem bloquear a produção dos
dias futuros.

### Implementação

- [ ] Introduzir documento de trabalho editável separado dos snapshots públicos,
  ou entidades de publicação por dia conforme a ADR da fase 1.
- [ ] Modelar status, versão, `published_at`, `published_by` e `unlocks_at` por dia.
- [ ] Fazer “publicar semana” validar e criar atomicamente o snapshot semanal.
- [ ] Fazer “publicar dia” validar apenas o dia e atualizar sua publicação sem
  transformar o documento de trabalho inteiro em imutável.
- [ ] Manter dias ainda não publicados invisíveis ao leitor, mas editáveis no
  Estúdio.
- [ ] Aplicar controle otimista ao salvamento normal e mensagens acionáveis de
  conflito entre editores.
- [ ] Desativar/revogar RPCs legadas ambíguas após migração e prova de ausência de
  consumidores.
- [ ] Ajustar Realtime e cache para invalidar somente os escopos afetados.

### Cenários de aceite

- publicar segunda não impede editar terça;
- republicar terça não altera segunda nem a vigência da semana;
- publicar a semana incompleta falha com indicação dos campos/dias inválidos;
- dois editores não sobrescrevem silenciosamente o trabalho um do outro;
- uma falha intermediária não deixa status público e snapshot divergentes;
- rollback recupera a última publicação sem apagar histórico.

## Fase 4 — Progresso EBD remoto, privado e testado

**Objetivo:** tornar o servidor a fonte canônica do progresso e impedir vazamento
entre usuários, lições e versões.

### Modelo e segurança

- [ ] Criar tabela de progresso com, no mínimo, usuário interno, lição, versão
  publicada, dia/bloco, estado permitido e timestamps; aplicar unicidade e FKs.
- [ ] Resolver usuário sempre por `auth.uid() -> usuarios.auth_user_id -> usuarios.id`.
- [ ] Habilitar RLS: membro lê/escreve apenas o próprio progresso; acesso pastoral
  agregado ou individual exige finalidade e permissão explicitamente aprovadas.
- [ ] Preferir RPC idempotente para conclusão/recompensa, garantindo que progresso,
  Kesef e XP não sejam parcialmente aplicados.
- [ ] Não persistir respostas sensíveis em analytics, logs, toast ou chave genérica
  de cache.
- [ ] Identificar cache por `user_id:lesson_id:version` e limpar estado na troca de
  usuário, lição ou versão; renderizar `EbdJourney` com identidade equivalente.

### Testes autenticados obrigatórios

- usuário A cria/lê seu progresso;
- usuário A não lê nem altera o progresso de B;
- usuário anônimo não acessa progresso;
- admin sem permissão específica não recebe acesso implícito;
- refresh, logout/login e troca de conta não misturam estado;
- Realtime troca lição/versão sem carregar IDs antigos;
- cliques repetidos não duplicam conclusão nem recompensa;
- operação offline reconcilia sem sobrescrever um estado remoto mais novo;
- IDs obsoletos não satisfazem o critério de conclusão atual.

### Critério de aceite

Teste E2E com duas contas reais de teste prova isolamento, retomada após refresh e
idempotência. A suíte deve limpar somente os dados sintéticos que criou.

## Fase 5 — Formato especial de domingo

**Objetivo:** entregar um domingo intencional, e não um sétimo dia improvisado.

### Proposta para decisão

Usar domingo como **encontro e síntese da semana**, com conteúdo mais curto:

1. acolhida e texto-chave;
2. síntese dos seis dias;
3. pergunta de partilha/reflexão;
4. prática comunitária ou oração;
5. encerramento e próxima semana.

Essa proposta precisa de aprovação pastoral. A aprovação também deve definir se
domingo possui quiz, resposta privada, presença, recompensa e conclusão própria.

### Implementação após aprovação

- [ ] Criar schema/validador específico, sem depender de quantidade fixa de blocos.
- [ ] Dar ao Estúdio indicação visual e preview próprios para domingo.
- [ ] Renderizar fallback acolhedor quando a semana não tiver domingo publicado.
- [ ] Garantir acessibilidade de mídia, campos e ações.
- [ ] Cobrir domingo publicado, ausente, futuro, revisado e concluído em testes.

### Critério de aceite

Produto/pastoral aprovam conteúdo e regras; editor, leitor, progresso e recompensa
obedecem ao mesmo contrato.

## Fase 6 — Privacidade, menores, consentimentos e incidentes

**Objetivo:** converter o texto legal versionado da dev.20 em operação verificável.

### Entregas

- [ ] Matriz de dados: categoria, finalidade, base legal, sensibilidade, origem,
  acesso, compartilhamento, retenção ativa, backup, descarte e evidência.
- [ ] Política de retenção e exclusão com prazos por tabela/storage/log/backup,
  exceções legais, anonimização e prova de execução.
- [ ] Procedimento de direitos do titular com canal, autenticação proporcional,
  triagem, responsável, SLA, busca, exportação, correção, revogação, exclusão,
  contestação e encerramento auditável.
- [ ] Plano de resposta a incidentes: classificação, contenção, preservação de
  evidência, análise de risco, escalonamento, comunicação, recuperação e
  retrospectiva.
- [ ] Procedimento de menores: faixa etária, melhor interesse, responsabilidade
  parental, verificação/registro da autorização, revogação e restrições de recurso.
- [ ] Consentimentos granulares e versionados no ponto de coleta para finalidades
  que realmente dependam de consentimento, especialmente saúde, pedido de oração
  sensível e acompanhamento pastoral.
- [ ] UI para consultar e revogar cada consentimento sem invalidar os demais;
  recusa não deve bloquear recursos sem necessidade comprovada.
- [ ] Inventário de operadores, contratos, localização e transferência
  internacional; registrar a decisão de cada integração.
- [ ] Revisão jurídica e pastoral dos documentos e procedimentos antes da
  expansão pública.

### Testes e exercícios

- executar uma solicitação sintética de acesso e uma de exclusão ponta a ponta;
- simular revogação de consentimento granular;
- realizar exercício de mesa do incidente de credencial da fase 0;
- provar expurgo ou anonimização em ativo, storage e ciclo de backup documentado.

### Critério de aceite

Cada obrigação tem dono, prazo, entrada, saída, evidência e caminho de exceção;
não permanece apenas como parágrafo no aviso de privacidade.

## Fase 7 — QA mobile autenticado da dev.20+

**Objetivo:** retirar o bloqueio atual de `design-qa.md` com evidência em sessão
autenticada no dispositivo-alvo.

### Preparação

- [ ] Usar build development instalado por atualização direta e registrar versão,
  `versionCode`, aparelho, Android, viewport/densidade, rede e conta de teste.
- [ ] Preparar uma lição sintética completa, uma futura e estados de progresso.
- [ ] Capturar baseline antes de corrigir achados; não usar conta pessoal em vídeo
  ou screenshots compartilhados.

### Roteiro mínimo

- login, sessão restaurada e logout;
- central de privacidade e aceite versionado;
- Estúdio: selecionar lição, trocar dia, expandir/adicionar bloco, IA, preview,
  revisão, publicação semanal e diária;
- leitor EBD: semana atual/futura, troca de dia, domingo, progresso, refresh,
  offline/online e troca de versão;
- teclado aberto, rotação, safe area, sticky actions, scroll final e tema claro/escuro;
- foco, alvo de toque, contraste, leitor de tela básico e redução de movimento;
- console/logcat sem erro funcional.

### Evidência e severidade

- anexar captura mobile atual aos mesmos estados da referência;
- registrar passos, esperado, observado, severidade e evidência por achado;
- P0/P1 bloqueiam release; P2 exige decisão explícita; P3 pode ir ao backlog;
- repetir somente após correção e atualizar `design-qa.md` para `pass` ou manter
  `blocked` com causa objetiva.

## Fase 8 — RAG e dívida técnica conhecida

### 8.1 Reconciliar `buscar-memoria-rag`

- [ ] Exportar/inspecionar metadados, versão, código/config e variáveis não secretas
  da função remota v5, registrando o projeto alvo.
- [ ] Comparar hash/contrato remoto com
  `supabase/functions/buscar-memoria-rag` do workspace ativo.
- [ ] Confirmar que JWT/permissões continuam validados dentro do handler e que
  CORS, limites, filtros de fontes e logging seguro permanecem intactos.
- [ ] Se houver divergência, explicar e testar antes do deploy; não sobrescrever a
  versão remota apenas para mudar metadado.
- [ ] Publicar a partir do workspace oficial, validar smoke autenticado e negativo,
  conferir logs e confirmar que o metadado remoto deixou de apontar ao histórico.
- [ ] Documentar rollback para a versão v5 conhecida.

### 8.2 Hooks, bundle e mensagem antiga

- [ ] Executar lint/build e inventariar cada aviso com arquivo, causa e dono.
- [ ] Corrigir dependências/ordem de hooks sem desativar regra global; adicionar
  teste quando a correção alterar ciclo de vida ou Realtime.
- [ ] Corrigir qualquer símbolo indefinido remanescente, incluindo `Heart`, se o
  aviso ainda for reproduzível.
- [ ] Substituir `AI_BLOCK_COUNT_INVALID` e textos/documentos ativos que ainda
  afirmam “oito blocos” pelo contrato seletivo vigente. Preservar o contexto em
  documentos explicitamente históricos.
- [ ] Medir chunks no build, localizar dependências dominantes e aplicar divisão
  por rota/import dinâmico, priorizando Sala de Oração. Definir orçamento inicial:
  nenhum chunk de rota acima de 500 kB sem justificativa registrada.
- [ ] Validar carregamento, fallback, PWA/offline e navegação após o code splitting.

### Critério de aceite

Lint e build não exibem os avisos conhecidos; a mensagem da IA descreve o contrato
atual; o relatório de bundle atende ao orçamento ou contém exceção aprovada; a
função remota possui origem e versão reconciliadas.

## Fase 9 — Regressão e decisão de release

- [ ] Rodar testes unitários, componentes, SQL e E2E autenticados.
- [ ] Rodar lint, build web/PWA, build development e validação do manifesto.
- [ ] Confirmar migrations locais/remotas e versões das Edge Functions no projeto
  correto, sem inferir aplicação pela presença dos arquivos.
- [ ] Fazer smoke de upgrade da dev.20 para o novo APK preservando sessão e dados.
- [ ] Revisar logs para falhas de seleção de vigência, conflitos editoriais,
  negações RLS esperadas e erros de sincronização.
- [ ] Registrar decisão `go/no-go`, riscos aceitos, rollback, responsável e janela
  de observação.

### Definition of Done global

- os gates das fases 0 a 8 estão comprovados;
- nenhuma credencial real está ativa ou reproduzida na documentação;
- a lição vigente é determinada por data e não por maior número;
- semana e dias possuem ciclos editoriais independentes e transacionais;
- progresso remoto é isolado por RLS e coberto por E2E autenticado;
- domingo possui contrato aprovado e implementado;
- privacidade possui operação, não apenas texto legal;
- QA mobile autenticado está aprovado;
- RAG, hooks, bundle e mensagem legada estão reconciliados;
- release e rollback estão documentados.

## Backlog rastreável

| ID | Item | Fase | Prioridade | Estado inicial |
|---|---|---:|---|---|
| SEC-01 | Invalidar/rotacionar senha exposta e revisar sessões | 0 | P0 | não comprovado |
| SEC-02 | Registrar e revisar incidente documental | 0 | P0 | pendente |
| EBD-01 | Vigência semanal e proteção contra sobreposição | 2 | P0 | pendente |
| EBD-02 | Separar documento de trabalho e publicações | 3 | P0 | pendente |
| EBD-03 | Progresso remoto, RLS e transação de recompensa | 4 | P0 | pendente |
| EBD-04 | E2E autenticado com duas contas | 4 | P0 | pendente |
| EBD-05 | Contrato e implementação do domingo | 5 | P1 | decisão pendente |
| GOV-01 | Retenção, exclusão e backups | 6 | P0 | pendente |
| GOV-02 | Direitos do titular e SLAs | 6 | P0 | pendente |
| GOV-03 | Incidentes e exercício de mesa | 6 | P0 | pendente |
| GOV-04 | Menores e responsabilidade parental | 6 | P0 | pendente |
| GOV-05 | Consentimentos sensíveis granulares | 6 | P0 | pendente |
| QA-01 | QA mobile autenticado | 7 | P1 | bloqueado sem evidência atual |
| RAG-01 | Reconciliar `buscar-memoria-rag` remoto | 8 | P1 | pendente |
| ENG-01 | Corrigir avisos de hooks/símbolos | 8 | P1 | pendente |
| ENG-02 | Reduzir chunks acima do orçamento | 8 | P2 | pendente |
| ENG-03 | Remover mensagem ativa de “oito blocos” | 8 | P1 | pendente |

## Fontes de evidência

- `SESSAO_2026-08-10_REGISTRO_COMPLETO.md`;
- `../audit/AUDITORIA_EBD_EDITORIAL_2026-08-10.md`;
- `../audit/AUDITORIA_FLUXO_PUBLICACAO_EBD_2026-08-10.md`;
- `ANALISE_EBD_LINHA_DO_TEMPO_EDITORIAL.md`;
- `../RAG_SETUP.md`;
- `../design-qa.md`;
- migration `20260810233000_aceite_legal_versionado.sql`.

