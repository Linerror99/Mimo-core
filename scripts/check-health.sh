#!/bin/bash

echo "🔍 Vérification complète de l'environnement Sprint 0"
echo "===================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Backend
echo "🔍 Backend (http://localhost:8000)..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend OK${NC}"
else
    echo -e "${RED}❌ Backend KO${NC}"
fi

# Check Backend Detailed
echo ""
echo "🔍 Backend Detailed Health..."
curl -s http://localhost:8000/health/detailed | python -m json.tool

# Check Frontend
echo ""
echo "🔍 Frontend (http://localhost:5000)..."
if curl -s http://localhost:5000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend OK${NC}"
else
    echo -e "${RED}❌ Frontend KO${NC}"
fi

# Check Docker containers
echo ""
echo "🐳 Docker Containers Status..."
docker-compose ps

echo ""
echo -e "${GREEN}✅ Vérification terminée !${NC}"
echo ""
echo "📋 URLs disponibles :"
echo "   Frontend:  http://localhost:5000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
