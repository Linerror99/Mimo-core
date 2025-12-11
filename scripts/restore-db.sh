#!/bin/bash
# =============================================================================
# MIMO FINANCE - Database Restore Script
# =============================================================================
# Restore database from a backup file
# Usage: ./restore-db.sh <backup-file>
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
echo -e "${GREEN}║   MIMO FINANCE - Database Restore                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo -e "${YELLOW}Usage: ./restore-db.sh <backup-file>${NC}"
    echo ""
    echo -e "Available backups:"
    ls -lh ./backups/*.sql 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will replace ALL current data!${NC}"
echo -e "   Backup file: ${YELLOW}${BACKUP_FILE}${NC}"
echo ""
read -p "Type 'YES' in uppercase to confirm restore: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo -e "${YELLOW}❌ Restore cancelled${NC}"
    exit 0
fi
echo ""

echo -e "${YELLOW}📋 Step 1/3: Creating safety backup of current data...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SAFETY_BACKUP="./backups/pre-restore-backup_${TIMESTAMP}.sql"
mkdir -p ./backups
docker compose exec -T postgres pg_dump -U ${DB_USER:-duoflow} ${DB_NAME:-duoflow} > "$SAFETY_BACKUP"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Safety backup created: ${SAFETY_BACKUP}${NC}"
else
    echo -e "${RED}❌ Safety backup failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}📋 Step 2/3: Dropping current database...${NC}"
docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME:-duoflow};"
docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d postgres -c "CREATE DATABASE ${DB_NAME:-duoflow};"
echo -e "${GREEN}✅ Database recreated${NC}"
echo ""

echo -e "${YELLOW}📋 Step 3/3: Restoring from backup...${NC}"
cat "$BACKUP_FILE" | docker compose exec -T postgres psql -U ${DB_USER:-duoflow} -d ${DB_NAME:-duoflow}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Restore completed successfully!${NC}"
else
    echo -e "${RED}❌ Restore failed${NC}"
    echo -e "${YELLOW}⚠️  You can restore from safety backup:${NC}"
    echo -e "   ${YELLOW}./restore-db.sh ${SAFETY_BACKUP}${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ Restore Complete!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Database restored from backup"
echo ""
