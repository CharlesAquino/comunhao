# Auditoria Completa — oracao-app

**Data:** 22/07/2026  
**Escopo:** Segurança, Arquitetura, Dados, Design, Funcionalidades  
**Status:** 29/29 testes ✅ | Build ✅ | 3 erros TS pré-existentes

---

## 🔴 CRÍTICOS (9 itens)

### C-01: Senha transmitida via URL (Registro)
**Arquivo:** `Register.tsx:32`  
Senha enviada como query param `?senha=PlainText` — visível no histórico, logs de servidor, barra de endereço.

### C-02: Convite subscription quebrado
**Arquivo:** `Home.tsx:73`  
`subscribeToConvites('', ...)` — userId vazio. O filtro nunca match, sender nunca recebe atualização.

### C-03: TimerOracao credita 1 Kesef em vez de 10
**Arquivo:** `TimerOracao.tsx:79`  
Usa `KESEF_VALORES.INTERCEDER (1)` quando deveria usar `ORACAO_CONFIRMADA (10)`.

### C-04: Mural — farm de Kesef/XP no toggle de intercessão
**Arquivo:** `Mural.tsx:45-48`  
`creditarKesef` roda incondicionalmente após toggle — usuário pode spam-click para farmar.

### C-05: SalaOracao desconecta mesmo se crédito falhar
**Arquivo:** `SalaOracao.tsx:155`  
`room?.disconnect()` no `finally` — se o RPC de crédito falha, o toast mostra "Amém! +10 Kesef" mesmo assim.

### C-06: `kesef_ledger.quantidade CHECK (> 0)` impede débitos
**Arquivo:** `setup_db_migration_kesef_v2.sql:115`  
Constraint `CHECK (quantidade > 0)` conflita com `debitar_kesef` que insere valor negativo. Todos os resgates da Loja quebram.

### C-07: Duas fontes da verdade para saldo Kesef
`getDashboardData()` lê `usuarios.pontos_comunhao` (desatualizado desde v2), `getSaldoKesef()` lê view `kesef_saldo` (correto). Usuários veem saldos diferentes.

### C-08: Patente naming mismatch (frontend vs BD)
`patente.ts` (Guardião, Vigia, Mensageiro, Ofanim, Hayot) vs BD (Principado, Potestade, Virtude, Dominação, Trono). Prova de Ascensão armazena nomes do BD, frontend nunca encontra match.

### C-09: Tema claro quebrado — todas as cores semânticas são `#000000`
`--green-light`, `--amber-light`, `--rose-light`, `--accent-solid` = `#000000`. Design doc especifica marrom `#806858` e terracota `#c96a5a`.

---

## 🟠 ALTOS (12 itens)

### A-01: Evolution API Key exposta no client bundle
`VITE_EVOLUTION_API_KEY` no `constants.ts` → visível no JS minificado. Atacante pode enviar WhatsApp como igreja.

### A-02: Migration RLS não aplicada
`setup_db_migration_v2.sql` ⚠️ AINDA NÃO APLICADA — BD opera com políticas mais fracas.

### A-03: Componentes chamam Supabase direto (11+ instâncias)
Convenção "Nunca chame Supabase diretamente" violada em Login, Admin, Chat, Home, TimerOracao, Carteira, VerifyDispositivo, SessaoAbertaModal.

### A-04: `getUserId()` duplicado em 4 serviços
`dataService.ts`, `kesefService.ts`, `conviteService.ts`, `mensagemService.ts` — 4 implementações do mesmo mapping `auth_user_id → usuarios.id`.

### A-05: Sem rota guard (ProtectedRoute)
Cada página faz própria verificação de auth. Rota não autenticada mostra spinner antes de redirecionar.

### A-06: Sem crédito XP na SalaOracao
AGENTS.md: "Orar = +5 XP". SalaOracao só credita Kesef. Usuário perde XP.

### A-07: Sem crédito XP/Kesef quiz no EBD
EBD não chama `creditarXp(LICAO=10)` nem `creditarKesef(quiz_acerto=2)`.

### A-08: EBD pula conteúdo — vai direto pro quiz
`texto_base` da lição nunca é renderizado. Aluno não estuda, só responde perguntas.

### A-09: Race conditions em 5 RPCs
`creditar_kesef`, `debitar_kesef`, `enviar_convite_oracao`, `finalizar_sessao_timer`, `solicitarResgate` — SELECT antes de INSERT sem row-level locking.

### A-10: `KESEF_VALORES` vs RPC — valores divergentes
`LICAO_CONCLUIDA`: frontend 10, RPC 5. `QUIZ_ACERTO`: frontend 2, RPC 3. `INDICACAO_MEMBRO`: frontend 30, RPC 20. `INTERCEDER` não existe no RPC.

### A-11: `'mod'` role é fantasma
`adminAuth.ts` define `'mod' | 'admin' | 'membro'` mas DB só aceita `CHECK (papel IN ('membro','admin'))`.

### A-12: Prova de Ascensão referencia tabela morta `historico_oracoes`
Nenhum fluxo atual escreve nela. Meta "Orar 2 vezes" nunca será completada.

---

## 🟡 MÉDIOS (15 itens)

- **M-01:** Sem CSP header — vulnerável a XSS
- **M-02:** Phone enumeration via mensagens de erro diferentes no Login
- **M-03:** OTP sem rate limiting — spam infinito
- **M-04:** OTP sem lockout após N tentativas — brute force possível
- **M-05:** Touch targets abaixo de 44pt (admin icons `p-1.5`, theme toggle `p-2`, KesefDisplay)
- **M-06:** Modal sem focus trapping nem fechamento com Escape
- **M-07:** `Register.tsx` usa `alert()` em vez de Toast
- **M-08:** Sem foco visível (focus-ring) — `outline-none` sem substituto
- **M-09:** SalaOracao sem heartbeat — sala fica "ativa" se browser fechar
- **M-10:** Streak bônus (7d/30d) nunca é disparado — lógica não implementada
- **M-11:** Chat sem entry point na UI — nenhum link para `/chat/:userId`
- **M-12:** Sem notificação de novas mensagens no Chat
- **M-13:** Admin draw inclui admins/mods no sorteio
- **M-14:** Page title inconsistente — Home/Carteira usam `font-extrabold` (Inter) em vez de `font-display` (Fraunces)
- **M-15:** `solicitarResgate` checa `pontos_comunhao` em vez de saldo Kesef

---

## 🟢 BAIXOS (10 itens)

- **B-01:** `STORAGE_KEYS.USER_ID` morto — definido mas nunca lido
- **B-02:** `sorteio.ts` inteiramente morto — Admin.tsx implementa Fisher-Yates inline
- **B-03:** `registerUser` e `linkExistingUserToAuth` exportados mas nunca importados
- **B-04:** `ChamaIndicator`, `ProvaBanner`, `SessaoAbertaModal` importados em Home.tsx mas nunca renderizados
- **B-05:** Orphan column `auth_id` (setup_db_migration.sql) — `auth_user_id` é a coluna ativa
- **B-06:** `historico_oracoes` table morta — nenhum RPC atual escreve
- **B-07:** `CREATE RULE` não-idempotente — falha se re-executado
- **B-08:** Duas definições da tabela `mensagens` (migration + arquivo separado)
- **B-09:** Status `'orando'` nunca setado — enum dead
- **B-10:** `backdrop-filter: blur(24px)` sem `will-change` — performance mobile

---

## ✅ TESTES & BUILD

| Item | Resultado |
|------|-----------|
| Testes | ✅ **29/29 passam** (7 suites, 1.72s) |
| TypeScript | ❌ **3 erros** — `usuario_id` vs `id` em `oracaoAbertaService.ts` e `SessaoAbertaModal.tsx` |
| Build | ✅ Sucesso (1869 módulos, 1.1MB JS, 78KB CSS) |
| PWA | ✅ Service worker (10 precache entries) |
| Warning | ⚠️ Chunk >500KB — considerar code splitting |

---

## 📊 RESUMO POR CATEGORIA

| Categoria | Nota | Principal Problema |
|---|---|---|
| Segurança | 4/10 | Senha na URL, API key exposta, RLS não aplicada |
| Arquitetura | 6/10 | `getUserId` duplicado (4x), Supabase direto em componentes |
| Dados/BD | 5/10 | Constraint quebra débito, dual source of truth, race conditions |
| Design | 7/10 | Tema claro quebrado, touch targets pequenos, sem foco visível |
| Funcionalidades | 5/10 | Convite subscription quebrado, timer credita 1, farm no mural |
| Testes/Build | 8/10 | 29/29 passam, 3 erros TS pré-existentes |

**Geral: 5.8/10**

---

## 🔥 TOP 10 MUST-FIX (Ordem de prioridade)

1. **Senha na URL** — Mover para POST body / sessionStorage
2. **RLS migration** — Aplicar `setup_db_migration_v2.sql`
3. **`kesef_ledger.quantidade` CHECK** — Mudar para `CHECK (quantidade <> 0)`
4. **Convite subscription** — Passar userId real em vez de `''`
5. **Rotacionar chaves Supabase** — Anon key exposta no repositório
6. **Evolution API key** — Mover para Edge Function, remover do client
7. **Tema claro** — Implementar paleta do design doc (marrom/terracota)
8. **Timer Kesef** — Corrigir de 1 para 10
9. **Mural farm** — Proteger `creditarKesef` contra spam-toggle
10. **`getUserId()` único** — Extrair para `supabaseClient.ts`
