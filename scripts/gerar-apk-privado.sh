#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Build exclusivamente local: não produz manifesto OTA nem faz upload.
VITE_UPDATE_MANIFEST_URL='' npm run build:development
(cd android && ./gradlew assembleDebug --no-daemon)
mkdir -p release/private
cp android/app/build/outputs/apk/debug/app-debug.apk release/private/comunhao-home-development.apk
sha256sum release/private/comunhao-home-development.apk > release/private/comunhao-home-development.apk.sha256
