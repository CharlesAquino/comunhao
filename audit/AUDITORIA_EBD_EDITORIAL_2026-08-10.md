# Auditoria completa — Editorial EBD

**Data:** 10/08/2026  
**Modo de evidência:** inspeção estática do frontend, serviços, migrations, RLS/RPCs, PWA e testes locais.  
**Escopo:** Estúdio Editorial (`/admin/ebd-studio`), publicação, consumo em `/ebd`, Realtime, cache offline, progresso e recompensas.  
**Limite:** o ambiente Supabase remoto e um fluxo autenticado no navegador não foram inspecionados; migrations locais não provam o schema remoto. O histórico Git também não estava disponível no workspace montado.

## Veredito

**Saúde geral: crítica.** A feature compila e os testes existentes passam, mas o fluxo editorial não é transacional de ponta a ponta, o estado do leitor pode atravessar lições/versões indevidamente e a seleção da “lição atual” usa uma aproximação (`numero`) em vez de vigência editorial. Esses três pontos explicam regressões que reaparecem depois de publicação, Realtime ou mudança de dia.

## Fluxo auditado

| Etapa | Descrição | Saúde |
|---|---|---|
| 1 | Acessar o Estúdio e carregar permissões/lições | Atenção |
| 2 | Criar e editar rascunho | Crítica |
| 3 | Gerar conteúdo e enviar mídia | Atenção |
| 4 | Salvar e enviar para revisão | Crítica |
| 5 | Revisar e devolver para ajustes | Atenção |
| 6 | Publicar semana agendada | Crítica |
| 7 | Publicar semana/dia imediatamente | Crítica |
| 8 | Selecionar e entregar a lição vigente em `/ebd` | Crítica |
| 9 | Atualizar publicação via Realtime/cache offline | Crítica |
| 10 | Sincronizar progresso e recompensas | Crítica |
| 11 | Recuperar de erro/conflito | Crítica |
| 12 | Impedir regressões por testes | Crítica |

## Achados prioritários

### P0 — Progresso pode vazar entre lições e versões

`EbdJourney` inicializa o estado local apenas na montagem. A página renderiza o componente sem `key`; quando o Realtime troca a lição publicada, a instância pode ser reutilizada e manter `progress` da lição anterior. Além disso, `hydratedRef` não volta para `false` quando `lesson.id` ou `lesson.version` muda. O efeito de persistência pode gravar o progresso antigo sob a nova chave antes de terminar a hidratação remota.

**Impacto:** blocos aparecem concluídos indevidamente, respostas privadas podem ser associadas à lição errada, progresso pode “voltar” horas depois e recompensas podem se comportar de forma inconsistente.

**Evidência:** `src/pages/EBD.tsx:251-252`; `src/components/ebd/EbdJourney.tsx:196-233`; `src/services/ebdProgressService.ts:28-64`.

### P0 — “Lição atual” não possui contrato de vigência

A consulta escolhe qualquer registro `published` com o maior `numero`. Uma lição futura, publicada antecipadamente para respeitar o agendamento diário, passa a ser a lição principal imediatamente. A própria observação no serviço reconhece que não existem colunas canônicas de vigência.

**Impacto:** uma lição correta pode sumir e outra semana assumir o destaque; como os dias futuros ficam bloqueados, o usuário percebe a EBD como quebrada. O problema reaparece naturalmente após publicação ou virada de agenda.

**Evidência:** `src/services/ebdEditorialService.ts:70-84`.

### P0 — Salvar + revisar/publicar não é uma operação atômica

O envio para revisão chama `save()`, mas `save()` captura e engole a falha. Mesmo se o salvamento falhar, `sendToReview()` continua e tenta mudar o status. Publicação também executa update direto e RPC em duas transações separadas. Uma falha intermediária deixa UI, documento e status divergentes.

**Impacto:** o usuário recebe estados contraditórios, conteúdo antigo pode ser revisado/publicado e uma tentativa posterior parece “desfazer” a correção.

**Evidência:** `src/pages/EbdStudio.tsx:306-334`, `336-369`, `402-425`; `src/services/ebdEditorialService.ts:110-120`, `168-187`.

### P0 — Publicação de dia permite publicar documento globalmente incompleto

O cliente exige somente que o dia selecionado tenha título e um bloco. A RPC `ebd_publicar_dia_editorial` aceita qualquer lição não arquivada e o validador SQL exige sete arrays, mas não exige título nem blocos nos outros seis dias. A publicação muda o status da lição inteira para `published`.

**Impacto:** a “publicação diária incremental” pode tornar pública uma jornada com dias vazios. A tela do leitor calcula um dia vazio como indisponível e pode escolher um cartão “Continuar jornada” vazio ou apontar para um dia inadequado.

**Evidência:** `src/pages/EbdStudio.tsx:428-448`; `supabase/migrations/20260802224500_ebd_publicacao_diaria_incremental.sql:31-37,51-90`; `supabase/migrations/20260730130000_security_sentinel_phase1.sql:591-664`.

### P1 — Concorrência é tratada de três maneiras diferentes

Publicar uma lição e publicar um dia relê a versão atual no serviço; antecipar a semana usa a versão possivelmente obsoleta guardada no React. Somente a publicação diária traduz `EBD_VERSION_CONFLICT` para mensagem útil. O fluxo semanal devolve erro técnico bruto e não recarrega automaticamente.

**Impacto:** operações após Realtime, outra aba ou outro editor falham de modo intermitente; o comportamento muda conforme o botão escolhido.

**Evidência:** `src/services/ebdEditorialService.ts:168-226`; `src/services/ebdEditorialErrors.ts:7-27`; `src/pages/EbdStudio.tsx:383-399`.

### P1 — Controles editáveis aparecem para perfis que não podem salvar

Depois de `ebd.read`, campos, editor de blocos, upload e IA permanecem interativos. Apenas os botões principais são condicionados por `canManage`. Um revisor/publicador pode gastar tempo editando localmente e descobrir que não existe ação válida para persistir. O upload pode ainda criar mídia órfã antes da falha de salvamento.

**Impacto:** perda de trabalho, falsa sensação de permissão e acúmulo de arquivos sem referência.

**Evidência:** `src/pages/EbdStudio.tsx:577-587,682-818`; condições de permissão em `src/pages/EbdStudio.tsx:605,673-677,1087-1107`.

### P1 — Realtime falha silenciosamente e não invalida o cache antigo

A assinatura ignora qualquer erro na nova consulta. `cacheEditorialLesson(null)` não remove a lição anterior. Assim, indisponibilidade, arquivamento ou ausência de publicação podem manter indefinidamente um snapshot antigo no dispositivo.

**Impacto:** usuários diferentes enxergam versões distintas; uma correção parece funcionar e depois “volta” ao abrir offline ou após falha de rede.

**Evidência:** `src/pages/EBD.tsx:51-76`; `src/services/ebdProgressService.ts:14-25`.

### P1 — Recompensa do dia tem condição de corrida no frontend

`rewardDayCompletion()` usa o `progress` capturado antes da conclusão. Cliques/ações próximas podem iniciar mais de uma chamada antes de `rewardedDays` ser persistido. A proteção real depende totalmente da idempotência de serviços/RPCs externos ao componente; o frontend não bloqueia a ação durante processamento.

**Impacto:** mensagens duplicadas, tentativas duplicadas e estado local divergente quando uma das duas recompensas (`Kesef` ou XP) falha.

**Evidência:** `src/components/ebd/EbdJourney.tsx:250-305`.

### P1 — Critério de conclusão é vulnerável a IDs obsoletos

O serviço marca a lição concluída comparando apenas a quantidade de IDs concluídos com a quantidade atual de blocos obrigatórios. IDs antigos preservados após edição podem inflar a contagem; não há interseção com os IDs válidos da versão.

**Impacto:** conclusão falsa em versões revisadas e métricas editoriais incorretas.

**Evidência:** `src/services/ebdProgressService.ts:44-64`.

### P2 — A validação editorial mede presença superficial, não publicabilidade

Frontend e SQL não validam de maneira completa quiz, URL/data de liberação, IDs únicos, texto obrigatório, `altText`, perguntas, alternativas e respostas corretas. `new Date(valor inválido).getTime()` vira `NaN`, deixando o dia bloqueado sem diagnóstico.

**Impacto:** documentos estruturalmente aceitos podem quebrar ou ficar inutilizáveis somente quando o dia é liberado.

**Evidência:** `src/pages/EbdStudio.tsx:193-207`; `src/components/ebd/EbdJourney.tsx:50-58`; `supabase/migrations/20260730130000_security_sentinel_phase1.sql:591-664`.

### P2 — Cobertura de testes não representa o fluxo crítico

A suíte passou com **33 arquivos / 152 testes**, porém a cobertura EBD direta contém apenas 6 testes: normalização e mapeamento de erros. Não há teste de serviço com Supabase simulado, máquina de estados, concorrência, Realtime, troca de versão, cache, RLS/RPC nem jornada do usuário.

**Impacto:** correções locais passam CI sem proteger contra a próxima regressão.

**Evidência:** `src/test/ebdEditorialNormalization.test.ts`; `src/test/ebdEditorialPublication.test.ts`.

## Pontos positivos confirmados

- Há separação entre componentes e serviços.
- RLS, permissões granulares, RPCs `SECURITY DEFINER`, controle otimista, auditoria e snapshots versionados já existem como fundação.
- A publicação diária usa lock de linha e versão esperada no banco.
- O documento é normalizado para os sete dias e rótulos canônicos.
- O build de produção e os 152 testes passam.
- A PWA não aplica cache de runtime às chamadas Supabase; o risco de conteúdo antigo vem do cache explícito em `localStorage`, não do Workbox.

## Plano de correção recomendado

1. **Estabilizar identidade e vigência:** adicionar vigência canônica (`vigente_de`, `vigente_ate` ou `semana_referencia`) e uma RPC/view única para “lição vigente”. Não escolher por `numero`.
2. **Unificar comandos editoriais:** salvar+enviar, salvar+publicar e publicar-dia devem ser RPCs atômicas com documento, versão esperada e resposta completa; eliminar sequências de update direto + RPC.
3. **Corrigir ciclo do progresso:** remontar por `lesson.id:version`, reinicializar estado e `hydratedRef`, impedir persistência antes da hidratação e filtrar IDs pela versão atual.
4. **Definir publicação incremental:** distinguir status da lição de status de cada dia; uma lição não deve se tornar integralmente pública porque um único dia foi liberado.
5. **Tornar permissões explícitas na UI:** modo somente leitura real para revisão; nenhum campo/upload/IA editável sem `ebd.manage`.
6. **Padronizar conflito e recuperação:** reler versão em todos os comandos, traduzir todos os tokens, recarregar o documento e oferecer comparação antes de descartar mudanças locais.
7. **Endurecer validação:** schema compartilhado e testes para datas, IDs únicos, blocos, quiz, mídia e acessibilidade editorial.
8. **Criar testes de contrato:** matriz papel × ação × status; transições e concorrência no SQL; teste React de Realtime/troca de versão/cache; E2E do fluxo completo.

## Verificações executadas

- `npm test -- --run`: 33 arquivos, 152 testes aprovados.
- `npm run lint`: concluído com avisos; dois avisos atingem EBD (`EBD.tsx` e `EbdStudio.tsx`, dependências de hooks).
- `npm run build`: build Vite/PWA concluído.

## Verificações ainda obrigatórias antes de declarar resolvido

- Comparar checksums/definições das RPCs e policies do Supabase remoto com as migrations locais.
- Executar o fluxo com contas `editor_ebd`, `revisor_ebd`, administrador e membro.
- Simular duas abas publicando a mesma lição.
- Manter `/ebd` aberta durante publicação, republicação, troca de semana e falha de rede.
- Validar troca de lição/versão com progresso e respostas privadas existentes.
- Testar virada de dia no fuso `America/Sao_Paulo` e datas gravadas sem offset pelo `datetime-local`.
- Testar offline → online e remoção/arquivamento da publicação atual.

## Adenda de mitigação — fim de 10/08/2026

Esta auditoria permanece válida como fotografia do estado encontrado. Depois
dela, foram implementadas as seguintes mitigações:

- normalização de IDs duplicados e publicação pelo índice canônico do dia;
- RPC para salvar dias ainda não liberados após a primeira publicação;
- separação visual entre salvar, revisar, liberar dia e publicar semana;
- Estúdio reorganizado para desktop/mobile;
- geração seletiva de blocos com fontes RAG vinculadas e coerência semanal;
- segunda a sábado como contagem de produção; domingo reservado;
- imagens com composição preservada;
- 34 arquivos / 158 testes aprovados e migrations remotas alinhadas.

Não foram encerrados por essas mitigações: vigência canônica, separação
estrutural do estado por dia, progresso por `lesson.id:version`, concorrência no
salvamento normal, validação completa e E2E autenticado. Portanto, o veredito
histórico não deve ser simplesmente marcado como resolvido.

Registro consolidado: `../docs/SESSAO_2026-08-10_REGISTRO_COMPLETO.md`.
