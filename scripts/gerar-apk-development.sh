#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
CONFIG="$ROOT/release/development/update.config.json"
VERSION_CODE="$(node -p "require('./release/development/update.config.json').versionCode")"
CONFIG_VERSION="$(node -p "require('./release/development/update.config.json').versionName")"
[[ "$VERSION" == *-dev.* ]] || { echo "❌ APK de desenvolvimento exige versão -dev"; exit 1; }
[[ "$VERSION" == "$CONFIG_VERSION" ]] || { echo "❌ package.json e update.config.json possuem versões diferentes"; exit 1; }

npm run build:development
(
  cd android
  ./gradlew assembleDebug --no-daemon \
    -PappVersionCode="$VERSION_CODE" \
    -PappVersionName="$VERSION"
)

SOURCE="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
OUTPUT_DIR="$ROOT/release/development"
OUTPUT="$OUTPUT_DIR/comunhao-${VERSION}-debug.apk"

[[ -f "$SOURCE" ]] || { echo "❌ APK debug não encontrado: $SOURCE"; exit 1; }
mkdir -p "$OUTPUT_DIR"
cp "$SOURCE" "$OUTPUT"
sha256sum "$OUTPUT" | tee "${OUTPUT}.sha256"

node scripts/criar-manifesto-testing.mjs \
  --config "$CONFIG" \
  --apk "$OUTPUT" \
  --output "$OUTPUT_DIR/version.json"

echo

echo "✅ APK de desenvolvimento pronto e instalável ao lado da RC3:"
echo "   $OUTPUT"
echo "   applicationId: br.com.igreja.oracao.dev"
echo "   versionCode: $VERSION_CODE"
echo "   manifesto: $OUTPUT_DIR/version.json"
