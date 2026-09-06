#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Uso: $0 APK_ANTERIOR APK_NOVO"
  exit 1
fi

OLD_APK="$(realpath "$1")"
NEW_APK="$(realpath "$2")"

[[ -f "$OLD_APK" ]] || { echo "❌ APK anterior não encontrado: $OLD_APK"; exit 1; }
[[ -f "$NEW_APK" ]] || { echo "❌ APK novo não encontrado: $NEW_APK"; exit 1; }

fingerprint() {
  local apk="$1"

  if command -v apksigner >/dev/null 2>&1; then
    apksigner verify --print-certs "$apk" 2>/dev/null \
      | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' \
      | head -n 1
    return
  fi

  keytool -printcert -jarfile "$apk" 2>/dev/null \
    | sed -n 's/^[[:space:]]*SHA256: //p' \
    | head -n 1 \
    | tr -d ':'
}

OLD_FP="$(fingerprint "$OLD_APK")"
NEW_FP="$(fingerprint "$NEW_APK")"

if [[ -z "$OLD_FP" || -z "$NEW_FP" ]]; then
  echo "❌ Não foi possível ler a assinatura. Instale apksigner ou confirme o keytool."
  exit 1
fi

echo "APK anterior: $OLD_FP"
echo "APK novo:     $NEW_FP"

if [[ "${OLD_FP,,}" != "${NEW_FP,,}" ]]; then
  echo "❌ As assinaturas são diferentes. O Android não instalará a atualização sobre o app atual."
  exit 1
fi

echo "✅ Assinaturas compatíveis."
