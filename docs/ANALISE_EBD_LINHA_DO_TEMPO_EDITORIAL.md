# Análise funcional — linha do tempo editorial da EBD

Data da análise: 2 de agosto de 2026  
Fuso editorial canônico: `America/Sao_Paulo`

## 1. Resultado esperado

A entrada da EBD deve sempre resolver primeiro o **contexto editorial atual**:

1. a semana vigente determina a lição em destaque;
2. o dia vigente determina o conteúdo recomendado dentro da lição;
3. o progresso do usuário determina apenas o texto e o destino do CTA;
4. a última lição acessada nunca substitui automaticamente a lição da semana;
5. semanas encerradas permanecem publicadas, porém migram visualmente para o arquivo.

O sistema deve tratar três conceitos como dados diferentes:

- **publicação operacional**: quando uma versão foi publicada ou corrigida;
- **vigência editorial**: em qual intervalo aquela lição é a lição atual;
- **progresso pessoal**: onde cada usuário parou dentro de cada lição.

### Regra preservada de publicação diária

A vigência semanal define qual lição está em destaque, mas não obriga a publicação
conjunta dos sete dias. Cada dia é uma unidade editorial publicável e pode ser
liberado quando estiver pronto. Os demais permanecem fora de acesso até sua própria
publicação ou agendamento. A ação “publicar semana” é uma conveniência opcional,
nunca a regra principal.

## 2. Diagnóstico do comportamento atual

### Achado crítico — seleção por evento de publicação

`getPublishedEditorialLesson()` filtra lições com status `published`, ordena por
`publicado_em` decrescente e retorna apenas a primeira. Essa regra responde à
pergunta “qual registro foi publicado ou alterado por último?”, e não à pergunta
“qual lição pertence à semana atual?”.

Impacto: a lição 05 pode permanecer em destaque quando a lição 06 já deveria ser
a vigente. Uma republicação, correção ou antecipação também pode trocar o destaque
sem relação com o calendário da EBD.

### Achado crítico — “Publicar dia agora” altera a ordenação global

A RPC `ebd_antecipar_dia_publicado` altera somente o desbloqueio do dia, mas também
define `publicado_em = now()`. Como a consulta pública usa esse campo para escolher
o destaque, antecipar um dia de qualquer lição publicada pode transformá-la na
“lição atual”.

### Achado alto — o período existe apenas como texto de apresentação

O documento possui `periodLabel`, mas não possui campos canônicos e consultáveis
para início e fim da semana. Texto como “Semana de 3 a 9 de agosto” serve para a
interface, mas não deve ser usado como regra de calendário.

### Achado alto — “continuar” prioriza pendência, não o dia editorial

Dentro de uma lição, `EbdJourney` encontra o primeiro dia disponível ainda não
concluído e o apresenta como “Continuar jornada”. Isso é útil para retomada, mas
pode fazer uma pessoa abrir na sexta-feira e receber segunda-feira como o conteúdo
principal. A recomendação do dia e a retomada de pendência precisam ser ações
distintas.

### Achado médio — não há arquitetura pública de arquivo

A entrada pública renderiza uma única lição editorial. As anteriores não possuem
uma biblioteca/timeline explícita para consulta. Isso força uma escolha binária:
ou a lição antiga toma o destaque, ou desaparece da experiência.

## 3. Regra editorial canônica

Cada lição publicada deve possuir, em colunas próprias e indexáveis:

- `vigencia_inicio timestamptz`;
- `vigencia_fim timestamptz` (limite exclusivo);
- `fuso_horario text default 'America/Sao_Paulo'`;
- opcionalmente `prioridade_editorial integer default 0` para exceções auditadas.

Para uma semana de segunda a domingo:

- início: segunda-feira, 00:00, horário de São Paulo;
- fim: segunda-feira seguinte, 00:00, horário de São Paulo;
- condição da atual: `inicio <= agora AND agora < fim`;
- “publicada” é condição de visibilidade, não condição de atualidade.

Deve ser proibida a sobreposição entre vigências de duas lições publicadas. A
validação precisa ocorrer no banco/RPC, porque dois administradores podem publicar
simultaneamente.

## 4. Linha do tempo editorial recomendada

| Momento | Estado editorial | Exibição ao usuário |
|---|---|---|
| T-14 a T-8 | Rascunho | Invisível |
| T-7 a T-3 | Revisão | Invisível; disponível no Estúdio |
| T-2 a T-1 | Publicada e futura | Teaser discreto “Próxima lição”, se desejado |
| Segunda 00:00 | Vigente | Assume automaticamente o destaque principal |
| Durante a semana | Vigente | Dia atual em destaque; dias anteriores e disponíveis acessíveis |
| Após domingo | Anterior | Sai do hero e entra em “Lições anteriores” |
| Meses anteriores | Arquivo | Agrupada por mês/ano, pesquisável e fora do primeiro foco |
| Arquivada administrativamente | Retirada | Não aparece ao público; preservada para governança |

“Anterior” deve ser derivado da vigência. Não se deve alterar automaticamente o
status para `archived`, porque arquivamento administrativo significa retirada, e
não simplesmente passagem do tempo.

## 5. Hierarquia funcional da tela EBD

### 1 — Semana atual (foco dominante)

- selo textual “Semana atual”; 
- “Lição 06” + título + período real;
- resumo curto, sem competir com o conteúdo;
- progresso exclusivo daquela lição;
- CTA principal contextual.

Comportamento do CTA:

- se o conteúdo de hoje não foi iniciado: **Começar o conteúdo de hoje**;
- se foi iniciado: **Continuar o conteúdo de hoje**;
- se o dia está concluído e há pendência anterior: **Revisar pendência** como ação secundária;
- se toda a semana foi concluída: **Rever a lição**.

### 2 — Navegação pelos sete dias

- o dia calendário atual recebe o destaque, independentemente da última visita;
- dias concluídos mantêm marca de conclusão;
- dias futuros bloqueados comunicam data de liberação;
- dias anteriores permanecem acessíveis;
- estado atual, conclusão e bloqueio devem ter texto/ícone, não apenas cor.

### 3 — Retomada pessoal (secundária)

Se o usuário parou na sexta-feira da lição 05 e abre o app durante a lição 06:

- o hero mostra a lição 06;
- pode existir um card discreto “Você deixou a lição 05 incompleta”; 
- esse card nunca substitui o destaque da semana atual.

### 4 — Lições anteriores (fora de foco, mas disponíveis)

- primeira linha: “Rever a semana passada”; 
- abaixo: agrupamento por mês e ano;
- cards compactos com número, título, período e percentual pessoal;
- busca por tema, referência bíblica e número da lição;
- ao abrir uma anterior, cabeçalho explícito “Arquivo · semana de …”.

## 6. Resolução de conteúdo no aplicativo

Ao abrir a EBD, retornar do segundo plano, mudar de dia ou receber atualização em
tempo real, o cliente deve consultar novamente a linha do tempo. A resposta ideal
é produzida no servidor:

```text
EBD timeline
├── current: lição vigente ou null
├── today: dia canônico da lição vigente
├── next: próxima lição publicada e futura ou null
├── previous: lição encerrada mais recente ou null
└── archive: lista paginada de lições encerradas
```

O relógio do banco deve definir a vigência; o relógio do aparelho pode estar
incorreto. O cliente usa o fuso recebido para apresentação e para programar uma
nova consulta na próxima virada relevante.

## 7. Estado e persistência

O progresso já é separado por `lesson.id`, o que é uma base correta, mas deve ser
sincronizado com o perfil para funcionar em mais de um dispositivo. Separar:

- `currentLessonId`: sempre derivado do servidor;
- `todayDayId`: derivado da vigência e do fuso;
- `lastVisitedDayId`: retomada pessoal dentro da mesma lição;
- `completedBlocks`: progresso por lição;
- `lastSeenAt`: útil para mensagens de retorno, nunca para eleger o hero.

## 8. Exceções obrigatórias

- **Nenhuma lição vigente:** mostrar “A próxima lição está em preparação” e oferecer
  a anterior; não apresentar a anterior como se fosse atual.
- **Duas lições sobrepostas:** bloquear publicação e informar o conflito no Estúdio.
- **Lição futura publicada antecipadamente:** permanece em “Próxima”, sem tomar o hero.
- **Correção em lição antiga:** atualiza versão e auditoria, sem mudar sua vigência.
- **Publicar dia agora:** libera somente o dia selecionado; não altera a posição da
  lição na timeline.
- **Publicar semana agora:** libera os dias, mas só assume o hero se a vigência também
  incluir o momento atual. Se a intenção for mudar a vigência, exigir confirmação
  editorial separada e auditada.

## 9. Engenharia de conteúdo e RAG

Cada geração deve receber metadados da semana e não apenas o texto do tema:

- número e ID canônico da lição;
- início/fim da vigência;
- objetivo semanal;
- objetivo específico do dia;
- audiência, tom e fonte editorial;
- referências permitidas e proveniência.

Conteúdo de semanas anteriores pode participar do RAG para continuidade, mas deve
ser marcado como histórico e ter peso inferior ao material da lição ativa. A IA não
deve misturar automaticamente objetivos, versículos ou missões de outra semana.

## 10. Plano de implementação recomendado

1. Adicionar vigência canônica às lições e migrar os registros existentes.
2. Criar validação de sobreposição e índices temporais no banco.
3. Criar RPC/view de timeline com `current`, `next`, `previous` e arquivo paginado.
4. Substituir `getPublishedEditorialLesson()` por resolução de lição vigente.
5. Remover a atualização de `publicado_em` da regra que antecipa apenas um dia, ou
   deixar de usar esse campo para ordenação editorial.
6. Separar “conteúdo de hoje” de “continuar pendência” em `EbdJourney`.
7. Implementar hero atual + arquivo mensal e estados vazios.
8. Atualizar o Estúdio com vigência, conflito, pré-visualização e confirmação.
9. Cobrir virada de semana, fuso, republicação, sobreposição e ausência de vigente
   com testes de banco e frontend.

## 11. Critérios de aceite essenciais

- Às 00:00 de segunda-feira em São Paulo, a nova lição assume o destaque sem novo APK.
- Abrir o app após dias sem uso sempre mostra a semana vigente.
- O progresso da lição 05 não faz a lição 05 ocupar o hero durante a lição 06.
- Antecipar ou corrigir conteúdo antigo não altera a lição atual.
- Toda lição anterior publicada pode ser encontrada no arquivo.
- Uma lição antiga aberta é identificada visual e textualmente como arquivo.
- Não é possível publicar duas lições com vigências sobrepostas.
- Sem lição vigente, a interface não rotula uma lição antiga como atual.

## 12. Evidência e limite desta análise

O diagnóstico estrutural foi confirmado no serviço, no renderer da jornada, nos
tipos editoriais e na RPC de antecipação. A auditoria visual final da tela ainda
precisa de capturas atuais da entrada da EBD e da navegação dos dias; nenhuma
conclusão visual foi inventada sem essa evidência.

## 13. Estado em 10/08/2026

A publicação diária recebeu mitigações para IDs legados e continuidade de
edição dos dias ainda bloqueados. A geração também passou a usar o roteiro
semanal e fontes RAG vinculadas para coerência entre os recortes de segunda a
sábado; domingo foi reservado para atividade especial.

O modelo de vigência proposto neste documento **ainda não foi implementado**. A
consulta pública continua escolhendo pela sequência/número publicado, e não por
`vigencia_inicio`/`vigencia_fim`. Este documento continua sendo a especificação
recomendada para a próxima correção estrutural.
