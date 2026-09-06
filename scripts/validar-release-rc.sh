#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIG="release/testing/release.config.json"
EXPECTED_VERSION="$(node -p "require('./${CONFIG}').versionName")"
EXPECTED_CODE="$(node -p "require('./${CONFIG}').versionCode")"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"

grep -q "$EXPECTED_CODE" android/app/build.gradle || { echo "❌ versionCode $EXPECTED_CODE ausente"; exit 1; }
grep -q "$EXPECTED_VERSION" android/app/build.gradle || { echo "❌ versionName $EXPECTED_VERSION ausente"; exit 1; }
[[ "$PACKAGE_VERSION" == "$EXPECTED_VERSION" ]] || { echo "❌ package.json em $PACKAGE_VERSION"; exit 1; }
grep -q "VITE_UPDATE_CHANNEL=testing" .env.testing || { echo "❌ canal testing ausente em .env.testing"; exit 1; }
grep -q "/app-updates/testing/version.json" .env.testing || { echo "❌ URL testing ausente em .env.testing"; exit 1; }

[[ ! -f android/keystore.properties ]] || echo "⚠️  android/keystore.properties existe localmente; não compacte nem versione esse arquivo."

npm run lint -- --quiet
npm test
npm run build -- --mode testing
npm run doctor -- --full
./verificar-seguranca.sh "$ROOT"

echo "✅ Comunhão $EXPECTED_VERSION ($EXPECTED_CODE) validado para testing."
