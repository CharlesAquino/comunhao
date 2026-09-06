#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
[[ "$VERSION" == *-dev.* ]] || { echo "❌ Esta árvore não está marcada como desenvolvimento: $VERSION"; exit 1; }

grep -q 'applicationIdSuffix ".dev"' android/app/build.gradle || {
  echo "❌ A variante Android não está isolada com applicationIdSuffix .dev"
  exit 1
}

[[ -f supabase/migrations/20260801010000_mural_social_dev1.sql ]] || {
  echo "❌ Migration do Mural Social ausente"
  exit 1
}

npm run lint -- --quiet
npm test
npm run build -- --mode development

ENV_READY=false
for env_file in .env.development.local .env.local .env; do
  if [[ -f "$env_file" ]] \
    && grep -q '^VITE_SUPABASE_URL=' "$env_file" \
    && grep -q '^VITE_SUPABASE_ANON_KEY=' "$env_file"; then
    ENV_READY=true
    break
  fi
done

if [[ "$ENV_READY" == true ]]; then
  npm run doctor -- --full
else
  echo "⚠️  Doctor de ambiente adiado: configure o Supabase de staging em .env.development.local."
fi

echo "✅ Comunhão $VERSION validado localmente como desenvolvimento."
echo "⚠️  Nenhuma migration foi enviada e nenhum manifesto de atualização foi alterado."
