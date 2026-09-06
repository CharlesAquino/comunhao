# Auditoria do fluxo de publicação EBD

Data: 10/08/2026  
Modo de evidência: inspeção estática do frontend, serviços, RPCs SQL e consumidor público.  
Limite: estados visuais, foco, teclado e comportamento real em navegador não foram verificados nesta rodada.

## Objetivo do usuário

Permitir que um gestor produza uma lição, envie para revisão e publique a semana inteira ou somente um dia, com previsibilidade sobre o que ficará visível aos alunos.

## Veredito

O núcleo transacional da publicação semanal é forte: permissões, máquina de estados, idempotência, auditoria e versões estão presentes no banco. O fluxo incremental por dia, porém, conflita com a imutabilidade de uma lição publicada; e a regra que escolhe a lição exibida aos alunos não possui vigência semanal explícita. Estes dois pontos podem causar perda de rascunho ou exibição da semana errada.

## Etapas auditadas

### 1. Editar e salvar rascunho — saúde: atenção

- O salvamento atualiza diretamente o documento, sem versão esperada ou detecção de edição concorrente.
- Dois editores podem sobrescrever o trabalho um do outro; `versao` aumenta apenas na publicação.
- Correção aplicada nesta auditoria: `save()` passou a devolver sucesso/falha, impedindo avanço silencioso para revisão quando o salvamento falha.

Evidência: `src/pages/EbdStudio.tsx:339`; `src/services/ebdEditorialService.ts:110`.

### 2. Enviar para revisão — saúde: boa, com lacuna de validação

- O banco exige permissão `ebd.manage`, estado `draft`, motivo, rate limit e idempotência.
- A transição é auditada.
- A validação do documento confirma sete dias e tipos permitidos, mas não exige título, conteúdo dos blocos, quiz válido, mídia ou agendamento.
- A interface verifica apenas título do dia e existência de pelo menos um bloco; um bloco vazio ainda conta como completo.

Evidência: `supabase/migrations/20260730130000_security_sentinel_phase1.sql:739`; `supabase/migrations/20260730130000_security_sentinel_phase1.sql:591`; `src/pages/EbdStudio.tsx:208`.

### 3. Revisar ou devolver ao rascunho — saúde: boa

- O retorno exige permissão de revisão/publicação e motivo com tamanho mínimo.
- A transição `review -> draft` é validada e auditada no banco.
- O histórico mostra versão e data, mas não permite comparar nem restaurar uma versão.

Evidência: `supabase/migrations/20260730130000_security_sentinel_phase1.sql:840`; `src/pages/EbdStudio.tsx:1416`.

### 4. Publicar semana agendada — saúde: risco alto

- A publicação segura exige `review`, permissão `ebd.publish`, versão esperada, idempotência e auditoria.
- A interface chama a operação somente no estado correto apó a correção desta auditoria.
- Risco crítico: no consumidor, um dia sem `unlocksAt` é considerado disponível. Como a completude não exige data, publicar como “agendado” pode liberar dias imediatamente.

Evidência: `supabase/migrations/20260730130000_security_sentinel_phase1.sql:1014`; `src/components/ebd/EbdJourney.tsx:50`; `src/pages/EbdStudio.tsx:372`.

### 5. Liberar apenas um dia — saúde: funcional apó correção, com risco estrutural

- O banco aceita publicar um dia de uma lição em `draft`, `review` ou `published`, valida o dia, cria versão e registra auditoria.
- Correção aplicada: o botão não é mais desativado por `releaseMode = immediate`; o RPC normaliza a publicação individual para `scheduled`.
- Correção aplicada: botões de semana não aparecem mais em estados nos quais seriam recusados.
- Risco alto: publicar o primeiro dia muda a lição inteira para `published`. A proteção de imutabilidade impede salvar normalmente os rascunhos dos dias seguintes. Esses rascunhos podem existir apenas na memória do navegador até sua publicação e ser perdidos ao fechar ou recarregar.

Evidência: `src/pages/EbdStudio.tsx:465`; `src/pages/EbdStudio.tsx:1219`; `supabase/migrations/20260802224500_ebd_publicacao_diaria_incremental.sql:1`; `supabase/migrations/20260730130000_security_sentinel_phase1.sql:703`.

### 6. Publicar semana imediatamente — saúde: boa, com risco de seleção pública

- Para uma lição em revisão, salva `releaseMode = immediate` e usa a publicação segura.
- Para uma lição já publicada, usa RPC específica com controle de versão, idempotência e auditoria.
- Risco crítico: o aplicativo escolhe a lição publicada de maior número, não a lição cuja vigência inclui a data atual. Publicar antecipadamente um único dia de uma lição futura pode substituir a semana corrente para todos os alunos.

Evidência: `src/services/ebdEditorialService.ts:70`; `supabase/migrations/20260802223000_ebd_antecipar_semana_publicada.sql:1`.

## Pontos fortes confirmados

- Permissões distintas para editar, revisar e publicar.
- Transições protegidas no banco, não somente na interface.
- Idempotência, rate limit e trilha de auditoria nas operações críticas.
- Snapshot imutável a cada publicação.
- Controle de versão nas RPCs de publicação.
- Confirmação antes de liberar conteúdo aos alunos.

## Riscos priorizados

1. **P0 — Lição errada em produção:** seleção pública pelo maior número, sem `valid_from`/`valid_until`.
2. **P0 — Agendamento falso:** `unlocksAt` vazio significa disponibilidade imediata.
3. **P1 — Perda de rascunhos apó publicar segunda-feira:** estado global `published` bloqueia salvamento normal dos dias futuros.
4. **P1 — Conteúdo incompleto pode passar:** validador estrutural não verifica campos essenciais dos blocos.
5. **P1 — Sobrescrita entre editores:** salvamento de rascunho sem controle otimista.
6. **P2 — Histórico sem recuperação:** versões podem ser vistas, mas não comparadas ou restauradas.
7. **P2 — RPC legada exposta:** `publicar_ebd_editorial(text)` ainda existe e é executável, embora o fluxo atual use a variante segura; deve ser revogada/removida para reduzir superfície e ambiguidade.

## Recomendações

1. Persistir vigência da lição (`valid_from`, `valid_until`) e selecionar a lição pública por data, com restrição contra sobreposição.
2. Exigir `unlocksAt` válido para cada dia na publicação agendada; nunca interpretar data ausente como liberação imediata.
3. Separar estado da lição do estado de cada dia (`draft`, `review`, `published`) ou manter um `working_document` editável separado do snapshot publicado.
4. Fortalecer `ebd_validar_documento` com validação por tipo de bloco e mensagens acionáveis.
5. Adicionar `updated_at`/revisão esperada ao salvamento e rejeitar sobrescrita concorrente.
6. Criar comparação e restauração de versões com nova revisão, sem apagar histórico.
7. Substituir confirmações genéricas por um resumo de impacto: lição, dia, modo, horário e audiência.

## Acessibilidade e limites

- Os botões usam elementos semânticos e estados `disabled`, o que é positivo.
- Os fluxos usam `window.confirm` e `window.prompt`; o comportamento visual e de foco depende do navegador e não foi verificado.
- Não foi possível confirmar contraste, ordem de foco, anúncios de toast ou reflow por inspeção estática.

## Adenda de implementação — fim de 10/08/2026

Após esta auditoria, as migrations `20260810211500` e `20260810213000` foram
aplicadas remotamente. A primeira publica o dia pela posição canônica da semana;
a segunda permite salvar um dia futuro ainda bloqueado em uma lição que já teve
outro dia publicado. A interface também passou a separar com maior clareza as
ações editoriais e a considerar seis conteúdos semanais mais o domingo especial.

Essas mudanças mitigam a impossibilidade observada de continuar a produção após
publicar segunda-feira. Não substituem a recomendação arquitetural de separar
estado por dia nem resolvem a seleção pública por vigência semanal, que seguem
como P0/P1 do produto.

Registro consolidado: `../docs/SESSAO_2026-08-10_REGISTRO_COMPLETO.md`.
