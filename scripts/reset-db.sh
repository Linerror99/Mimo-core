#!/bin/bash
# =============================================================================
# MIMO FINANCE - Database Reset Script
# =============================================================================
# ⚠️  WARNING: This will DELETE ALL DATA and recreate the database!
# Use only in development or for complete reset
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

echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  DANGER ZONE: Database Reset                        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}This will DELETE ALL DATA in the database!${NC}"
echo -e "${YELLOW}Are you sure you want to continue?${NC}"
echo ""
read -p "Type 'YES' in uppercase to confirm: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo -e "${YELLOW}❌ Reset cancelled${NC}"
    exit 0
fi
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1/4: Backing up current data (optional)...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="./backups/pre-reset-backup_${TIMESTAMP}.sql"

mkdir -p ./backups

read -p "Create backup before reset? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Creating backup...${NC}"
    docker compose exec -T postgres pg_dump -U ${DB_USER:-duoflow} ${DB_NAME:-duoflow} > "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}${NC}"
    else
        echo -e "${RED}❌ Backup failed${NC}"
        exit 1
    fi
fi
echo ""

echo -e "${YELLOW}📋 Step 2/4: Dropping all tables...${NC}"
docker compose exec -T backend python -c "
from app.database import engine, Base
Base.metadata.drop_all(bind=engine)
print('✅ All tables dropped')
"
echo ""

echo -e "${YELLOW}📋 Step 3/4: Running migrations...${NC}"
docker compose exec -T backend alembic upgrade head
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}📋 Step 4/4: Seeding fresh data...${NC}"
docker compose exec -T backend python scripts/reset_and_seed.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Data seeded successfully${NC}"
else
    echo -e "${RED}❌ Data seeding failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ Database Reset Complete!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Fresh database is ready with seed data"
echo ""
