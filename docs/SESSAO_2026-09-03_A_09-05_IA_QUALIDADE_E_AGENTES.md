# Sessão de 03 a 05/09/2026 — IA, qualidade, agentes e operação editorial

> Registro histórico append-only. Consolida decisões, evidências e pendências
> desta sessão sem alterar auditorias, incidentes ou documentos de release
> anteriores. Credenciais, tokens, prompts completos e dados pessoais foram
> deliberadamente omitidos.

## 1. Decisões de produto

### 1.1 Estudos Bíblicos e EBD são produtos distintos

- **EBD** permanece o estudo diário da lição, com calendário semanal,
  Estúdio Editorial e RAG oficial associado à lição.
- **Comunhão Estudos** é um produto de formação por cursos/trilhas, com avanço
  ordenado e certificado de validade pastoral ao concluir o curso completo.
- As duas experiências podem compartilhar infraestrutura editorial, RAG,
  geração assistida, revisão humana e padrões visuais, mas não devem fundir
  seus catálogos, jornadas ou linguagem pedagógica.

### 1.2 Estrutura dos Estudos Bíblicos

Foram confirmadas as diretrizes abaixo:

- a entrada da aba deve organizar cursos como catálogo editorial, não como uma
  lista plana de conteúdos; referências: Udemy, DIO, Alura, Rocketseat e
  plataformas de ensino semelhantes;
- cursos podem ter módulos, aulas/episódios e blocos definidos pelo objetivo
  do estudo; não há uma lista de blocos permanentemente obrigatória;
- a jornada inicialmente é ordenada, pois o conteúdo será lançado de forma
  gradual;
- a conclusão é do curso integral, não de partes isoladas, pois fundamenta o
  certificado pastoral;
- texto bíblico pode alternar entre leitura mais ampla e referências/trechos
  de apoio, conforme a necessidade didática;
- perguntas, missões e interações são configuráveis por estudo, como já ocorre
  no editorial EBD; não devem ser engessadas;
- o pastor contribui para definição do conteúdo que apresentará; a revisão
  pastoral é uma aprovação de conteúdo, não concede acesso administrativo ou
  edição na plataforma.

### 1.3 Linguagem pedagógica

O termo interno **"pergunta de recuperação"** não deve ser mostrado aos jovens
por poder remeter a uma experiência escolar negativa. Na interface, usar uma
linguagem acolhedora, por exemplo: **"Confira o que ficou"**, **"Pense sem
voltar"** ou uma formulação coerente com a atividade.

### 1.4 Vertical slice editorial

A Fase 0 de Estudos deve validar primeiro uma Semana 1 completa, em vez de
produzir quatro semanas simultaneamente:

1. revisão pastoral;
2. objetivo e texto-base congelados;
3. roteiro;
4. contexto histórico de apoio;
5. pergunta de compreensão;
6. missão prática;
7. gravação;
8. montagem no protótipo;
9. teste com 5–10 jovens.

O teste deve observar navegação, abandono, duração percebida, leitura do
contexto, compreensão sem releitura e desejo de continuar.

## 2. Design System, layout e imagens

### 2.1 Regras reafirmadas

- O Design System existente é obrigatório antes de criar ou alterar ações,
  cards, botões, banners ou layouts. Ver
  `DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md`.
- Elementos de mobile não devem usar tipografia pequena nem apenas esticar uma
  composição de telefone para tablet. Cards, imagens, menu e largura geral
  devem ganhar limites, composição e densidade adequados ao viewport.
- Conteúdos longos precisam rolar; a barra visual de rolagem deve permanecer
  oculta quando isso não reduzir acessibilidade.
- Banners e cards devem conversar com o tema geral do app, mas não reutilizar
  indiscriminadamente a arte oficial de Estudos em toda a aba.
- Artes de banner já devem conter a tipografia final, em escala legível para
  mobile; não se deve sobrepor letras pequenas na interface para compensar uma
  arte ilegível.

### 2.2 Estudos Bíblicos

- O card de acesso a Estudos fica abaixo da **Missão da Semana** na Home, sem
  competir com o conteúdo prioritário.
- Ele deve usar a mesma gramática visual da Missão: banner integrado ao card,
  ocupando a zona superior como parte do mesmo elemento.
- A aba de Estudos deve possuir hero próprio, com organização de catálogo
  inspirada em streaming, e capas/avatares contextuais para cursos.
- As versões clara e escura aprovadas da capa ilustrada **"Quem é Jesus?"**
  constituem referência visual de continuidade.
- Ativos editoriais devem morar em diretório próprio, não espalhados pelo
  projeto. A organização física deve acompanhar a seção editorial ao criar
  novas artes.

### 2.3 Kesef 3D

- A Carteira ganhou experimento 3D do Kesef.
- A solicitação visual foi deixar o aro marrom com o mesmo material dourado da
  moeda e manter rotação discreta, com fallback estático, respeito a
  `prefers-reduced-motion` e controle de custo gráfico.
- Três dimensões e motion são recursos justificáveis apenas em experiências
  que realmente ganhem significado visual; não são padrão para telas comuns.

## 3. Segurança, administração e operação comunitária

### 3.1 IDOR e permissões

Foi definida e aplicada a direção de reforço contra IDOR: autorização por
objeto deve permanecer no servidor/RPC/Edge Function, não apenas escondida na
interface. O contrato de referência é
`CONTRATO-AUTORIZACAO-ANTI-IDOR.md`.

### 3.2 Pastor revisor

O pastor possui uma área de revisão antes da publicação de cada Estudo, mas:

- não é administrador;
- não edita conteúdo, permissões ou configuração;
- sua manifestação é aprovação simples de conteúdo (por exemplo, "ficou bom");
- publicação e correção continuam sob gestão administrativa definida pelo
  produto.

### 3.3 Círculo de oração e telemetria assistencial

Foi solicitada uma aba administrativa para gestão do sorteio/círculo de
oração, com métricas de formação de duplas, chamadas, erros, continuidade,
respostas, intercessão, atendimento, horários e participantes.

Regra central confirmada: **qualquer pessoa marcada explicitamente para o
sorteio deve participar do círculo**. Nenhuma regra de elegibilidade pode se
sobrepor silenciosamente à marcação manual. A telemetria é assistencial e deve
minimizar exposição de dados sensíveis.

### 3.4 Tesouro e resgates

Fluxo definido para o Tesouro:

- o administrador deve saber que um resgate ocorreu;
- a pessoa recebe atualização rastreável quando o gestor processa o pedido;
- estados operacionais previstos incluem: processado com previsão posterior,
  agendado para retirada em data/local e disponível para alinhamento de
  retirada;
- a área administrativa deve permitir excluir itens carregados quando
  autorizado, com auditoria adequada.

## 4. IA editorial: problemas observados e resposta arquitetural

### 4.1 Problemas reais registrados

Durante a geração EBD foram observados, em momentos diferentes:

- rate limit do provedor (`429`);
- cota alternativa indisponível (`503`);
- modelo indisponível (`AI_PROVIDER_MODEL_UNAVAILABLE`);
- saída com profundidade editorial insuficiente
  (`AI_BLOCK_DEPTH_INVALID`);
- vazamento de estrutura/JSON no conteúdo textual;
- resultados superficiais e repetitivos, em especial ao gerar blocos longos;
- uma chamada autenticada/RPC retornando `400` ou `401`, e uma conexão de
  autenticação encerrada pelo transporte local/remoto.

Esses códigos não significam um único defeito. Eles se dividem entre
disponibilidade/cota externa, compatibilidade do modelo, validação de estrutura
e qualidade editorial. A interface deve continuar exibindo mensagens seguras,
referência de correlação e orientação acionável, nunca token, prompt completo
ou resposta bruta do provedor.

### 4.2 Profundidade por tipo de bloco

O critério aprovado não é "todos os blocos longos". A densidade deve obedecer
à função pedagógica:

| Tipo | Regra editorial |
| --- | --- |
| Abertura, texto, passagem bíblica, linha do tempo e reflexão | Precisam de desenvolvimento, contexto, ligação bíblica e aplicação clara. |
| Personagem | Contextual e objetivo; não precisa virar miniartigo. |
| Missão, oração e quiz | Curtos, práticos e específicos; não precisam ser blocos extensos. |

Mais conteúdo deve ser produzido pelo provedor de IA com RAG e contratos de
qualidade; não por texto manual improvisado do agente de implementação.

### 4.3 Orquestrador multi-IA

Foi escolhido evoluir de um único provedor para um orquestrador interno com
prioridade, fallback, telemetria e contrato de saída comum. Para o fluxo
editorial EBD, a ordem configurada é:

1. Cloudflare Workers AI;
2. NVIDIA NIM para geração textual;
3. Google Gemini;
4. Groq com modelo GPT-OSS maior;
5. Groq com modelo GPT-OSS menor.

Cada tentativa deve registrar provedor, modelo, duração, tokens quando
disponíveis, motivo seguro de fallback e `correlationId`. O backend continua
responsável por:

- recuperar somente as fontes RAG vinculadas;
- tratar RAG e instruções livres como dados não confiáveis;
- exigir JSON estruturado;
- normalizar/validar blocos e profundidade;
- impedir publicação automática;
- preservar idempotência, autorização e trilha de auditoria.

O provedor que gera uma execução bem-sucedida pode variar conforme cota e
disponibilidade. Uma execução comprovada no período usou Groq; isso não prova
que os demais provedores estavam produzindo conteúdo de qualidade naquele
momento.

### 4.4 Modelos e serviços avaliados

| Recurso | Papel aprovado ou mapeado | Aplicação | Limite |
| --- | --- | --- | --- |
| Cloudflare Workers AI | geração textual estruturada prioritária | EBD e Curso Bíblico | sujeito a limites e validação de JSON | 
| NVIDIA NIM — DeepSeek | geração/raciocínio textual de fallback | EBD e Curso Bíblico | não substitui RAG nem revisão | 
| Google Gemini Flash | geração textual de fallback | EBD e Curso Bíblico | disponibilidade/modelo devem ser observados | 
| Groq GPT-OSS | fallback de geração editorial | EBD e Curso Bíblico | limites de taxa podem ocorrer | 
| NVIDIA Llama Guard | moderação futura | material editorial/RAG autorizado | não analisar pedidos de oração/dados pessoais brutos | 
| Poolside Laguna XS | planejamento técnico, ferramentas e tarefas agentivas | futuro Agent Core técnico | não é o gerador principal de lições | 
| NVIDIA Nemotron OCR v2 | ingestão OCR de documentos/imagens | pipeline de RAG após revisão humana | não publicar OCR diretamente; não enviar dados pessoais | 
| Wan 2.2 Animate | produção audiovisual/animar personagem | teaser EBD, curso, evento e peça institucional | fluxo separado, consentimento explícito para imagens de pessoas | 

As credenciais dos provedores ficam exclusivamente em secrets remotos. Elas não
devem ser incluídas em código, commits, logs, documentação ou front-end.

### 4.5 EBD e Curso Bíblico

As capacidades de provedores aprovados devem existir **tanto** no Estúdio EBD
quanto no Estúdio de Curso Bíblico, reaproveitando a mesma política de
segurança/qualidade. A unificação de código do gerador estruturado foi iniciada
na sessão e precisa ser validada por testes e deploy remoto antes de ser
considerada concluída para Cursos.

## 5. Agente Editorial EBD — MVP implementado

Foi aprovado e implementado o primeiro agente operacional governado:
**Agente Editorial EBD — Preparar Dia**. Documento especializado:
`AGENTE_EDITORIAL_EBD_MVP.md`.

Ele recebe objetivo, contexto da lição/dia, roteiro semanal, fontes RAG
vinculadas e estado de edição. Então cria um rascunho validado e auditado,
mas para antes da revisão/publicação.

Arquitetura de referência:

```text
Objetivo → Context Engine → Memória mínima → Decisão → Tools
         → rascunho → Audit Trail → novo contexto
```

Peças definidas para evolução:

- **Context Engine:** lição, dia, RAG, calendário e estado editorial;
- **Memory Layer:** somente decisões/resultados aprovados, com minimização;
- **Tool Registry:** RAG, rascunho, imagem, agenda e notificações;
- **Policy/Approval:** autonomia proporcional ao risco;
- **Audit Trail:** objetivo, resumo do contexto, ferramenta, resultado e
  aprovação.

Regra de autonomia:

| Ação | Governança |
| --- | --- |
| Sugerir título, estrutura, quiz ou imagem | automática e auditada |
| Criar/atualizar rascunho | automática e auditada |
| Associar à programação | automática e auditada |
| Enviar para revisão | ação explícita administrativa |
| Publicar ou disparar push | aprovação humana |
| Inferir/interpretar situação pastoral | nunca autonomamente |
| Ler memória espiritual/pessoal | consentimento, finalidade e mínimo necessário |

O próximo incremento do agente é listar execuções no Estúdio e vincular
sugestão visual a uma geração de imagem igualmente parada para aprovação.

## 6. Sala de Oração, feed e gamificação: direção futura

Não foi autorizado construir um superagente para todo o app. A arquitetura
futura usa agentes especializados sobre um núcleo comum.

- **Sala de Oração:** começar somente com acompanhamento temporário e
  consentido de pedidos com data/evento; jamais criar perfil espiritual
  permanente, inferência pastoral ou memória implícita de dados sensíveis.
- **EBD personalizada:** relacionar lição atual, histórico de estudo, quizzes
  e próxima experiência sem manipular a pessoa para consumo compulsivo.
- **Insígnias:** reconhecer consistência, diversidade e contribuição, não
  apenas contadores de cliques.
- **Feed "Para você":** priorizar continuidade útil da jornada (estudo,
  pedidos, comunidade e eventos), não a maximização de tempo de tela.
- **Administração comunitária:** agentes podem montar rascunhos e programação,
  sempre devolvendo um estado de aprovação, nunca publicando em massa.

## 7. Qualidade, testes e desempenho

### 7.1 Evidência produzida

- Playwright e Axe foram introduzidos; seis cenários E2E passaram no momento
  da validação.
- A baseline de qualidade/segurança está em
  `QUALIDADE_E_SEGURANCA_BASELINE_2026-09-03.md`.
- O comando de lint foi ajustado para `oxlint src`.
- Houve uma execução verde com 44 arquivos de teste e 211 testes.
- Builds Vite passaram, ainda com avisos de peso de bundle/imagens.

### 7.2 Riscos técnicos mapeados

- `SalaOracao` e o módulo Three.js formam chunks grandes;
- há imagens estáticas com peso de megabytes;
- preload de `louvor-ambient-v1.webp` aparecia como não utilizado em várias
  rotas e deve ser corrigido/removido conforme uso real;
- o fluxo editorial precisa de fila, cooldown e telemetria para evitar novas
  tentativas manuais durante `429/503`;
- execução de IA deve ser testada contra respostas malformadas, conteúdo
  superficial, RAG ausente, sessão expirada e indisponibilidade de rede;
- o aviso de React DevTools é informativo; não é falha de produção.

### 7.3 Prioridade aprovada para a próxima janela

1. qualidade e segurança transversal;
2. desempenho, fila e telemetria de IA no Editorial EBD;
3. QA mobile/push com evidência em dispositivo;
4. vertical slice real da Semana 1 de Estudos;
5. piloto operacional da Cantina.

## 8. Toolchain e capacidades de desenvolvimento

Foram documentadas e priorizadas capacidades para o Codex, sem instalar
ferramentas aleatoriamente:

- processo/engenharia: Addy Osmani Agent Skills como fluxo principal de
  especificação, testes, revisão, simplificação, segurança e browser testing;
- React/Next: Vercel Agent Skills;
- busca em codebase: WarpGrep, se o tamanho do repositório justificar;
- consistência de interface: Interface Design + contrato DS local;
- creative development: GSAP, Three/R3F, img2threejs, Remotion e direção de
  arte;
- QA de animações: Optimize Web Animations;
- navegador real: DevTools/browser testing;
- qualidade web: Core Web Vitals, acessibilidade e práticas web.

O princípio é escolher o menor recurso que resolve o problema. Bibliotecas
avançadas não devem ser usadas apenas porque estão disponíveis.

`CODEX_AGENT_TOOLCHAIN.md` e `CREATIVE-DEVELOPMENT-SKILLS.md` são as fontes
especializadas; este registro apenas fixa a direção decidida.

## 9. Pendências objetivas

| Item | Estado ao encerrar | Próxima ação segura |
| --- | --- | --- |
| Orquestrador EBD | implementado; necessita observação operacional contínua | registrar telemetria por provedor e validar qualidade de saída |
| Orquestrador Curso Bíblico | integração compartilhada iniciada | concluir teste, build e deploy da função de Curso antes de declarar ativo |
| Fila/cooldown EBD | pendente | impedir retentativas concorrentes, mostrar espera e conservar idempotência |
| Qualidade de geração | parcialmente protegida por validação | calibrar prompt/schema por tipo de bloco e manter blocos breves quando apropriado |
| Telemetria editorial | pendente de interface operacional | expor execução, provedor, duração, fontes, fallback e correlação para admin |
| OCR para RAG | apenas mapeado | construir importação com preview, confiança e aprovação antes de indexar |
| Llama Guard | apenas mapeado | desenhar política de moderação limitada a conteúdo editorial autorizado |
| WAN Animate | apenas mapeado | avaliar pipeline audiovisual separado e consentimento |
| Agente editorial | MVP entregue | histórico visual de execuções e sugestão de imagem aprovada por humano |
| Sala de Oração contextual | proposta futura | definir consentimento, retenção e privacidade antes de qualquer memória |
| Semana 1 Estudos | pendente | fechar conteúdo pastoral, produzir vertical slice e testar com jovens |
| Preload de louvor | aviso conhecido | auditar uso efetivo e remover preload se não for crítico |

## 10. Regras de retomada

1. Não chamar uma integração de IA de funcional apenas porque a secret existe;
   exigir resultado remoto, validação de contrato e registro de auditoria.
2. Nunca colocar credenciais de provedores em cliente, documentação, código ou
   mensagens de erro.
3. Não tratar `502` como causa única: consultar `correlationId`, tentativas e
   motivo por provedor antes de editar prompts ou UI.
4. Manter publicação, push, moderação sensível e ações pastorais sob aprovação
   humana.
5. Antes de novo layout, consultar o contrato de Design System; antes de novo
   agente, definir dados permitidos, ferramentas, política, auditoria e
   fallback.
