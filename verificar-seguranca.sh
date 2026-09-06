#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$PWD}"
FAILED=0

check_absent() {
  local pattern="$1"
  local description="$2"
  shift 2
  if grep -RInE --exclude=verificar-seguranca.sh --exclude-dir=node_modules --exclude-dir=.git "$pattern" "$@" >/tmp/sentinel-check.txt 2>/dev/null; then
    echo "[FALHA] $description"
    cat /tmp/sentinel-check.txt
    FAILED=1
  else
    echo "[OK] $description"
  fi
}

check_present() {
  local pattern="$1"
  local description="$2"
  shift 2
  if grep -RInE --exclude=verificar-seguranca.sh --exclude-dir=node_modules --exclude-dir=.git "$pattern" "$@" >/dev/null 2>&1; then
    echo "[OK] $description"
  else
    echo "[FALHA] $description"
    FAILED=1
  fi
}

PROTECTED_FUNCTIONS=(
  "$ROOT/supabase/functions/_shared/security.ts"
  "$ROOT/supabase/functions/gerar-dia-ebd"
  "$ROOT/supabase/functions/buscar-memoria-rag"
  "$ROOT/supabase/functions/indexar-memoria-rag"
)

SECRET_SCOPES=("$ROOT/src" "$ROOT/supabase/functions")
for env_file in "$ROOT"/.env "$ROOT"/.env.local "$ROOT"/.env.production "$ROOT"/.env.development; do
  [[ -f "$env_file" ]] && SECRET_SCOPES+=("$env_file")
done

check_absent "Access-Control-Allow-Origin['\"]?:[[:space:]]*['\"]\\*" \
  "Funções protegidas não usam CORS wildcard" "${PROTECTED_FUNCTIONS[@]}"
check_absent "VITE_.*(SERVICE_ROLE|GROQ_API_KEY|SECRET|HASH_PEPPER)" \
  "Segredos não usam prefixo VITE_ no código executável" "${SECRET_SCOPES[@]}"
check_absent "return[[:space:]]+.*error:[[:space:]]*message" \
  "Funções protegidas não devolvem erro interno bruto" "${PROTECTED_FUNCTIONS[@]}"
check_present "security_consume_rate_limit" \
  "Rate limiting server-side está presente" "$ROOT/supabase"
check_present "security_begin_idempotent_operation" \
  "Idempotência server-side está presente" "$ROOT/supabase"
check_present "publicar_ebd_editorial_seguro" \
  "Publicação editorial segura está presente" "$ROOT"
check_present "X-Correlation-Id" \
  "Funções protegidas incluem correlação" "${PROTECTED_FUNCTIONS[@]}"
check_present "security_invoker[[:space:]]*=[[:space:]]*true" \
  "Views privadas preservam a RLS da tabela-base" "$ROOT/supabase/migrations/20260823120000_idor_hardening.sql"
check_present "p_usuario_id is distinct from v_actor" \
  "RPC de crédito rejeita troca de usuário" "$ROOT/supabase/migrations/20260823120000_idor_hardening.sql"
check_present "grant update \(lida\) on public.mensagens" \
  "Chat limita UPDATE ao marcador de leitura" "$ROOT/supabase/migrations/20260823120000_idor_hardening.sql"
check_present "idor_hardening_negative_contract_checks_ok" \
  "Regressões anti-IDOR possuem teste negativo" "$ROOT/supabase/tests/20260823120000_idor_hardening.test.sql"
check_present "p_usuario_id is distinct from v_actor" \
  "RPCs legadas de XP e PC vinculam alvo ao ator" "$ROOT/supabase/migrations/20260823130000_idor_hardening_engajamento.sql"
check_present "idor_hardening_engagement_checks_ok" \
  "Engajamento possui regressão anti-IDOR" "$ROOT/supabase/tests/20260823130000_idor_hardening_engajamento.test.sql"
check_present "TRUNCATE.*REFERENCES.*TRIGGER.*MAINTAIN|truncate, references, trigger, maintain" \
  "Papéis do cliente não mantêm privilégios fora da RLS" "$ROOT/supabase/migrations/20260823140000_idor_least_privilege.sql"
check_present "idor_least_privilege_checks_ok" \
  "Menor privilégio possui teste de regressão" "$ROOT/supabase/tests/20260823140000_idor_least_privilege.test.sql"
check_present "Um identificador recebido do app localiza um objeto" \
  "Contrato anti-IDOR está documentado" "$ROOT/docs/CONTRATO-AUTORIZACAO-ANTI-IDOR.md"

if [[ "$FAILED" -ne 0 ]]; then
  echo "Verificação Sentinela falhou." >&2
  exit 1
fi

echo "Verificação Sentinela concluída sem achados bloqueantes."
