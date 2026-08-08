#!/usr/bin/env bash
# Baixa um build EAS já concluído e publica no site (local + FTP).
# Uso: bash scripts/publish-apk.sh [build-id]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
SCRIPTS="$ROOT/scripts"
WEB="$ROOT/website"
APK_LOCAL="$WEB/downloads/Doce-Cuidado.apk"
MIN_APK_BYTES=$((50 * 1024 * 1024))
BUILD_ID="${1:-}"

log() { printf '→ %s\n' "$*"; }
die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }

[[ -f "$SCRIPTS/.ftp.env" ]] && source "$SCRIPTS/.ftp.env"
FTP_HOST="${FTP_HOST:?defina FTP_HOST em scripts/.ftp.env}"
[[ -n "${FTP_USER:-}" && -n "${FTP_PASS:-}" ]] || die "scripts/.ftp.env ausente"

cd "$SRC"
if [[ -z "$BUILD_ID" ]]; then
  BUILD_ID="$(npx eas-cli build:list --platform android --limit 1 --json --non-interactive 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")"
fi
log "build: $BUILD_ID"

BUILD_URL="$(npx eas-cli build:view "$BUILD_ID" --json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('artifacts',{}).get('buildUrl',''))")"
[[ -n "$BUILD_URL" ]] || die "sem URL de artefato"

mkdir -p "$WEB/downloads"
log "baixando…"
curl -fsSL "$BUILD_URL" -o "$APK_LOCAL.part"
mv "$APK_LOCAL.part" "$APK_LOCAL"
APK_SIZE="$(stat -c%s "$APK_LOCAL")"
(( APK_SIZE >= MIN_APK_BYTES )) || die "APK pequeno demais ($APK_SIZE bytes)"
log "local OK: $(python3 -c "print(f'{$APK_SIZE/1024/1024:.1f}')") MB"

log "FTP upload…"
curl --ftp-pasv --ftp-create-dirs -f -T "$APK_LOCAL" \
  -u "${FTP_USER}:${FTP_PASS}" \
  "ftp://${FTP_HOST}/${FTP_REMOTE_APK:-downloads/Doce-Cuidado.apk}"

sleep 2
LIVE="$(curl -fsSL -o /dev/null -w '%{size_download}' https://docecuidado.com/downloads/baixar.php || echo 0)"
log "site baixar.php: $(python3 -c "print(f'{$LIVE/1024/1024:.1f}')") MB"
echo "https://docecuidado.com/downloads/baixar.php"
