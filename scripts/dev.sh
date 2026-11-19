#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Démarrage complet 100 % conteneurisé (BDD + Redis + API + Next)
# Usage : ./scripts/dev.sh [--seed]
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker n'est pas démarré. Lance Docker Desktop puis réessaie."
    exit 1
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "📄 Création du fichier .env depuis .env.example..."
    cp .env.example .env
fi

if [ ! -f "frontend/.env" ] && [ -f "frontend/.env.docker" ]; then
    echo "📄 Création de frontend/.env depuis frontend/.env.docker..."
    cp frontend/.env.docker frontend/.env
fi

echo "🚀 Construction et démarrage des conteneurs Mimo Finance (PostgreSQL + Redis + FastAPI + Next.js)..."
docker compose up --build -d

echo "⏳ Attente de la disponibilité de l'API Backend..."
max_retries=40
retry=0
until curl -sf http://localhost:8000/health >/dev/null 2>&1; do
    retry=$((retry + 1))
    if [ "${retry}" -ge "${max_retries}" ]; then
        echo "❌ Le backend n'a pas répondu à temps. Logs : docker compose logs backend"
        exit 1
    fi
    sleep 2
done

if [ "${1:-}" = "--seed" ] && [ -f "test_data.sql" ]; then
    echo "🌱 Chargement des données de test (test_data.sql) dans PostgreSQL..."
    docker exec -i mimo-postgres psql -v ON_ERROR_STOP=1 -U duoflow -d duoflow < test_data.sql
    echo "✅ Données de test chargées (ex: alexandre@test.com / password123)"
fi

echo ""
echo "✅ Mimo Finance est démarré et prêt :"
echo "   - Frontend UI  : http://localhost:3000"
echo "   - Backend API  : http://localhost:8000"
echo "   - Swagger Docs : http://localhost:8000/docs"
echo "   - Health Check : http://localhost:8000/health"
echo ""
echo "💡 Logs en direct : docker compose logs -f"
echo "💡 Arrêter tout   : docker compose down"
