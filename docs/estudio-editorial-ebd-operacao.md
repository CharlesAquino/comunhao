# Estúdio Editorial EBD — Guia de implementação e operação

**Data:** 26/07/2026  
**Status:** MVP implementado no working tree  
**Banco remoto:** migrations aplicadas  
**Último commit estável anterior ao Estúdio:** `9963c7e`
(`Estado estável antes da nova funcionalidade`)

> As mudanças descritas neste documento ainda não formam um novo commit
> estável. O repositório possui outras alterações não commitadas que devem ser
> revisadas e separadas antes de criar um commit do Estúdio.

## 1. O que foi implementado

### Estúdio administrativo

Foi criada a rota `/admin/ebd-studio`, acessível apenas para administradores.
O Estúdio permite:

- listar lições editoriais;
- criar um novo rascunho;
- editar número, título, subtítulo e resumo;
- editar os sete dias da jornada;
- configurar título, subtítulo, duração e data de liberação de cada dia;
- adicionar dez tipos de bloco;
- ordenar blocos;
- remover blocos;
- marcar blocos obrigatórios;
- informar referência bíblica;
- informar conteúdo textual;
- informar URL e prompt de produção de mídia;
- pré-visualizar o dia em uma moldura mobile;
- salvar rascunho;
- enviar para revisão;
- publicar;
- consultar o histórico das versões publicadas.

### Tipos de bloco do MVP

- `hero`;
- `text`;
- `scripture`;
- `character`;
- `timeline`;
- `reflection`;
- `mission`;
- `prayer`;
- `quiz`;
- `video`.

Os blocos são armazenados dentro de um documento JSONB. Isso permite publicar
novas lições e alterar textos, referências, imagens e vídeos sem gerar outro
APK.

### Experiência dos jovens

A aba `/ebd` procura primeiro a lição editorial mais recente com status
`published`.

Quando encontra uma versão publicada:

- mostra a Home da jornada;
- mostra título, subtítulo e período;
- oferece “Continuar jornada”;
- mostra os sete dias;
- respeita a data de liberação;
- mostra progresso semanal;
- renderiza os blocos suportados;
- guarda respostas privadas e conclusão localmente;
- mostra placeholder para vídeos ainda não produzidos.

Quando não existe uma lição editorial publicada, a EBD antiga continua sendo
exibida como fallback.

### Atualização sem APK

A tabela editorial foi adicionada à publicação `supabase_realtime`. Uma
publicação feita pelo Estúdio atualiza a aba EBD conectada sem exigir novo APK.

Um novo APK somente será necessário quando houver mudança no motor do
aplicativo, por exemplo:

- novo tipo de bloco;
- novo comportamento interativo;
- alteração de segurança ou autenticação;
- mudança na estrutura React;
- plugin nativo adicional.

## 2. Arquivos principais

### Frontend

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/EbdStudio.tsx` | Estação administrativa, editor, prévia e publicação |
| `src/components/ebd/EbdJourney.tsx` | Renderer da jornada publicada para os jovens |
| `src/services/ebdEditorialService.ts` | Toda comunicação editorial com o Supabase |
| `src/types/ebdEditorial.ts` | Contratos de lição, dia, bloco, documento e versão |
| `src/pages/EBD.tsx` | Seleção entre jornada editorial e fallback antigo |
| `src/App.tsx` | Rota `/admin/ebd-studio` |

### Banco

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260726210000_ebd_editorial_studio.sql` | tabelas, RLS, policies, versionamento e RPC de publicação |
| `supabase/migrations/20260726211000_ebd_editorial_realtime.sql` | habilitação do Realtime |

### Especificação

| Arquivo | Conteúdo |
|---|---|
| `docs/ebd-sistema-editorial-v1.md` | contrato editorial e arquitetura |
| `docs/ebd-licao-05-piloto.md` | conteúdo piloto da Lição 5 |
| `docs/sessao-2026-07-26-ebd-editorial.md` | registro da decisão |

## 3. Migrações

### `20260726210000_ebd_editorial_studio.sql`

Cria:

- `public.ebd_editorial_lessons`;
- `public.ebd_editorial_versions`;
- índices editoriais;
- trigger para `atualizado_em`;
- RLS nas duas tabelas;
- leitura de lições publicadas para usuários autenticados;
- CRUD editorial restrito a `usuarios.papel = 'admin'`;
- leitura do histórico restrita a administradores;
- RPC `publicar_ebd_editorial(text)`.

A RPC:

1. identifica o administrador por `auth.uid()`;
2. bloqueia a linha da lição;
3. exige sete dias;
4. incrementa a versão;
5. cria um snapshot;
6. marca a lição como publicada;
7. registra `publicado_em`.

### `20260726211000_ebd_editorial_realtime.sql`

Adiciona `public.ebd_editorial_lessons` à publicação
`supabase_realtime`, com verificação idempotente.

### Aplicação

As duas migrations já estão aplicadas no projeto remoto atual.

Em outro ambiente:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase migration list --linked
npx supabase db push --linked
```

Não use `db reset` no projeto remoto.

## 4. Variáveis de ambiente

O Estúdio não introduziu variável nova.

Necessárias para o frontend:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

Variáveis já existentes de outros módulos:

```env
VITE_LIVEKIT_URL=wss://seu-projeto.livekit.cloud
VITE_EVOLUTION_API_URL=http://localhost:8080
VITE_EVOLUTION_API_KEY=sua_chave
VITE_EVOLUTION_INSTANCE=sua_instancia
```

`VITE_ADMIN_PASSWORD` continua no `.env.example`, mas o controle efetivo do
Estúdio usa a sessão Supabase e `usuarios.papel = 'admin'`.

Nenhuma `service_role` deve ser colocada em variável `VITE_*`.

## 5. Como acessar o Estúdio

1. Entrar no aplicativo com uma conta cujo perfil possua
   `usuarios.papel = 'admin'`.
2. Abrir a aba **EBD**.
3. Tocar em **Estúdio**.

Acesso direto:

```text
/admin/ebd-studio
```

No desenvolvimento:

```bash
npm run dev
```

Depois abrir:

```text
http://localhost:5173/admin/ebd-studio
```

Use a porta mostrada pelo Vite caso ela seja diferente.

## 6. Como criar, importar e publicar uma lição

### Criação manual no MVP

1. Abrir o Estúdio.
2. Tocar em **Nova**.
3. Preencher número, título, subtítulo e resumo.
4. Abrir cada dia no seletor horizontal.
5. Informar título, subtítulo, duração e data de liberação.
6. Adicionar os blocos necessários.
7. Ordenar com as setas.
8. Marcar os blocos obrigatórios.
9. Usar a pré-visualização mobile.
10. Salvar.
11. Enviar para revisão.
12. Publicar somente depois da revisão editorial/doutrinária.

### Importação

O MVP ainda não possui botão de importação de PDF, fotografias ou JSON. O
conteúdo deve ser digitado ou colado nos campos do Estúdio.

O importador futuro deverá:

- aceitar JSON no contrato `EbdEditorialDocument`;
- validar schema e IDs;
- rejeitar tipos de bloco desconhecidos;
- criar somente rascunho;
- nunca publicar automaticamente;
- registrar fonte e data de importação.

Não inserir documentos diretamente pelo frontend fora do serviço editorial.

### Publicação

#### Regra operacional principal: publicar por dia

O Estúdio não exige a conclusão da semana para disponibilizar um conteúdo diário.
O operador seleciona o dia e toca em **Liberar dia agora**. A operação:

- valida somente o dia selecionado: título e ao menos um bloco;
- envia o conteúdo desse dia para a RPC `ebd_publicar_dia_editorial`;
- preserva os demais dias sem modificá-los;
- mantém `releaseMode: 'scheduled'`;
- transforma a lição em publicamente legível na primeira publicação diária;
- cria um snapshot e incrementa a versão a cada publicação;
- registra ator, dia, versão e motivo na auditoria administrativa;
- recarrega a versão persistida antes de navegar para `/ebd`.

Dias sem título ou sem blocos são apresentados como indisponíveis na jornada
pública. Eles não podem aparecer vazios e não podem herdar conteúdo de outro dia.

Após a primeira publicação, os dias seguintes continuam sendo produzidos e são
enviados pela mesma RPC, um por vez. A imutabilidade da publicação é preservada
porque alterações públicas passam pela transição privilegiada, versionada e
auditada; o frontend não atualiza diretamente o documento publicado.

O gerador com IA permanece disponível em `draft`, `review` e `published`, pois
seu resultado é apenas um rascunho local. `archived` é o único estado que bloqueia
nova geração. Aplicar o rascunho não publica o dia; a publicação continua exigindo
a ação explícita **Liberar dia agora**.

#### Publicação semanal opcional

Ao tocar em **Publicar**:

- o frontend salva o rascunho;
- chama `publicar_ebd_editorial`;
- o banco cria um snapshot imutável;
- a versão é incrementada;
- a lição passa para `published`;
- usuários conectados recebem a alteração pelo Realtime.

Nenhum APK precisa ser regenerado para mudar o conteúdo publicado.

Ao tocar em **Publicar dia agora**:

- o frontend envia somente o dia selecionado e define seu `unlocksAt` para o
  momento atual;
- mantém a lição em modo `scheduled` e os demais dias inalterados;
- chama `ebd_publicar_dia_editorial`;
- busca novamente a lição publicada;
- navega para `/ebd`.

Ao tocar em **Publicar semana agora**:

- o frontend define `releaseMode: 'immediate'`;
- salva o documento;
- chama `publicar_ebd_editorial`;
- busca novamente a lição publicada;
- navega para `/ebd`.

## 7. Como gerar o APK

### Build completo

```bash
npm install
npm run lint
npm test -- --run
npm run build:mobile
cd android
bash gradlew assembleDebug
```

APK resultante:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### APK mais recente desta sessão

Artefato gerado em 27/07/2026:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Metadados:

- data/hora: `2026-07-26 22:53:52 -03:00`
- tamanho: `11.183.740` bytes
- SHA-256: `17bb617abccda5fa606aa3f73756505faa5a7ec9c6b5f068605abc8f8071b3fc`

### Ícones Android

Se a plataforma Android for recriada:

```bash
npm run assets:android
```

Depois:

```bash
npm run build:mobile
cd android
bash gradlew assembleDebug
```

O SDK local deve estar informado em `android/local.properties`:

```properties
sdk.dir=/caminho/para/Android/Sdk
```

Esse caminho é específico de cada máquina e não deve ser compartilhado como
configuração universal.

## 8. Pendências conhecidas

### Prioridade alta

- idempotência forte de gamificação ainda depende de backend próprio;
- publicação diária depende de a lição já possuir sete dias no documento por causa da RPC atual;
- editor especializado para as perguntas do quiz;
- upload de vídeo para o Storage ainda não existe;
- validação de schema antes de salvar/publicar;
- revisão doutrinária com responsável e aprovação explícita;
- progresso remoto por usuário;
- respostas privadas criptografadas/protegidas por RLS;
- acesso antecipado com Kesef em operação atômica;
- fundo social e prestação de contas.

### Produto e experiência

- importação de JSON;
- extração assistida de PDF e fotografias;
- biblioteca de personagens e lugares;
- comentários internos de revisão;
- restauração de uma versão anterior;
- salvamento automático com indicação de estado;
- detecção de conflito entre dois editores;
- preview de temas claro e escuro;
- editor visual específico para timeline, checklist e flashcards;
- agendamento considerando explicitamente `America/Sao_Paulo`.

### Limitações atuais

- reflexões e progresso são guardados no `localStorage`;
- trocar de aparelho perde esse progresso;
- a jornada editorial já chama `creditarKesef` e `creditarXp` no cliente;
- a proteção contra crédito duplicado da jornada editorial ainda está no cliente, não em uma camada específica de backend;
- o quiz editorial já registra recompensa localmente uma vez por pergunta correta;
- blocos complexos ainda usam campos genéricos;
- o histórico registra snapshots, mas a interface ainda não restaura versões;
- a antecipação solidária aparece apenas como pendência;
- o editor foi otimizado primeiro para o app e ainda precisa de uma experiência
  desktop mais ampla;
- bundle principal permanece acima de 500 kB;
- existem avisos preexistentes de lint;
- não há teste E2E autenticado do fluxo completo de publicação.

## 9. Estado de validação

Na conclusão do MVP:

- 59 testes passando;
- lint sem erros, com avisos preexistentes;
- build Vite e PWA concluído;
- build Android concluído;
- RLS habilitada;
- três policies editoriais confirmadas;
- Realtime confirmado;
- migrations locais e remotas alinhadas;
- nenhuma lição editorial publicada automaticamente.

### Auditoria funcional em 27/07/2026

Estado atual do fluxo novo da EBD:

- publicação semanal agendada: implementada;
- publicação semanal imediata: implementada;
- publicação individual por dia: implementada no frontend;
- consumo da lição publicada em `/ebd`: implementado;
- atualização por Realtime: implementada;
- progresso visual local: implementado;
- respostas privadas locais: implementadas;
- gamificação da jornada editorial: implementada no cliente;
- atualização imediata das barras de progresso semanal: implementada;
- recompensa de conclusão de dia: implementada no cliente;
- recompensa de acerto do quiz editorial: implementada no cliente;
- persistência remota do progresso editorial: não implementada.

## 10. Último commit estável

```text
9963c7e Estado estável antes da nova funcionalidade
```

Esse commit é anterior ao Estúdio Editorial e às demais alterações atuais do
working tree.

Antes de criar um novo commit estável:

1. revisar o working tree completo;
2. separar alterações editoriais de mudanças não relacionadas;
3. confirmar que arquivos sensíveis não serão versionados;
4. executar lint, testes e build;
5. validar criação, revisão e publicação com uma conta admin;
6. validar a leitura com uma conta membro;
7. somente então criar o commit do Estúdio.

## 11. Adenda operacional — 10/08/2026

O Estúdio foi reestruturado em quatro etapas responsivas: Contexto, Conteúdo
semanal, Revisão e Publicação. A produção assistida considera segunda a sábado;
domingo está reservado para atividade especial em planejamento.

A IA permite selecionar qualquer combinação dos dez tipos de bloco, gera título
e subtítulo do dia, usa apenas fontes RAG vinculadas e considera os assuntos já
produzidos para manter progressão semanal. Inputs gerais ausentes são informados
sem impedir toda a geração.

As migrations `20260810211500` e `20260810213000` corrigem, respectivamente,
publicação por posição canônica e salvamento de dia futuro ainda bloqueado em
lição parcialmente publicada. Imagens usam `object-contain`; controles de fonte
sem implementação foram removidos.

Permanecem pendentes: vigência semanal por data, estado estrutural por dia,
controle otimista no salvamento comum, validação integral, progresso remoto e
E2E autenticado. Ver `SESSAO_2026-08-10_REGISTRO_COMPLETO.md`.
