#!/usr/bin/env bash
# Build APK preview no EAS → baixa → atualiza website/ → sobe no FTP Hostinger.
#
# Uso:
#   bash scripts/release-apk.sh
#   bash scripts/release-apk.sh "mensagem do build"
#
# Requisitos:
#   - eas-cli logado (`npx eas-cli whoami`) OU EXPO_TOKEN no ambiente
#   - scripts/.ftp.env com FTP_HOST, FTP_USER, FTP_PASS (copie de .ftp.env.example)
#   - curl
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
WEB="$ROOT/website"
SCRIPTS="$ROOT/scripts"
APK_NAME="Doce-Cuidado.apk"
APK_LOCAL="$WEB/downloads/$APK_NAME"
MIN_APK_BYTES=$((50 * 1024 * 1024)) # 50 MB — abaixo disso = upload truncado
BUILD_MSG="${1:-Doce Cuidado preview — $(date -Iseconds)}"

log() { printf '→ %s\n' "$*"; }
die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
if [[ -f "$SCRIPTS/.ftp.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPTS/.ftp.env"
fi
if [[ -f "$SRC/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$SRC/.env.local"
  set +a
fi
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

FTP_HOST="${FTP_HOST:?defina FTP_HOST em scripts/.ftp.env}"
FTP_USER="${FTP_USER:-}"
FTP_PASS="${FTP_PASS:-}"
FTP_REMOTE_APK="${FTP_REMOTE_APK:-downloads/Doce-Cuidado.apk}"

[[ -f "$SRC/app.json" ]] || die "projeto Expo não encontrado em $SRC"
[[ -n "$FTP_USER" && -n "$FTP_PASS" ]] || die "defina FTP_USER e FTP_PASS em scripts/.ftp.env (veja .ftp.env.example)"

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  if ! (cd "$SRC" && npx eas-cli whoami &>/dev/null); then
    die "faça login no EAS (npx eas-cli login) ou defina EXPO_TOKEN"
  fi
else
  export EXPO_TOKEN
fi

mkdir -p "$WEB/downloads"

# ── 1) EAS env (preview) ──────────────────────────────────────────────────────
cd "$SRC"

log "eas init…"
npx eas-cli init --non-interactive --force >/dev/null

set_env() {
  local name="$1" value="$2"
  [[ -n "$value" ]] || return 0
  npx eas-cli env:create preview \
    --name "$name" --value "$value" \
    --visibility sensitive --scope project --environment preview \
    --non-interactive --force 2>/dev/null || true
}

log "variáveis EAS (preview)…"
set_env EXPO_PUBLIC_SUPABASE_URL "${EXPO_PUBLIC_SUPABASE_URL:-}"
set_env EXPO_PUBLIC_SUPABASE_ANON_KEY "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}"

# ── 2) Build + wait ───────────────────────────────────────────────────────────
log "eas build android preview (10–25 min)…"
log "mensagem: $BUILD_MSG"

BUILD_JSON="$(mktemp)"
trap 'rm -f "$BUILD_JSON"' EXIT

if ! npx eas-cli build \
  --platform android \
  --profile preview \
  --non-interactive \
  --wait \
  --message "$BUILD_MSG" \
  --json 2>"${BUILD_JSON}.stderr" >"$BUILD_JSON"; then
  cat "${BUILD_JSON}.stderr" >&2 || true
  die "build EAS falhou"
fi

parse_build_json() {
  python3 - <<'PY'
import json, os, sys
path = os.environ["BUILD_JSON"]
raw = json.load(open(path))
d = raw[0] if isinstance(raw, list) else raw
print(d.get("id", ""))
print(d.get("status", ""))
print(d.get("artifacts", {}).get("buildUrl", "") or "")
PY
}

mapfile -t BUILD_INFO < <(BUILD_JSON="$BUILD_JSON" parse_build_json)
BUILD_ID="${BUILD_INFO[0]}"
BUILD_STATUS="${BUILD_INFO[1]}"
BUILD_URL="${BUILD_INFO[2]}"

[[ "$BUILD_STATUS" == "FINISHED" ]] || die "build terminou com status: $BUILD_STATUS (id=$BUILD_ID)"
[[ -n "$BUILD_URL" ]] || die "build sem URL de artefato (id=$BUILD_ID)"

log "build OK: $BUILD_ID"
log "URL: $BUILD_URL"

# ── 3) Download APK ───────────────────────────────────────────────────────────
log "baixando APK…"
curl -fsSL "$BUILD_URL" -o "$APK_LOCAL.part"
mv "$APK_LOCAL.part" "$APK_LOCAL"

APK_SIZE="$(stat -c%s "$APK_LOCAL" 2>/dev/null || stat -f%z "$APK_LOCAL")"
APK_MB="$(python3 -c "print(f'{$APK_SIZE/1024/1024:.1f}')")"
log "local: $APK_LOCAL ($APK_MB MB)"

if (( APK_SIZE < MIN_APK_BYTES )); then
  die "APK local muito pequeno ($APK_SIZE bytes) — download incompleto?"
fi

# SHA256 opcional para log
if command -v sha256sum >/dev/null; then
  log "SHA256: $(sha256sum "$APK_LOCAL" | awk '{print $1}')"
fi

# ── 4) Upload FTP (raiz da conta, NÃO public_html/) ───────────────────────────
ftp_upload() {
  local src="$1" remote="$2"
  curl --ftp-pasv --ftp-create-dirs -f -T "$src" \
    -u "${FTP_USER}:${FTP_PASS}" \
    "ftp://${FTP_HOST}/${remote}"
}

log "upload FTP → $FTP_REMOTE_APK (~$APK_MB MB, pode demorar)…"
ftp_upload "$APK_LOCAL" "$FTP_REMOTE_APK"
log "FTP upload concluído"

# ── 5) Verificação ao vivo ────────────────────────────────────────────────────
LIVE_URL="https://docecuidado.com/downloads/baixar.php"
log "verificando $LIVE_URL …"
sleep 2
LIVE_SIZE="$(curl -fsSL -o /dev/null -w '%{size_download}' "$LIVE_URL" || echo 0)"
LIVE_MB="$(python3 -c "print(f'{$LIVE_SIZE/1024/1024:.1f}')" 2>/dev/null || echo "?")"

if (( LIVE_SIZE >= MIN_APK_BYTES )); then
  log "site OK: $LIVE_MB MB via baixar.php"
else
  log "AVISO: baixar.php retornou $LIVE_SIZE bytes — cache DNS/CDN ou caminho FTP errado"
  log "teste direto: https://docecuidado.com/downloads/$APK_NAME"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo " Release concluído"
echo " Build ID : $BUILD_ID"
echo " APK local: $APK_LOCAL ($APK_MB MB)"
echo " Download : https://docecuidado.com/downloads/baixar.php"
echo "════════════════════════════════════════════════════════"
