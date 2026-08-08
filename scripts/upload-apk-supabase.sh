#!/usr/bin/env bash
# Sobe o APK para Supabase Storage (bucket releases, URL pública permanente).
# Requer: plano Pro (Free = máx. 50 MB; APK ~103 MB).
# Uso: SUPABASE_ACCESS_TOKEN=... bash scripts/upload-apk-supabase.sh [caminho/apk]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="${1:-$ROOT/website/downloads/Doce-Cuidado.apk}"
PROJECT_REF="${SUPABASE_PROJECT_REF:?defina SUPABASE_PROJECT_REF}"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
OBJECT_PATH="android/Doce-Cuidado.apk"

if [[ ! -f "$APK" ]]; then
  echo "ERRO: APK não encontrado: $APK"
  exit 1
fi

APK_BYTES=$(stat -c%s "$APK")
if [[ "$APK_BYTES" -gt 52428800 ]]; then
  echo "AVISO: APK tem $(( APK_BYTES / 1024 / 1024 )) MB — plano Free Supabase limita a 50 MB."
  echo "       Faça upgrade para Pro e aumente o limite em Storage → Settings → Global file size limit."
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERRO: defina SUPABASE_ACCESS_TOKEN (Supabase → Account → Access Tokens)"
  exit 1
fi

SERVICE_KEY=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys" \
  | python3 -c "import sys,json; print(next(x['api_key'] for x in json.load(sys.stdin) if x.get('name')=='service_role'))")

LIMIT=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/storage" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('fileSizeLimit',0))")

echo "Limite global Storage: $(( LIMIT / 1024 / 1024 )) MB"
if [[ "$APK_BYTES" -gt "$LIMIT" ]]; then
  echo "ERRO: APK maior que o limite do projeto. Upgrade Pro ou use FTP na Hostinger."
  exit 1
fi

echo "→ garantindo bucket releases…"
curl -sf -X POST "${SUPABASE_URL}/storage/v1/bucket" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"id":"releases","name":"releases","public":true,"file_size_limit":209715200,"allowed_mime_types":["application/vnd.android.package-archive","application/octet-stream"]}' \
  >/dev/null 2>&1 || true

echo "→ upload $APK …"
HTTP=$(curl -s -o /tmp/supabase-upload.json -w "%{http_code}" -X POST \
  "${SUPABASE_URL}/storage/v1/object/releases/${OBJECT_PATH}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/vnd.android.package-archive" \
  -H "x-upsert: true" \
  --data-binary @"$APK")

if [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
  echo "ERRO HTTP $HTTP:"
  cat /tmp/supabase-upload.json
  exit 1
fi

PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/releases/${OBJECT_PATH}"
echo ""
echo "OK — URL pública (sem expiração):"
echo "$PUBLIC_URL"
echo ""
echo "Cole em website/downloads/baixar.php → \$supabasePublicUrl"
