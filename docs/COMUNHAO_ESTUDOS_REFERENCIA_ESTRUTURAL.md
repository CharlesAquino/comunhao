# Comunhão Estudos — Referência estrutural e pedagógica

**Status:** referência contextual vigente  
**Data:** 21/08/2026  
**Produto:** Comunhão | Estudos

## 1. Posicionamento

Comunhão Estudos é um produto educacional próprio. Não substitui nem deve ser
confundido com o EBD.

- **EBD:** estudo diário da lição vigente;
- **Comunhão Estudos:** trilhas formativas progressivas, com estudos,
  atividades, encontros, comunidade e certificação pastoral.

Os mockups são referências ilustrativas de arquitetura e direção de experiência,
não especificações literais de conteúdo, duração, métricas ou dados. A
implementação deve seguir o Design System aprovado do Comunhão.

## 2. Modelo de aprendizagem

O modelo se aproxima principalmente da DIO: trilha organizada, avanço por
etapas, desbloqueio gradual, desafios, encontros e visão clara do progresso.
Conteúdos serão publicados e liberados gradualmente.

```text
catálogo → trilha → curso → módulo → aula/episódio → blocos definidos pelo conteúdo
                                                       → reflexão e aplicação
                                                       → missão ou atividade
                                                       → encontro pastoral
                      → conclusão integral do curso → certificado pastoral
```

O **curso** é a unidade principal do catálogo e da certificação. O jovem não
encontra aulas soltas na biblioteca. Cada card no estilo Udemy representa um
curso completo, com proposta, ministrante, duração, módulos, progresso e
certificado.

A aula/episódio é a unidade pedagógica consumida. O módulo organiza aulas em
uma etapa coerente. A trilha agrupa cursos por objetivo formativo, sem misturar
assuntos paralelos apenas porque compartilham uma tag.

O avanço é ordenado. A progressão deve indicar claramente o que foi concluído,
o que está liberado e qual é o próximo passo.

### Taxonomia para escala

- **trilha:** direção formativa ampla, como Fundamentos da fé ou Vida cristã;
- **curso:** percurso integral exibido no catálogo e válido para certificado;
- **módulo:** etapa ordenada do curso;
- **aula/episódio:** experiência de aprendizagem;
- **bloco:** formato flexível dentro da aula;
- **tag:** metadado para busca e filtro, nunca navegação principal.

Com 50–100 cursos, a página inicial deve priorizar: continuar estudando,
destaque editorial, trilhas e catálogo pesquisável. Aulas e blocos não aparecem
como cards independentes no catálogo.

## 3. Referências externas

### DIO — estrutura principal

Trilhas ordenadas, cursos dentro de formações, desafios, projetos, mentorias,
encontros ao vivo, comunidade, progresso e certificação. No Comunhão, isso se
traduz em estudo, missão, encontro pastoral e certificado.

### Udemy — variedade de formatos

Vídeo, texto, Escritura, áudio, materiais complementares, perguntas, exercícios,
testes e retomada do ponto de estudo. A plataforma não deve obrigar todo estudo
a usar todos os formatos.

### Codecademy — progressão e marcos

Caminhos de aprendizagem, sequência recomendada, marcos claros, próximo passo,
lições, verificações e projetos. O jovem deve saber onde está e por que aquela
etapa existe.

### Rocketseat — prática, identidade e pertencimento

Linguagem própria, prática constante, comunidade, encontros e sensação de
pertencer a uma jornada. O jovem deve sentir que caminha e participa, não que
apenas consome aulas.

### Alura — organização e certificação de trilha

Trilhas por objetivo, navegação previsível, progresso, histórico, biblioteca,
conteúdos complementares e certificado do percurso completo.

### EBC — profundidade bíblica e comunidade

Considera-se aqui EBC como Estudo Bíblico Comunitário. Aproveitamos estudo
pessoal, pequenos grupos, perguntas de aplicação, diálogo, vídeos
contextualizadores, encontros presenciais ou por vídeo e áudio.

## 4. Contrato mínimo sem template rígido

Cada curso precisa declarar:

- objetivo bíblico e pedagógico;
- conteúdo bíblico suficiente;
- módulos e aulas ordenados;
- composição de blocos utilizada em cada aula;
- o que significa concluir aulas e curso;
- atividades necessárias, quando existirem;
- condição para liberar a próxima etapa;
- condição para emitir certificado, quando aplicável;
- vínculo com a trilha e a experiência pastoral.

Não haverá uma lista universal de blocos obrigatórios ou opcionais. Cada aula
terá composição própria, definida conforme o tema. Todos os blocos obrigatórios
incluídos naquela composição devem ser concluídos. O curso só é concluído após
todas as aulas e requisitos previstos.

O sistema deve permitir adicionar, remover, reordenar e configurar blocos por
estudo. Não haverá limites artificiais de texto ou duração antes de observar a
necessidade real do conteúdo.

## 5. Escrituras e conteúdo

O conteúdo bíblico poderá combinar panorama do livro ou tema, texto-base
delimitado, referências e trechos específicos, explicações históricas e
aplicação pastoral. O contexto histórico é subordinado à Escritura e não deve
virar uma aula desconectada do objetivo.

Perguntas, missões, aplicações e outros blocos serão escolhidos ou gerados de
acordo com cada estudo. A expressão apresentada ao jovem é **Pergunta de
reflexão**, não “pergunta de recuperação”. O segundo termo pode existir apenas
como conceito interno de avaliação pedagógica.

## 6. Pastor e operação editorial

O pastor ministrador participa da definição do conteúdo que será apresentado.
Além disso, terá acesso a uma aba de **Revisão Pastoral** antes da publicação
de cada estudo.

Essa revisão acontece no nível do estudo completo. O pastor deve conseguir
visualizar a experiência final, seus textos, referências, aplicações, perguntas,
missões e vínculo com o encontro. Sua única ação editorial é registrar uma
manifestação simples, como **“Gostei”** ou **“Ficou bom”**. Isso não concede
edição, aprovação técnica, solicitação de ajustes ou publicação.

Fluxo editorial mínimo:

```text
rascunho
  → pronto para manifestação pastoral
  → manifestação pastoral registrada
  → decisão editorial do responsável pelo produto
  → publicação
```

O que for decidido na preparação com o pastor entra na plataforma como
conteúdo definido. A edição, organização, configuração, correções, decisão de
bloqueio e publicação ficam sob responsabilidade do responsável pelo produto e
do processo de implementação definido em conjunto. A manifestação pastoral é
um registro de participação e não substitui essas decisões.

### Separação de privilégios

O pastor não terá acesso administrativo geral ao projeto. A revisão pastoral é
uma permissão de domínio, restrita ao Comunhão Estudos:

```text
administração geral ≠ edição de Estudos ≠ revisão pastoral
```

Requisitos obrigatórios:

- permissão específica para revisão pastoral, sem reutilizar `admin.access`;
- acesso somente aos estudos atribuídos ou enviados para sua revisão;
- leitura do estudo completo e registro de uma manifestação simples;
- nenhuma permissão para usuários, finanças, moderação, banco, configurações,
  migrations ou outros módulos administrativos;
- autorização aplicada no servidor/RLS, não apenas por ocultação de rotas ou
  botões no frontend;
- publicação condicionada à regra editorial definida pelo responsável do
  produto, podendo exigir manifestação pastoral registrada para a versão;
- registro auditável de quem manifestou, quando manifestou e qual versão do
  conteúdo foi visualizada;
- a manifestação não congela o conteúdo nem impede correções pelo responsável
  do produto;
- se houver alteração material depois da manifestação, o responsável decide se
  uma nova visualização pastoral será necessária.

Esse isolamento segue o princípio do menor privilégio e evita que uma função
pastoral seja convertida acidentalmente em acesso administrativo amplo.

## 7. Certificação pastoral

O certificado possui validade pastoral e não é apenas uma medalha visual. Deve
representar a conclusão integral do curso, com participante, curso, versão,
período, critérios, código verificável e vínculo pastoral. Critérios específicos
podem variar por curso, mas não podem ser ambíguos para o sistema ou para o jovem.

## 8. Princípio central

> A estrutura da DIO, a variedade da Udemy, a progressão da Codecademy, a
> comunidade da Rocketseat, a organização da Alura e a profundidade pastoral do
> EBC devem servir ao propósito do Comunhão — nunca substituí-lo.

O Comunhão Estudos não deve medir apenas quanto o jovem consumiu. Deve ajudá-lo
a compreender, refletir, praticar e caminhar com a comunidade.

## 9. Nota sobre as referências

As referências externas foram consultadas em 21/08/2026. Plataformas podem
alterar funcionalidades; os princípios acima são abstrações de produto e não
contratos de integração.

## 10. Fundação técnica inicial

A migration da fundação é
`supabase/migrations/20260821120000_comunhao_estudos_fundacao.sql`. Ela cria
temporadas, estudos, blocos, atribuições de revisores, manifestações pastorais
e progresso privado por versão. Essa migration foi aplicada no projeto remoto
de development em 21/08/2026.

A evolução de catálogo é
`supabase/migrations/20260822120000_comunhao_estudos_catalogo_cursos.sql`. Ela
introduz explicitamente trilhas, cursos, módulos, aulas, blocos, progresso,
revisão por curso e certificados, preservando a fundação anterior como legado
compatível.

A evolução de catálogo permanece somente local em 22/08/2026. O preflight e o
`db push --dry-run` confirmaram que apenas essa migration está pendente; nenhum
schema remoto foi alterado. As validações correspondentes estão em
`supabase/tests/20260821120000_comunhao_estudos_fundacao.test.sql` e
`supabase/tests/20260822120000_comunhao_estudos_catalogo_cursos.test.sql`.

### Feature flag

`VITE_ESTUDOS_CATALOG_SCHEMA_ENABLED` deve permanecer `false` no production, no
web provisório e no APK pré-release até que a migration de catálogo seja
aplicada no projeto development mediante autorização separada e a validação
pós-aplicação seja registrada. Enquanto isso, a interface usa o catálogo piloto
local. A flag não é mecanismo de segurança; RLS e RPCs continuam obrigatórios.

## 11. Geração editorial com IA e RAG

O Comunhão Estudos consome a mesma Memória Sistêmica utilizada pelo Editorial
EBD. Não existe uma segunda biblioteca, outro conjunto de credenciais ou uma
indexação paralela.

Fluxo aprovado:

1. a equipe cadastra e indexa a fonte na Memória Sistêmica;
2. a fonte recebe escopo `estudos`, `global`, `ebd` ou `formacao`;
3. o editor vincula explicitamente as fontes oficiais ao curso;
4. a Edge Function recupera somente trechos dessas fontes;
5. a IA gera o rascunho de uma aula nos tipos de bloco selecionados;
6. o rascunho volta ao Studio para edição humana;
7. salvar, enviar à revisão pastoral e publicar continuam ações independentes.

Contrato de segurança:

- RAG e orientações adicionais são dados não confiáveis no prompt;
- a função exige `estudos.manage`, idempotência, rate limit e circuit breaker;
- curso e aula precisam estar em rascunho;
- cada execução registra ator, aula, modelo, versão do prompt, fontes, tokens,
  duração, resultado ou falha;
- a IA não escreve diretamente nas tabelas editoriais e não altera status;
- a substituição dos blocos é transacional somente quando o editor salva;
- revisão pastoral e publicação mantêm as permissões já definidas.

O contrato de saída é próprio de Estudos: título e descrição da aula,
referência bíblica, duração e blocos `video`, `scripture`, `context`,
`reflection`, `mission`, `meeting`, `audio` e `resource`. A interface não usa a
expressão “pergunta de recuperação”.

Implementação local: `supabase/functions/gerar-aula-estudo/index.ts`. A função e
a migration de catálogo não estão implantadas remotamente enquanto a autorização
separada de escrita não for concedida.
