#!/bin/bash
# =============================================================================
# MIMO FINANCE - Health Check Script
# =============================================================================
# Check health of all services (PostgreSQL, Redis, Backend, Frontend)
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

API_URL=${API_URL:-http://localhost:8000}
FRONTEND_URL="http://localhost:5000"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MIMO FINANCE - Health Check                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

FAILED=0

# Check Docker
echo -e "${YELLOW}🐳 Checking Docker...${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is running${NC}"
else
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi
echo ""

# Check PostgreSQL
echo -e "${YELLOW}🗄️  Checking PostgreSQL...${NC}"
if docker compose exec -T postgres pg_isready -U ${DB_USER:-duoflow} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is healthy${NC}"
    
    # Get database stats
    DB_SIZE=$(docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d ${DB_NAME:-duoflow} -tAc "SELECT pg_size_pretty(pg_database_size('${DB_NAME:-duoflow}'))")
    USERS_COUNT=$(docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d ${DB_NAME:-duoflow} -tAc "SELECT COUNT(*) FROM users" 2>/dev/null || echo "N/A")
    TRANSACTIONS_COUNT=$(docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d ${DB_NAME:-duoflow} -tAc "SELECT COUNT(*) FROM transactions" 2>/dev/null || echo "N/A")
    
    echo -e "   ${BLUE}Database size:${NC} ${DB_SIZE}"
    echo -e "   ${BLUE}Users:${NC} ${USERS_COUNT}"
    echo -e "   ${BLUE}Transactions:${NC} ${TRANSACTIONS_COUNT}"
else
    echo -e "${RED}❌ PostgreSQL is not responding${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check Redis
echo -e "${YELLOW}🔴 Checking Redis...${NC}"
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
    
    # Get Redis stats
    REDIS_KEYS=$(docker compose exec -T redis redis-cli DBSIZE | cut -d: -f2)
    REDIS_MEMORY=$(docker compose exec -T redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    
    echo -e "   ${BLUE}Keys:${NC} ${REDIS_KEYS}"
    echo -e "   ${BLUE}Memory:${NC} ${REDIS_MEMORY}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check Backend API
echo -e "${YELLOW}🔙 Checking Backend API...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/health 2>/dev/null || echo "000")
if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
    echo -e "   ${BLUE}URL:${NC} ${API_URL}"
    echo -e "   ${BLUE}Docs:${NC} ${API_URL}/docs"
else
    echo -e "${RED}❌ Backend API is not responding (HTTP ${HEALTH_RESPONSE})${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check Frontend
echo -e "${YELLOW}🎨 Checking Frontend...${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" ${FRONTEND_URL} 2>/dev/null || echo "000")
if [ "$FRONTEND_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
    echo -e "   ${BLUE}URL:${NC} ${FRONTEND_URL}"
else
    echo -e "${RED}❌ Frontend is not responding (HTTP ${FRONTEND_RESPONSE})${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check Docker containers status
echo -e "${YELLOW}📦 Docker Containers Status:${NC}"
docker compose ps
echo ""

# Final summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}║            ✅ All Services Healthy!                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}║            ❌ ${FAILED} Service(s) Failed                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "   ${BLUE}•${NC} Check logs: ${YELLOW}docker compose logs${NC}"
    echo -e "   ${BLUE}•${NC} Restart services: ${YELLOW}docker compose restart${NC}"
    echo -e "   ${BLUE}•${NC} Rebuild: ${YELLOW}docker compose up --build -d${NC}"
    exit 1
fi
