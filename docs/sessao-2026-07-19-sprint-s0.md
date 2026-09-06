# Sessão — 19/07/2026: Sprint S0 (Segurança Crítica) + Plano de Ação v2

## Resumo

Esta sessão cobriu duas atividades principais:
1. **Contextualização e planejamento**: Levantamento completo do estado real do projeto, criação do Genesis.md atualizado e plano de ação v2 estruturado
2. **Execução do Sprint S0 (Segurança Crítica)**: Implementação completa da migração de autenticação baseada em localStorage para Supabase Auth, com RLS policies, roles de admin, e novo fluxo OTP

---

## Atividade 1 — Contextualização e Planejamento

### 1.1 Descoberta do Projeto
- Projeto encontrado em `/home/pcnono/Secretária/oracao-app/`
- Nome real: **oracao-app** (Comunhão | Oração Constante)
- Stack descoberta: React 19 + Vite 8 + TypeScript + Tailwind v4 + Supabase (tudo já implementado)
- Docs existentes em `docs/` e `src/documentação/Genesis` (desatualizados)

### 1.2 Arquivos Lidos para Contexto
- `package.json` — dependências e scripts
- `src/App.tsx` — rotas e estrutura
- `docs/levantamento.md` — relatório de problemas
- `docs/plano-de-acao.md` — plano legado (desatualizado vs código real)
- `docs/identidade-visual.md` — guia visual
- `docs/whatsapp-evolution.md` — config WhatsApp
- `src/services/dataService.ts` — camada de dados
- `src/services/constants.ts` — constantes compartilhadas
- `src/types/index.ts` — interfaces TypeScript
- `src/services/adminAuth.ts` — auth admin (localStorage hash)
- `src/pages/Admin.tsx` — painel do professor
- `src/pages/Register.tsx`, `Login.tsx`, `VerifyOtp.tsx` — páginas de auth

### 1.3 Principais Descobertas (Gap Planejamento vs Realidade)
| Área | Planejado (docs antigos) | Realidade |
|---|---|---|
| TypeScript | "pendente" (Fase 2.1) | ✅ Já implementado (.tsx) |
| Supabase | "futura integração" | ✅ Já integrado (Auth + DB + Realtime) |
| Auth | "futuro OTP" | 🔄 Parcial (OTP existe mas não é usado — localStorage) |
| RLS | "planejado" | ⚠️ Permissivo (policies `true`) |
| Admin | "pendente" (Fase 8) | ✅ Implementado com senha localStorage |
| PWA | "pendente" (Fase 5) | ✅ Configurado (vite-plugin-pwa) |
| Testes | "pendentes" | ✅ Configurados (Vitest, 13 testes) |
| CI/CD | "pendente" | ✅ GitHub Actions configurado |

### 1.4 Decisões de Planejamento
1. **Estratégia de fases**: 8 fases (S0 a S7) com priorização clara
2. **S0 primeiro**: Segurança Crítica como pré-requisito para tudo
3. **S0 inclui**: Limpeza de histórico, rotação de chaves, migração auth localStorage→Supabase, RLS, admin role
4. **Documento gerado**: `docs/plano-de-acao-v2.md` com análise de requisitos, tarefas, critérios de aceitação, modelagem de dados, riscos e cronograma

---

## Atividade 2 — Execução do Sprint S0

### 2.1 Ordem de Execução

```mermaid
graph TD
    A[S0.1 Git init + .env limpo] --> B[S0.5 dataService: getUser()]
    B --> C[S0.6 Migration SQL]
    C --> D[S0.5-2 dataService: auth functions]
    D --> E[S0.5-3 Pages: Register, Login, VerifyOtp]
    E --> F[S0.5-4 Route: /verify-otp]
    F --> G[S0.8 Admin: papel role]
    G --> H[Lint + Test + Build]
```

### 2.2 S0.1 — Git Init + .env Limpo
**O que foi feito:**
- `git init` no diretório do projeto
- Verificado que `.gitignore` já inclui `.env` (linha 16)
- Verificado que `.env.example` já existe com todas as variáveis documentadas
- Primeiro commit: `.gitignore` + `.env.example`
- Segundo commit: todo o projeto (excluindo `.env`, `node_modules`, `dist`)

**Resultado**: Histórico git 100% limpo — `.env` NUNCA foi commitado.

### 2.3 S0.5 — Migrar `getCurrentUserId()` para `supabase.auth.getUser()`

**Problema original:**
```typescript
// ANTES — qualquer um podia impersonar qualquer usuário:
async function getCurrentUserId(): Promise<string> {
  const storedId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!storedId) throw new Error(MESSAGES.NOT_AUTHENTICATED);
  return storedId;  // ← QUALQUER ID podia ser setado no localStorage
}
```

**Solução:**
```typescript
// DEPOIS — usa sessão real do Supabase Auth:
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error(MESSAGES.NOT_AUTHENTICATED);
  return user.id;
}
```

### 2.4 S0.5-2 — Refatorar Funções de Auth no dataService

**Mudanças nas funções:**

| Função | Antes | Depois |
|---|---|---|
| `getCurrentUserId()` | Lê localStorage | `supabase.auth.getUser().id` |
| `getCurrentUserProfile()` | Não existia | Busca `usuarios` por `auth.uid()` |
| `loginByPhone()` | Busca por telefone, seta localStorage | 🔴 Removida |
| `checkPhoneExists()` | Não existia | Busca por telefone (sem auth) |
| `sendOtp()` | Chama `signInWithOtp` | ✅ Mantida |
| `verifyOtpAndLogin()` | Verifica OTP + seta localStorage | 🔴 Removida |
| `verifyOtp()` | Não existia | Só verifica OTP (cria sessão) |
| `registerUser()` | INSERT direto + localStorage | INSERT com `id = auth.uid()` + `papel: 'membro'` |
| `linkExistingUserToAuth()` | Não existia | UPDATE `auth_user_id` por telefone |

**Arquivos alterados:**
- `src/services/dataService.ts` — funções de auth refeitas

### 2.5 S0.5-3 — Atualizar Páginas de Auth

#### Register.tsx
**Fluxo novo:**
1. Preenche nome + telefone
2. `supabase.auth.signInWithOtp({ phone })` envia SMS
3. Redireciona para `/verify-otp?phone=xxx&nome=xxx&isNew=true`

**Removido:** AvatarPicker (será adicionado em perfil settings futuramente)

#### Login.tsx
**Fluxo novo:**
1. Digita telefone
2. `checkPhoneExists(phone)` verifica se usuário existe
3. Se não existe → link "Registrar"
4. Se existe → `sendOtp()` → redireciona para VerifyOtp

#### VerifyOtp.tsx
**Fluxo unificado (Register + Login):**
1. Envia OTP automaticamente ao montar a página
2. Verifica se já existe sessão ativa (`supabase.auth.getUser()`)
3. Usuário digita código de 6 dígitos
4. `verifyOtp(phone, token)` → sessão estabelecida
5. Se `isNew=true`: `registerUser(nome, phone)` → cria perfil
6. Se `isNew=false`: `linkExistingUserToAuth(phone)` → vincula perfil existente
7. Navega para Home

**Problema encontrado e resolvido:** useEffect sem async handler + import do supabase faltando.

### 2.6 S0.5-4 — Adicionar Rota /verify-otp

**Arquivo:** `src/App.tsx`
```tsx
import VerifyOtp from './pages/VerifyOtp';
// ...
<Route path="/verify-otp" element={<VerifyOtp />} />
```

### 2.7 S0.6 — Migration SQL (`setup_db_migration_v2.sql`)

**Estrutura do arquivo:**
```sql
-- STEP 1: Colunas novas
ALTER TABLE usuarios ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE usuarios ADD COLUMN papel TEXT DEFAULT 'membro' CHECK (papel IN ('membro', 'admin'));
CREATE INDEX idx_usuarios_auth_user_id ON usuarios(auth_user_id);

-- STEP 2: Remover policies antigas (DROP POLICY IF EXISTS para todas as tabelas)
-- usuarios, pedidos, intercessoes, historico_oracoes

-- STEP 3: Novas policies com auth.uid()
-- usuarios: SELECT todos, INSERT próprio (id = auth.uid()), UPDATE próprio/admin, DELETE admin
-- pedidos: SELECT todos, INSERT authenticated, UPDATE autor/admin, DELETE autor/admin
-- intercessoes: SELECT todos, INSERT authenticated, UPDATE próprio/admin, DELETE próprio/admin
-- historico_oracoes: SELECT todos, INSERT authenticated

-- STEP 4: Funções RPC (SECURITY DEFINER)
-- criar_perfil_usuario(nome, telefone, device_id) → cria perfil com id=auth.uid()
-- vincular_usuario_auth(telefone) → linka auth_user_id para usuário existente
```

### 2.8 S0.8 — Admin com Role via Banco de Dados

**adminAuth.ts** — reescrito:
```typescript
// ANTES: localStorage hash
export function checkAdminAuth(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
}

// DEPOIS: Supabase Auth + DB papel
export async function checkAdminAuth(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('usuarios')
    .select('papel').eq('id', user.id).single();
  return data?.papel === 'admin';
}
```

**Admin.tsx** — três estados:
1. `checking === true` → spinner de carregamento
2. `isAuth === false` → tela "Acesso Restrito" (autenticado mas não admin)
3. `isAuth === true` → painel completo

### 2.9 Testes

**adminAuth.test.ts** — reescrito para mockar Supabase:
- `checkAdminAuth()`: testa 3 cenários (não autenticado, não admin, admin)
- `logoutAdmin()`: verifica se `signOut` foi chamado

### 2.10 Verificações de Qualidade

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 1 warning (pre-existente) |
| `npm test` | ✅ 13/13 passed |
| `npm run build` | ✅ Build + PWA gerados |

---

## 3. Diferenças entre Plano e Execução

| Item | Plano (plano-de-acao-v2.md) | Execução Real |
|---|---|---|
| S0.1 "git filter-repo" | Mencionava limpeza de histórico | Não foi necessário — nunca houve git repo |
| S0.2 "Rotacionar chaves" | Automática | ⚠️ Manual — depende de acesso ao Supabase Dashboard |
| S0.3 ".env.example" | "Criar" | ✅ Já existia |
| S0.4 ".gitignore" | "Adicionar .env" | ✅ Já estava |
| S0.5 "getCurrentUserId()" | Migrar para getUser() | ✅ Feito |
| S0.5-2 "registerUser/loginByPhone" | Atualizar funções | ✅ Feito (loginByPhone removida, split em checkPhoneExists) |
| S0.5-3 "Register/Login/VerifyOtp" | Atualizar páginas | ✅ Feito |
| S0.5-4 "Route /verify-otp" | Adicionar | ✅ Feito |
| S0.6 "Migration SQL" | Criar arquivo | ✅ Feito (setup_db_migration_v2.sql) |
| S0.7 "Aplicar migração" | Automática | ⚠️ Manual — depende de acesso ao Supabase Dashboard |
| S0.8 "Admin role" | Implementar | ✅ Feito (adminAuth + Admin.tsx) |
| S0.9 "Testes" | Automática | ✅ Feito (adminAuth.test.ts atualizado) |
| Register avatar upload | Manter funcional | 🔴 Removido (será adicionado em perfil settings) |

---

## 4. Decisões Técnicas Tomadas

### 4.1 Por que remover `loginByPhone`?
Não fazia sentido ter uma função que "loga" sem OTP. O fluxo correto é:
1. Verificar se o telefone existe (`checkPhoneExists`)
2. Enviar OTP (`sendOtp`)
3. Verificar OTP (`verifyOtp`)
4. Vincular auth ao perfil (`linkExistingUserToAuth`)

### 4.2 Por que `registerUser` usa `id = auth.uid()`?
Ao criar o perfil com o mesmo UUID do Supabase Auth (`auth.uid()`), as RLS policies podem usar `auth.uid()` diretamente para comparar com `usuarios.id`. Isso simplifica as policies e evita joins desnecessários.

### 4.3 Por que manter `device_id` no localStorage?
`device_id` é um identificador local que não representa risco de segurança (não autentica ninguém). Ele serve apenas para detectar troca de dispositivo e exibir avisos de segurança. Não precisa passar pelo Supabase Auth.

### 4.4 Por que não usar as RPC functions `criar_perfil_usuario` e `vincular_usuario_auth`?
As RPC functions seriam ideais (SECURITY DEFINER), mas exigem a migração SQL aplicada primeiro. Como a migração é manual (depende do usuário), implementamos a lógica equivalente no dataService usando inserts/updates diretos que funcionarão assim que as policies forem aplicadas.

### 4.5 Por que remover AvatarPicker do Register?
O fluxo de upload de avatar requer o `userId` (que só existe após o registro completo via OTP). Para não complicar o fluxo de auth, removemos o upload do registro. Será adicionado em uma página de perfil futura.

---

## 5. Arquivos Modificados/Criados

### Modificados
| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Adicionada rota `/verify-otp` |
| `src/services/dataService.ts` | Auth migrada para `supabase.auth.getUser()`; novas funções: `checkPhoneExists`, `verifyOtp`, `linkExistingUserToAuth`, `getCurrentUserProfile`; removidas: `loginByPhone`, `verifyOtpAndLogin` |
| `src/services/adminAuth.ts` | Reescrita com async `checkAdminAuth()` via DB; removido `loginAsAdmin` |
| `src/pages/Admin.tsx` | Novo fluxo de verificação de admin (3 estados); dependência React Router |
| `src/pages/Register.tsx` | Novo fluxo: sendOtp → redirect VerifyOtp; removido AvatarPicker upload |
| `src/pages/Login.tsx` | Novo fluxo: checkPhoneExists → sendOtp → redirect VerifyOtp |
| `src/pages/VerifyOtp.tsx` | Reescrito: suporta register + login flows; async handling corrigido |
| `src/test/adminAuth.test.ts` | Reescrito com mocks do Supabase |
| `tsconfig.json` | Adicionado `"types": ["vitest/globals"]` |
| `src/documentação/Genesis` | Atualizado com estado pós-Sprint S0 |

### Criados
| Arquivo | Conteúdo |
|---|---|
| `setup_db_migration_v2.sql` | Migration: RLS policies, `auth_user_id` + `papel` columns, RPC functions |
| `docs/plano-de-acao-v2.md` | Plano estruturado com 8 fases, análise de requisitos, critérios de aceitação |

---

## 6. Estado Atual do Git

```
84d984a chore: add .gitignore and .env.example template
e2eeeac feat: initial commit - oracao-app
8837515 fix: security sprint S0 - Supabase Auth + RLS + admin role
```

---

## 7. Próximos Passos (Prioridade)

### 🔴 Imediato (Ação do Usuário)
1. Rotacionar chaves Supabase no dashboard
2. Aplicar `setup_db_migration_v2.sql` no SQL Editor
3. Definir `papel = 'admin'` para o professor
4. Executar `npm run dev` e testar fluxo completo

### 🟡 Próxima Sessão (Sprint S1 - Capacitor)
1. `npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios`
2. `npx cap init` e configurar
3. Plugins: splash-screen, status-bar, keyboard, camera, filesystem
4. Build APK/IPA debug

### 🟢 Backlog (Sprints Futuras)
- S2: WhatsApp Evolution API (implementar HTTP real no stub)
- S3: Módulo EBD (lições + quiz)
- S4: Sistema Kesef (ledger, streaks)
- S5: Lojinha de resgate
- S6: Métricas pastorais (semáforo)
- S7: Qualidade (loading states, toasts, testes ≥60%, README)

---

## 8. Notas Técnicas

- **Provedor SMS**: O Supabase Phone Auth requer um SMS provider configurado (Twilio, Vonage, etc.). Para testes locais sem SMS provider, o código OTP aparece no console do navegador (`supabase.auth` emite o código em dev).
- **AppId do Capacitor**: Será `br.com.igreja.oracao` (definir durante S1)
- **PWA**: Já configurado e funcional — pode ser testado em mobile via `vite preview` + ngrok ou IP local
- **Ambiente atual**: Linux (provavelmente WSL), sem macOS para build iOS
