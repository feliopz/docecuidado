#!/usr/bin/env bash
# Build APK preview no EAS (notificações + assets nativos).
# Uso: EXPO_TOKEN=seu_token bash scripts/eas-build-preview.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
ENV_FILE="$SRC/.env.local"

if [[ ! -f "$SRC/app.json" ]]; then
  echo "ERRO: projeto Expo não encontrado em $SRC"
  exit 1
fi

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "ERRO: defina EXPO_TOKEN (https://expo.dev/accounts/[user]/settings/access-tokens)"
  exit 1
fi

export EXPO_TOKEN

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

cd "$SRC"

echo "→ eas init (vincular projeto)…"
npx eas-cli init --non-interactive --force

PROJECT_ID=$(node -e "console.log(require('./app.json').expo.extra.eas.projectId)")
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "PREENCHA_APOS_EAS_INIT" ]]; then
  echo "ERRO: projectId não foi preenchido após eas init"
  exit 1
fi
echo "   projectId: $PROJECT_ID"

set_env() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "   aviso: $name vazio — pulando"
    return
  fi
  npx eas-cli env:create preview \
    --name "$name" \
    --value "$value" \
    --visibility sensitive \
    --scope project \
    --environment preview \
    --non-interactive \
    --force 2>/dev/null || true
}

echo "→ variáveis de ambiente no EAS (preview)…"
set_env EXPO_PUBLIC_SUPABASE_URL "${EXPO_PUBLIC_SUPABASE_URL:-}"
set_env EXPO_PUBLIC_SUPABASE_ANON_KEY "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}"
# NOTE: the OpenRouter key is NO LONGER a client var — it lives only as a secret
# on the `llm` Edge Function. Do not add it here.

echo "→ eas build android preview (pode levar 10–20 min)…"
npx eas-cli build \
  --platform android \
  --profile preview \
  --non-interactive \
  --wait \
  --message "Doce Cuidado preview — teste notificações"

echo ""
echo "Build concluído. Baixe o APK pelo link acima ou em:"
echo "https://expo.dev/accounts/projects/$PROJECT_ID/builds"
