# Comunhão Estudos — PRD e plano de implementação

## Visão

Uma aba de estudo bíblico para jovens com linguagem de streaming, mas orientada a aprendizagem, comunidade, acompanhamento pastoral e aplicação prática.

**Princípio:** streaming para descobrir; microlearning para aprender; comunidade para aprofundar; missão para aplicar.

## MVP

- Home de Estudos com destaque, continuação, novidades, biblioteca e encontro;
- trilhas, cursos, módulos, aulas e blocos;
- sessões de 8–12 minutos;
- vídeos principais de 3–6 minutos e flashes de 30–90 segundos;
- Escritura, contexto histórico, curiosidade, pergunta e aplicação;
- progresso individual/coletivo e biblioteca de descobertas;
- encontro semanal ao vivo com o pastor;
- perguntas prévias e durante a aula;
- replay moderado, missão semanal e projeto final.

Ficam fora inicialmente: recomendação algorítmica, ranking complexo e
marketplace de cursos. IA generativa é permitida somente no Studio como apoio
editorial com RAG, revisão humana e sem publicação automática.

## Estrutura editorial

```text
Catálogo → Trilha → Curso certificável → Módulo → Aula
                                                   ├─ Blocos
                                                   ├─ Encontro
                                                   └─ Missão
```

O card do catálogo representa sempre um curso, nunca uma aula isolada. Tags
servem somente a busca e filtros. Essa hierarquia é obrigatória para impedir um
acervo de conteúdos paralelos sem sequência formativa.

O Content Engine deve evoluir do Estúdio EBD existente, compartilhando Memória
Sistêmica RAG, indexação, controles de segurança e princípios editoriais. O
contrato de curso, módulo, aula e blocos permanece próprio de Estudos. Não criar
uma segunda biblioteca de conhecimento nem um pipeline paralelo de IA.

Blocos novos: `video`, `flashcard`, `context`, `question`, `source`, `poll`, `live` e `assignment`.

## Experiência do jovem

1. Home estilo streaming.
2. Página da série com temporadas e progresso.
3. Episódio com player, Escritura, contexto, curiosidade, pergunta, aplicação e conclusão.
4. Biblioteca de personagens, lugares, eventos, doutrinas e termos.
5. Encontro com lembrete, perguntas, entrada na sala e replay.
6. Missão semanal com entrega opcional em texto, áudio, vídeo ou imagem.
7. Projeto final individual ou em grupo.

Toda sessão deve verificar compreensão com linguagem natural e incluir uma
aplicação. A expressão “pergunta de recuperação” não aparece para o jovem. Não
premiar apenas tempo de reprodução.

## Encontro da Semana

Roteiro de 60 minutos: 5 min abertura, 10 min revisão, 20 min aprofundamento, 15 min perguntas, 5 min missão e 5 min encerramento.

O painel pastoral exibe conclusão da turma, questões com maior erro e temas recorrentes de forma agregada. A gravação gera replay, resumo e cortes editoriais moderados.

## Ritmo semanal

```text
Seg episódio | Ter contexto | Qua revisão | Qui preparação
Sex encontro   | Sáb missão  | Dom revisão
```

A vigência semanal deve impedir que conteúdo futuro substitua o episódio atual.

## Arquitetura

Domínio vigente: `estudos_trilhas`, `estudos_cursos`, `estudos_modulos`,
`estudos_aulas`, `estudos_aula_blocos`, `estudos_aula_progresso`,
`estudos_matriculas`, `estudos_certificados`, atribuições e manifestações
pastorais por curso, vínculos RAG e auditoria de gerações assistidas. Encontros
e entregas especializadas podem ser acrescentados depois sem alterar a
hierarquia principal.

A geração de aula usa fontes explicitamente vinculadas ao curso nos escopos
`estudos`, `global`, `ebd` ou `formacao`. A Edge Function exige
`estudos.manage`, rate limit, idempotência, circuit breaker e curso em rascunho.
O resultado é aplicado como rascunho editável; salvar, revisar e publicar são
ações humanas separadas.

Progresso, perguntas e entregas devem ter RLS por titular. Conteúdo só fica público quando publicado e vigente. Entregas multimídia exigem limites, moderação, retenção e consentimento.

## Plano sequencial

### Fase 0 — validação editorial

Escolher temporada piloto de quatro semanas, definir tradução, fontes e tom, produzir três episódios e seis flashes, testar compreensão.

**Saída:** pauta e métricas aprovadas.

### Fase 1 — fundação técnica

Extrair blocos compartilhados do EBD, criar hierarquia de conteúdo, vigência semanal, progresso RLS e testes unitários/RLS/E2E.

**Saída:** episódio completo em teste.

### Fase 2 — interface do jovem

Criar aba Estudos, Home, série, player, progresso, biblioteca e responsividade nos dois temas e tablets.

**Saída:** jornada individual completa.

### Fase 3 — encontro semanal

Agenda, lembrete, integração com sala existente, perguntas, painel pastoral e replay moderado.

**Saída:** primeiro encontro piloto.

### Fase 4 — missão e projeto final

Missão semanal, entregas multimídia, grupos opcionais, avaliação pastoral e conclusão de temporada.

**Saída:** temporada piloto concluída.

### Fase 5 — escala controlada

Analisar retenção, conclusão, erros, presença, custos e abandono; otimizar mídia/cache/bundle e publicar novas temporadas com checklist de qualidade.

## Métricas

Início e conclusão do episódio, acerto na revisão, retorno semanal, presença no encontro, perguntas, missão, projeto final e abandono por dispositivo.

Não coletar conteúdo de conversas ou comportamento fora do necessário para esses indicadores.

## Critério de pronto

Conteúdo revisado, vigência correta, RLS e E2E aprovados, dois temas, tablet validado, encontro realizado, replay moderado, métricas registradas e rollback documentado.
