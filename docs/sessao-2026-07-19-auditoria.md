# Sessão 19/07/2026 — Correções da Auditoria

## O que foi feito (código + DB)
- [x] RLS Policies corrigidas: `auth_user_id` em vez de `id` — migration aplicada
- [x] Anti-spam reintroduzido em `criar_sala_oracao` (cooldown 30s + 1 sala ativa)
- [x] `finalizar_sala_oracao` agora credita XP (+5) junto com Kesef (+10)
- [x] `registrar_evento_engajamento` RPC criada (orquestrador unificado Kesef + XP)
- [x] Palette da Carteira corrigida: cyan → esmeralda + âmbar
- [x] CORS das 4 Edge Functions lêem `PUBLIC_SITE_URL` (fallback `*`)
- [x] Smoke tests SQL em `tests/smoke-rpcs.sql`

## Pendente para próxima sessão (ações manuais)

### 1. 🔴 Rotacionar chaves Supabase
Dashboard → Settings → API → Regenerate anon key + service_role key
Após regenerar, atualizar `.env` com as novas chaves.

### 2. 🔴 Definir admin
```sql
UPDATE usuarios SET papel = 'admin' WHERE telefone = 'SEU_TELEFONE_AQUI';
```

### 3. 🟡 Configurar PUBLIC_SITE_URL
Dashboard → Edge Functions → adicionar variável `PUBLIC_SITE_URL` com a URL do deploy.

### 4. 🟢 Smoke tests
```bash
supabase db query --file tests/smoke-rpcs.sql
```

---

Após esses 4 passos, rodar roteiro de teste: Sala de Oração → Amém → verificar Kesef + XP na Carteira.
