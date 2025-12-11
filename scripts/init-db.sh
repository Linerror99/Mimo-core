#!/bin/bash
# =============================================================================
# MIMO FINANCE - Database Initialization Script
# =============================================================================
# Initialize database for the first time:
# - Run Alembic migrations
# - Seed initial data (categories, users if needed)
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   MIMO FINANCE - Database Initialization                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1/4: Checking PostgreSQL health...${NC}"
if ! docker compose exec -T postgres pg_isready -U ${DB_USER:-duoflow} > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not ready. Please start services first:${NC}"
    echo -e "   ${YELLOW}docker compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
echo ""

echo -e "${YELLOW}📋 Step 2/4: Running Alembic migrations...${NC}"
docker compose exec -T backend alembic upgrade head
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}📋 Step 3/4: Checking if database has data...${NC}"
HAS_DATA=$(docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d ${DB_NAME:-duoflow} -tAc "SELECT COUNT(*) FROM users")
if [ "$HAS_DATA" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Database already has ${HAS_DATA} users${NC}"
    read -p "Do you want to seed additional data? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping data seeding${NC}"
        echo ""
        echo -e "${GREEN}✅ Database initialization completed!${NC}"
        exit 0
    fi
fi
echo ""

echo -e "${YELLOW}📋 Step 4/4: Seeding initial data...${NC}"
docker compose exec -T backend python scripts/reset_and_seed.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Data seeded successfully${NC}"
else
    echo -e "${RED}❌ Data seeding failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ Database Ready!                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 You can now:"
echo -e "   ${GREEN}•${NC} Access API: ${YELLOW}http://localhost:8000${NC}"
echo -e "   ${GREEN}•${NC} View docs: ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "   ${GREEN}•${NC} Access frontend: ${YELLOW}http://localhost:5000${NC}"
echo ""
