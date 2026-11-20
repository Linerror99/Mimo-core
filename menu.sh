#!/usr/bin/env bash
# =============================================================================
# MIMO FINANCE — Centre de Contrôle (remplace menu.bat)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/scripts/menu.sh" "$@"
