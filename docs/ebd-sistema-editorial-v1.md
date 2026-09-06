# Sistema Editorial da Escola Bíblica Digital — v1

**Status:** especificação aprovada para planejamento  
**Destino no produto:** aba `EBD` (`/ebd`)  
**Piloto:** Lição 5 — Débora e Baraque  
**Data do registro:** 26/07/2026

## 1. Visão do produto

A EBD Digital será uma jornada semanal de segunda a domingo, e não apenas uma
biblioteca de lições. A revista permanece como fonte principal. Recursos de IA
podem organizar, adaptar e enriquecer a experiência, mas não podem alterar sua
mensagem doutrinária.

A jornada combina:

- estudo bíblico;
- conteúdo visual;
- interação comunitária;
- aplicação prática;
- revisão e quiz;
- preparação para a aula presencial;
- experiência coletiva no domingo.

O domingo é o momento culminante. Dias anteriores continuam acessíveis, mesmo
quando o jovem não os concluiu na data prevista.

## 2. Princípios editoriais

### Identidade visual da lição

Toda lição possui uma capa editorial opcional em `coverImageUrl`. Quando não
definida, a interface usa como fallback a primeira imagem não-vídeo inserida nos
blocos de segunda-feira. A mesma resolução deve ser usada no destaque público,
nas listas administrativas e no arquivo, garantindo continuidade visual.

A ausência de ambas as fontes usa o símbolo institucional da EBD; nunca se deve
buscar imagem de outro dia ou de outra lição automaticamente.

### Fidelidade

Todo conteúdo deve:

- preservar o sentido da revista;
- separar claramente fonte e complemento editorial;
- não inventar acontecimentos, falas ou detalhes bíblicos;
- indicar referências bíblicas;
- não apresentar interpretações controversas como consenso;
- passar por revisão humana antes de ser publicado.

### Linguagem

O texto deve ser acessível para jovens, respeitoso, direto, acolhedor e
informativo, sem infantilização, artificialidade espiritual ou tom de apostila
acadêmica.

### Extensão recomendada

- abertura: até 80 palavras;
- explicação: de 150 a 350 palavras;
- reflexão: uma pergunta principal;
- personagem: retrato focado, somente com o contexto necessário para iluminar
  o tema;
- oração: breve, em poucas frases relacionadas ao estudo;
- missão: uma ação clara, realizável e descrita de modo direto;
- quiz diário: de 3 a 5 questões;
- quiz semanal: de 8 a 12 questões.

### Interatividade

Nenhum dia pode ser composto apenas de texto passivo. Cada dia deve conter ao
menos uma ação: responder, marcar, votar, comentar, organizar, assistir, ouvir,
concluir ou registrar.

## 3. Jornada semanal

| Dia | Propósito | Experiência principal |
|---|---|---|
| Segunda | Descobrir | narrativa, contexto, personagem, pergunta e oração |
| Terça | Compreender | leitura, explicação, conceitos e conexões bíblicas |
| Quarta | Conversar | reflexão, enquete, respostas e comunidade |
| Quinta | Praticar | missão, checklist, registro e compromisso |
| Sexta | Fixar | quiz, ordenação, associação e flashcards |
| Sábado | Aprofundar | curiosidades, recursos visuais e preparação |
| Domingo | Vivenciar | conteúdo, atividades coletivas, discussão e síntese |

## 4. Blocos editoriais

Os dias serão montados com blocos reutilizáveis. O catálogo completo previsto é:

- conteúdo: `hero`, `text`, `scripture`, `quote`;
- aprendizagem visual: `timeline`, `character`, `place`, `comparison`,
  `infographic`;
- participação: `reflection`, `poll`, `discussion`, `prayer`;
- prática: `mission`, `checklist`;
- revisão: `quiz`, `flashcards`;
- mídia: `video` e referências de imagem, vídeo, áudio, SVG ou mapa;
- apoio de interface: `callout` e conclusão.

O MVP implementará inicialmente:

1. `hero`;
2. `text`;
3. `scripture`;
4. `character`;
5. `timeline`;
6. `reflection`;
7. `mission`;
8. `prayer`;
9. `quiz`;
10. `video`.

Comentários comunitários avançados, mapas, áudio e quiz ao vivo ficam para uma
fase posterior.

## 5. Contrato de conteúdo

```ts
export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type LessonPurpose =
  | 'discover'
  | 'understand'
  | 'discuss'
  | 'practice'
  | 'review'
  | 'deepen'
  | 'experience';

export type MediaReference = {
  id: string;
  type: 'image' | 'video' | 'audio' | 'svg' | 'map';
  url?: string;
  prompt?: string;
  altText: string;
  caption?: string;
  status?: 'planned' | 'ready';
};

export type UnlockPolicy = {
  mode: 'scheduled';
  unlocksAt: string;
  earlyAccess?: {
    enabled: boolean;
    costKesef: number;
    maximumAdvanceDays?: number;
    destinationFund: 'social_baskets';
  };
};

export type LessonDay = {
  id: string;
  day: Weekday;
  date: string;
  label: string;
  title: string;
  subtitle: string;
  purpose: LessonPurpose;
  estimatedMinutes: number;
  unlockPolicy: UnlockPolicy;
  blocks: LessonBlock[];
  requiredBlockIds: string[];
  xpReward: number;
};

export type EbdLesson = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  theme: string;
  summary: string;
  period: {
    startsAt: string;
    endsAt: string;
    label: string;
  };
  source: {
    publisher: string;
    audience: string;
    edition: string;
    pageRange: string;
    importedAt?: string;
  };
  mainVerse: {
    reference: string;
    paraphrase: string;
  };
  biblicalReading: string[];
  objectives: string[];
  weeklyReadings: WeeklyReading[];
  weeklyMission: {
    title: string;
    description: string;
  };
  characters: BiblicalCharacter[];
  keywords: string[];
  days: LessonDay[];
  status: 'draft' | 'review' | 'published' | 'archived';
  version: number;
};
```

`LessonBlock` será uma união discriminada pelos tipos de bloco. O conteúdo
piloto e os campos necessários de cada bloco estão registrados em
[`ebd-licao-05-piloto.md`](ebd-licao-05-piloto.md).

## 6. Progresso

```ts
export type LessonProgress = {
  lessonId: string;
  userId: string;
  completedDays: string[];
  completedBlocks: string[];
  quizScores: Record<string, number>;
  earnedXp: number;
  weeklyMissionCompleted: boolean;
  privateResponses: Record<string, string>;
  startedAt?: string;
  completedAt?: string;
};
```

Estados do dia:

- `scheduled`: ainda não liberado;
- `available`: liberado pela data;
- `early_unlocked`: antecipado com Kesef;
- `in_progress`: iniciado;
- `completed`: concluído;
- `missed`: data passou, mas o conteúdo continua acessível.

O dia é concluído quando todos os seus `requiredBlockIds` forem concluídos.
Reflexões privadas não podem ser expostas a outros usuários nem ao mural sem uma
ação explícita.

## 7. Acesso programado e antecipação solidária

### Publicação editorial incremental — regra normativa

A unidade primária de publicação da EBD é o **dia**, não a semana completa.
O editor pode preparar, revisar e disponibilizar segunda, terça ou qualquer outro
dia separadamente, sem preencher antecipadamente os demais dias.

Requisitos obrigatórios:

- apenas o dia selecionado precisa ter título e pelo menos um bloco para sua
  publicação individual;
- publicar um dia não pode copiar, completar ou liberar conteúdo de outro dia;
- dias vazios ou ainda não publicados permanecem indisponíveis ao público;
- a lição pode estar pública enquanto os próximos dias continuam em produção;
- cada publicação diária cria nova versão e registro de auditoria;
- correções e publicações posteriores devem preservar os dias já publicados;
- publicar a semana completa é uma ação opcional e exige que os sete dias estejam
  completos;
- o conteúdo diário exibido deve pertencer sempre ao documento da lição atual;
- revisão da semana completa não pode ser usada como pré-condição para publicar
  um único dia por um usuário com permissão `ebd.publish`.
- uma lição já publicada continua elegível para geração assistida dos próximos
  dias; a IA devolve somente rascunho revisável e nunca publica automaticamente.

Fluxo principal:

```text
Rascunho da lição
  -> produzir um dia
  -> salvar
  -> publicar o dia selecionado
  -> continuar produzindo os próximos dias
  -> publicar cada dia quando estiver pronto
```

Fluxo opcional:

```text
Sete dias completos -> revisão semanal -> publicação agendada ou imediata
```

### Regra central

Todo conteúdo da EBD será gratuito na data prevista. O Kesef permite apenas
antecipar uma experiência que se tornará gratuita.

Todo Kesef gasto nesse propósito será contabilizado no **Fundo de Cestas
Básicas**, e não creditado na carteira pessoal de um administrador.

### Proposta para o MVP

```ts
export const EARLY_UNLOCK_COST = 3;
export const MAXIMUM_ADVANCE_DAYS = 2;
```

- desbloqueio libera o dia inteiro;
- não há cobrança por bloco;
- somente os próximos dois dias podem ser antecipados;
- não há XP adicional por antecipar;
- o domingo não depende de Kesef;
- não usar culpa, urgência artificial ou contagem regressiva agressiva;
- o destino social deve aparecer antes da confirmação;
- gasto duplicado deve ser impossível;
- erro técnico deve resultar em estorno automático.

Texto normativo da confirmação:

> Este conteúdo será liberado gratuitamente na data indicada. Os 3 Kesef
> utilizados serão destinados ao Fundo de Cestas Básicas da igreja.

### Autoridade do servidor

O relógio do aparelho não decide o acesso. Data, saldo, limite de antecipação e
idempotência devem ser validados por uma RPC transacional no Supabase.

A operação deve:

1. autenticar o usuário;
2. localizar a lição e o dia publicados;
3. confirmar que o dia ainda está programado;
4. validar a política e a antecedência máxima;
5. impedir duplicidade;
6. verificar o saldo;
7. debitar Kesef;
8. registrar o acesso antecipado;
9. registrar o compromisso no fundo social;
10. criar auditoria;
11. concluir tudo atomicamente ou não alterar nada.

O frontend nunca deve considerar o conteúdo liberado antes da confirmação do
servidor.

## 8. Modelo contábil proposto

Novas entidades:

### `ebd_early_unlocks`

- `id`;
- `usuario_id`;
- `licao_id`;
- `dia_id`;
- `kesef_gasto`;
- `fundo_destino = 'social_baskets'`;
- `liberado_em`;
- `previsto_para`;
- restrição única `(usuario_id, licao_id, dia_id)`.

### `social_fund_cycles`

- ciclo e período;
- Kesef comprometido;
- Kesef convertido;
- taxa de conversão versionada;
- status: aberto, aguardando conversão, convertido, doado ou comprovado.

### `social_fund_conversions`

- ciclo;
- quantidade de Kesef;
- regra de conversão e versão;
- valor resultante em centavos;
- administrador responsável;
- datas;
- comprovante e relatório público.

### Ledger

Adicionar um tipo semântico de débito, por exemplo
`spent_early_access`, sempre com referência à lição e ao dia. O ledger continua
sendo a fonte financeira; `ebd_early_unlocks` é a fonte de autorização.

## 9. Transparência

Na aba Tesouro deverá existir futuramente a seção “Kesef que virou cuidado”,
com:

- participação pessoal, sem ranking;
- saldo coletivo do fundo;
- próxima prestação de contas;
- ciclos anteriores;
- Kesef convertido;
- quantidade de cestas entregues;
- comprovante ou relatório público.

A taxa de conversão precisa ser definida antes do ciclo, publicada, versionada e
imutável retroativamente. O exemplo `100 Kesef = R$ 1,00` é apenas ilustrativo e
não está aprovado.

## 10. Home da EBD

A rota `/ebd` mostrará:

1. lição atual;
2. número, título e subtítulo;
3. card do dia;
4. ação principal “Continuar jornada”;
5. progresso de segunda a domingo;
6. missão da semana;
7. versículo principal;
8. acesso aos demais dias;
9. acesso discreto a lições anteriores.

Um dia programado deve continuar visível, informar quando será gratuito e, se
elegível, oferecer antecipação solidária.

## 11. Motor editorial

Fluxo previsto:

```text
PDF ou fotografias
  → extração
  → separação entre fonte e complemento
  → objetos bíblicos reutilizáveis
  → planejamento semanal
  → blocos diários
  → quiz e atividades
  → solicitações de mídia
  → revisão doutrinária e editorial
  → JSON versionado
  → publicação
```

O campo `MediaReference.prompt` permite solicitar um ativo antes de ele existir.
Mídias planejadas devem apresentar placeholder elegante, nunca um controle
quebrado.

## 12. Objetos bíblicos reutilizáveis

Personagens e lugares formam uma biblioteca viva, independente de uma lição.

```ts
export type BiblicalCharacter = {
  id: string;
  name: string;
  aliases?: string[];
  role: string;
  biography: string;
  traits?: string[];
  scriptureReferences: string[];
  relatedCharacterIds?: string[];
  lessonIds?: string[];
  media?: MediaReference[];
  reviewStatus: 'draft' | 'reviewed';
};
```

## 13. Requisitos de segurança e auditoria

- RLS em progresso, respostas, desbloqueios e fundo;
- RPC `SECURITY DEFINER` com `auth.uid()` interno;
- nenhuma aceitação de `userId` fornecido pelo cliente;
- preço obtido no servidor, nunca confiado a partir do frontend;
- idempotência por usuário/lição/dia;
- ledger e fundo reconciliáveis;
- taxa de conversão imutável dentro do ciclo;
- trilha de auditoria administrativa;
- comprovantes no Storage com política própria;
- estorno vinculado à transação original;
- conteúdo somente publicado após revisão humana.

## 14. Ordem de implementação

1. fechar calendário e política social;
2. consolidar tipos editoriais;
3. criar o conteúdo estruturado de `lesson05`;
4. criar migrations, RLS e RPCs;
5. criar serviços, sem Supabase direto em componentes;
6. renderizar Home da EBD;
7. criar rota e renderer diário;
8. implementar os dez blocos do MVP;
9. implementar progresso e respostas privadas;
10. implementar quiz;
11. implementar acesso programado e antecipação;
12. criar painel de auditoria do fundo;
13. validar no APK;
14. publicar somente após revisão editorial/doutrinária.

## 15. Decisões pendentes

1. **Calendário:** a revista apresenta 2 de agosto de 2026, um domingo. Definir
   se a jornada ocorre na semana anterior e culmina em 2/8, ou se começa em 3/8
   e culmina em 9/8.
2. **Taxa Kesef→real:** definir proporção sustentável antes do primeiro ciclo.
3. **Responsável editorial:** definir quem aprova doutrina, linguagem e mídia.
4. **Fonte bíblica:** definir tradução e mecanismo licenciado de exibição.
5. **Prestação de contas:** definir ciclo, responsável, instituição e padrão de
   comprovante.
6. **Persistência do MVP:** o contexto inicial menciona armazenamento local,
   mas progresso, respostas e acesso precisam ser sincronizados no servidor
   para funcionar com segurança em mais de um dispositivo.
