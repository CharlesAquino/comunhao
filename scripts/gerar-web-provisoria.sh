#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.provisional.local"
if [[ ! -f "$ENV_FILE" && -z "${VITE_SUPABASE_URL:-}" ]]; then
  ENV_FILE=".env.development.local"
  echo "⚠️  .env.provisional.local ausente; usando as chaves públicas do ambiente development."
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
elif [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
  echo "❌ Configure .env.provisional.local a partir de .env.provisional.example."
  exit 1
fi

: "${VITE_SUPABASE_URL:?VITE_SUPABASE_URL não configurada}"
: "${VITE_SUPABASE_ANON_KEY:?VITE_SUPABASE_ANON_KEY não configurada}"
: "${VITE_LIVEKIT_URL:?VITE_LIVEKIT_URL não configurada}"

export VITE_APP_CHANNEL="provisional"
export VITE_APP_VERSION_NAME="${VITE_APP_VERSION_NAME:-1.4.0-web.provisional.1}"
export VITE_APP_VERSION_CODE="${VITE_APP_VERSION_CODE:-14001}"
export VITE_MURAL_SOCIAL_SCHEMA="${VITE_MURAL_SOCIAL_SCHEMA:-true}"
export VITE_ENABLE_NATIVE_PUSH="false"

npm test -- --run
npx vite build --mode provisional

mkdir -p release/web-provisional
ARCHIVE="release/web-provisional/comunhao-${VITE_APP_VERSION_NAME}.tar.gz"
tar -C dist -czf "$ARCHIVE" .
sha256sum "$ARCHIVE" > "${ARCHIVE}.sha256"

echo
echo "✅ Web provisória pronta:"
echo "   Pasta: $ROOT/dist"
echo "   Pacote: $ROOT/$ARCHIVE"
