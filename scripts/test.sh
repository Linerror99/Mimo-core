#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Exécution de la suite TDD (Backend Pytest + Frontend Vitest)
# Usage : ./scripts/test.sh [all|backend|frontend|lint]
# ==============================================================================
set -euo pipefail

TARGET="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

run_backend_tests() {
    echo "🧪 [Backend TDD] Exécution de Pytest dans Docker..."
    docker compose run --rm backend pytest tests/ -v --cov=app --cov-report=term-missing
}

run_frontend_tests() {
    echo "🧪 [Frontend TDD] Exécution de Typecheck + Vitest + Lint dans Docker..."
    docker run --rm -v "${ROOT_DIR}/frontend:/app" -w /app -e NEXT_TELEMETRY_DISABLED=1 node:22-alpine \
        sh -c "npm run typecheck && npm run test:run && npm run lint"
}

run_lint() {
    echo "🔍 [Lint] Backend Ruff + Frontend ESLint..."
    docker compose run --rm backend ruff check app/ tests/
    docker run --rm -v "${ROOT_DIR}/frontend:/app" -w /app -e NEXT_TELEMETRY_DISABLED=1 node:22-alpine \
        npm run lint
}

case "${TARGET}" in
    backend)
        run_backend_tests
        ;;
    frontend)
        run_frontend_tests
        ;;
    lint)
        run_lint
        ;;
    all|*)
        run_backend_tests
        run_frontend_tests
        echo "✅ Tous les tests TDD (Backend + Frontend) sont passés avec succès !"
        ;;
esac
