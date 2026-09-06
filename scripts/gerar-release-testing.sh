#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIG="release/testing/release.config.json"
VERSION_NAME="$(node -p "require('./${CONFIG}').versionName")"
VERSION_CODE="$(node -p "require('./${CONFIG}').versionCode")"
APK_OUT="$ROOT/release/testing/comunhao-${VERSION_NAME}.apk"

echo "🧪 Preparando Comunhão ${VERSION_NAME} (${VERSION_CODE}) para o canal de testes..."

./scripts/validar-release-rc.sh

if [[ ! -f android/keystore.properties ]]; then
  echo "❌ android/keystore.properties não encontrado."
  echo "   Use a mesma chave que assinou a versão atualmente instalada."
  exit 1
fi

npx cap sync android

(
  cd android
  ./gradlew clean assembleRelease \
    -PappVersionCode="$VERSION_CODE" \
    -PappVersionName="$VERSION_NAME"
)

SOURCE_APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$SOURCE_APK" ]] || { echo "❌ APK release não encontrado: $SOURCE_APK"; exit 1; }

mkdir -p "$ROOT/release/testing"
cp "$SOURCE_APK" "$APK_OUT"
sha256sum "$APK_OUT" | tee "${APK_OUT}.sha256"

node scripts/criar-manifesto-testing.mjs \
  --apk "$APK_OUT" \
  --output "$ROOT/release/testing/version.json"

echo
echo "✅ Release local pronta:"
echo "   APK: $APK_OUT"
echo "   Manifesto: $ROOT/release/testing/version.json"
echo
echo "Para publicar no Supabase Storage:"
echo "   export SUPABASE_SERVICE_ROLE_KEY='...'"
echo "   npm run publish:testing"
