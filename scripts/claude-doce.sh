#!/usr/bin/env bash
# Inicia Claude Code com MCP local do Doce Cuidado e permissões liberadas.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_ID="58e4d42f-bc1a-432b-b7bc-049b8a8918e6"

# auto = aprova comandos seguros sem clicar (funciona como root; bypassPermissions NÃO funciona como root)
CLAUDE_FLAGS=(--permission-mode auto)

cd "$PROJECT_DIR"

if [[ "${1:-}" == "--resume" || "${1:-}" == "-r" ]]; then
  shift
  exec claude "${CLAUDE_FLAGS[@]}" --resume "$SESSION_ID" "$@"
fi

exec claude "${CLAUDE_FLAGS[@]}" "$@"
