#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Initialisation complète de l'environnement local (100 % Docker)
# ==============================================================================
set -euo pipefail

echo "🚀 Initialisation de Mimo Finance (PostgreSQL + Redis + FastAPI + Next.js 15)"
echo "=============================================================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas lancé. Démarre Docker Desktop puis réessaie.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker est actif${NC}"

if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env créé depuis .env.example${NC}"
else
    echo -e "${YELLOW}⚠️  .env déjà présent${NC}"
fi

if [ ! -f frontend/.env ] && [ -f frontend/.env.docker ]; then
    cp frontend/.env.docker frontend/.env
    echo -e "${GREEN}✅ frontend/.env créé depuis frontend/.env.docker${NC}"
fi

echo ""
echo "🐳 Construction et démarrage des conteneurs..."
docker compose up -d --build

echo "⏳ Attente du backend (http://localhost:8000/health)..."
max_retries=40
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend opérationnel !${NC}"
        break
    fi
    retry_count=$((retry_count + 1))
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo -e "${RED}❌ Le backend n'a pas démarré à temps.${NC}"
    echo "Voir les logs : docker compose logs backend"
    exit 1
fi

echo "🗄️  Application des migrations Alembic..."
docker compose exec -T backend alembic upgrade head
echo -e "${GREEN}✅ Migrations appliquées${NC}"

echo ""
echo -e "${GREEN}✅ Mimo Finance est prêt !${NC}"
echo "   Frontend : http://localhost:3000"
echo "   Backend  : http://localhost:8000"
echo "   Swagger  : http://localhost:8000/docs"
echo ""
echo "Commandes utiles :"
echo "   ./scripts/dev.sh       (démarrer avec build)"
echo "   ./scripts/test.sh all  (lancer les tests TDD)"
echo "   ./menu.sh              (centre de contrôle interactif)"
echo "   docker compose down    (arrêter tous les services)"
