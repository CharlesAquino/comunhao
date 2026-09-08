# Sessão de 07/09/2026 — Pacotes Editoriais EBD Prontos e Fluxo Gradual

> Registro histórico append-only. Consolida decisões arquiteturais, implementação,
> diagnóstico de incidentes, resolução técnica e estado de retomada da sessão.
> Nenhuma credencial, segredo ou dado sensível foi incluído.

---

## 1. Contexto e Diagnóstico do Gargalo

### 1.1 O Gargalo Original
A geração editorial dependia de Edge Functions (`gerar-dia-ebd`) que acionavam modelos externos de IA em cascata (Cloudflare, NVIDIA, Gemini, Groq). Em produção, todos os provedores apresentaram falhas simultâneas:
- **Cloudflare**: quantidade incorreta de blocos retornados.
- **NVIDIA**: credencial rejeitada no gateway.
- **Gemini**: modelo indisponível / cota.
- **Groq**: rejeição na validação editorial e limite de requisições excedido.

Além disso, o fluxo descartava a geração inteira ao menor desvio de qualidade ou quantidade de blocos, deixando o Estúdio vazio.

### 1.2 Decisão Estrutural
O conteúdo das lições já é pesquisado, preparado e estruturado previamente pelo GPT Astra com base nas fontes e na declaração de fé da CGADB. Exigir que uma segunda IA generativa reescrevesse todo o material era redundante, custoso e frágil.

**Nova Arquitetura:**
1. **Astra**: Gera o pacote canônico semanal completo (JSON por dia de segunda a sábado com os 10 blocos canônicos cada, totalizando 60 blocos, mais manifesto opcional).
2. **Estúdio EBD**: Importa os arquivos diretamente por código (determinístico, sem chamadas de IA).
3. **Biblioteca Privada**: Guarda as revisões completas na tabela segura `public.ebd_source_days`.
4. **Seleção & Aplicação**: O gestor escolhe quais blocos deseja aplicar ao rascunho de cada dia.
5. **Revisão Humana & Publicação**: O fluxo editorial preserva a supervisão pastoral e a publicação gradual.

---

## 2. Artefatos Desenvolvidos na Sessão

### 2.1 Contrato Editorial e Roteiro do Astra
- Arquivo: `app/docs/PROMPT_ASTRA_PACOTE_EDITORIAL_EBD.md`
- Versão do Schema: `comunhao.ebd.source.v1`
- Define estrutura dos 10 blocos: `hero`, `text`, `scripture`, `character`, `timeline`, `reflection`, `mission`, `prayer`, `quiz`, `video`.
- Fixa regras de extensão por bloco, parágrafos, semiótica, entonação para narração/áudio, perguntas de reflexão (exatamente uma ao fim), quiz com 3 questões e gabaritos de 0 a 3, e dissociação estrita entre roteiro de vídeo e arquivos de mídia.

### 2.2 Backend no Supabase (`csxrhvgfnkqmkehgmnkp`)
- Migration: `app/supabase/migrations/20260907030000_ebd_source_days.sql`
- Script de automação e ensaio seguro: `app/scripts/ebd-source-migration.mjs`
- Testes SQL automatizados: `app/supabase/tests/20260907030000_ebd_source_days.test.sql`
- Tabela criada: `public.ebd_source_days` com restrições de integridade, verificação de tamanho (até 512 KB), RLS ativado, duas policies restritas à permissão `ebd.manage` e exclusão de privilégios para perfis anônimos. A migration foi aplicada no banco remoto com prévia validação e ensaio via rollback.

### 2.3 Motor de Validação e Extração
- Arquivo: `app/src/services/ebdSourcePackage.ts`
- `parseEditorialSourceDay`: Valida estritamente chaves, dias permitidos, 10 blocos canônicos e integridade do quiz.
- `sourceDayWarnings`: Emite avisos editoriais não bloqueantes sobre extensão e pontuação sem truncar nem reescrever o texto do autor.
- `extractEditorialSourceDay`: Filtra os blocos escolhidos, preserva o texto original literalmente, converte `quizQuestions` para a estrutura interna `settings.questions` com IDs gerados por `createRuntimeId`, recalcula minutos estimados e mantém calendário/identificadores do dia.

### 2.4 Camada de Serviço e Persistência
- Arquivo: `app/src/services/ebdSourceService.ts`
- `listEditorialSources`: Consulta os pacotes no Supabase por lição.
- `importEditorialSources`: Inserção transacional com validação de unicidade de lição/revisão e conversão de erros de integridade do Postgres.

### 2.5 Componente de Interface do Estúdio
- Arquivo: `app/src/components/ebd/EditorialSourceImport.tsx`
- Painel colapsável integrado ao `EbdStudio.tsx` (logo abaixo dos botões de ação do dia).
- Auto-expansão quando há pacote disponível; seletor de revisão; seleção granular de blocos; pré-visualização completa antes da aplicação; confirmação modal.

---

## 3. Diagnóstico e Resolução do Incidente: "Botão sem ação em Terça-feira"

### 3.1 Sintoma
O usuário importou com sucesso os arquivos da Lição 11 e aplicou Segunda-feira. Em seguida, liberou o dia de Segunda-feira. Ao navegar para a aba de Terça-feira, o conteúdo aparecia no painel, mas o botão **"Aplicar seleção ao rascunho"** ficava sem ação.

### 3.2 Causa Raiz
1. Ao liberar Segunda-feira através da ação rápida do Estúdio (`publishSelectedDayNow`), o status da lição inteira no banco mudou para `'published'`.
2. A integração no `EbdStudio.tsx` passava `disabled={selected.status !== 'draft' || saving || aiGenerating}`.
3. Como `selected.status === 'published'`, a propriedade `disabled` ficava permanentemente `true`.
4. O componente `Button.tsx` do Design System aplica `disabled:pointer-events-none`, bloqueando todos os cliques no elemento do botão.
5. Adicionalmente, quando a lição está em status `'published'`, o salvamento de novos dias ainda não liberados precisa obrigatoriamente chamar a RPC `ebd_salvar_dia_editorial_nao_liberado` (`saveUnreleasedEditorialDay`), pois o autosave de rascunhos ignora lições publicadas.

### 3.3 Solução Implementada
1. **Lógica de Imutabilidade Granular**:
   - Criado `isDayImmutable`: checa se `selected.status === 'published'` E se `unlocksAt` do dia específico já passou no tempo.
   - Criado `canEditSelectedDay`: permite edição se a lição estiver em `draft` OU se estiver em `published` mas aquele dia específico ainda não tiver sido liberado (`!isDayImmutable`).
2. **Salvamento Automático de Dias Não Liberados**:
   - Implementada a função `applyImportedDay` em `EbdStudio.tsx`.
   - Se a lição for `'published'`, executa `await saveUnreleasedEditorialDay(selected.id, imported)` diretamente, salvando o dia no banco com segurança e atualizando o estado da tela com toast de confirmação.
   - Se for `'draft'`, segue o fluxo padrão de `patchDay`.
3. **Feedback Acessível**:
   - Se um dia realmente estiver publicado e imutável (caso de Segunda-feira após liberada), a interface exibe explicitamente: *"Segunda-feira já foi liberado e publicado, portanto permanece imutável."*

---

## 4. Evidências de Validação e Testes

- **Suíte Completa**:
  ```
  Test Files  48 passed (48)
       Tests  231 passed (231)
  ```
- **Linter**: `oxlint src` executado sem erros.
- **Validação com Pacote Real (Lição 11 Astra)**:
  - 6 JSONs validados (`monday` a `saturday`) + `manifest.json`.
  - 60/60 blocos aprovados com sucesso pelo parser.
  - Banco de dados remoto verificado com os 6 registros de `ebd_source_days` persistidos com integridade.

---

## 5. Guia de Retomada em Caso de Nova Sessão

Caso uma nova sessão de IA seja iniciada do zero:

1. **Estado do Backend**:
   - A tabela `public.ebd_source_days` **já está criada e ativa** no projeto `csxrhvgfnkqmkehgmnkp`.
   - A migration `20260907030000_ebd_source_days.sql` está registrada em `supabase_migrations.schema_migrations`.
   - Não reexecutar DDL nem apagar registros.

2. **Arquivos-chave modificados**:
   - `app/src/pages/EbdStudio.tsx` (integração de `EditorialSourceImport`, `canEditSelectedDay`, `applyImportedDay`).
   - `app/src/components/ebd/EditorialSourceImport.tsx` (painel, auto-open, async `onApply`, `disabledReason`).
   - `app/src/services/ebdSourcePackage.ts` (contrato de tipos e parse).
   - `app/src/services/ebdSourceService.ts` (cliente Supabase).
   - `CONTEXTO_MESTRE_IMPLEMENTACAO.md` (seção 34 atualizada).

3. **Comandos de Verificação Rápida**:
   ```bash
   cd ~/Secretária/COMUNHAO-MURAL-SOCIAL-1.4.0-DEV1/app
   npm run lint
   npm test -- src/test/ebdSourceImport.test.tsx src/test/ebdSourcePackage.test.ts
   ```

4. **Operação pelo Usuário**:
   - O usuário aplica os dias no Estúdio acessando cada dia da semana (Segunda a Sábado) e clicando em **"Aplicar seleção ao rascunho"**.
   - Os dias são salvos automaticamente no banco, mesmo com a lição no estado publicada.
