#!/bin/bash
# =============================================================================
# MIMO FINANCE - Database Backup Script
# =============================================================================
# Create a backup of the PostgreSQL database
# Usage: ./backup-db.sh [backup-name]
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

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"backup"}
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_${TIMESTAMP}.sql"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   MIMO FINANCE - Database Backup                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Creating backup...${NC}"
echo -e "   Database: ${YELLOW}${DB_NAME:-duoflow}${NC}"
echo -e "   Output: ${YELLOW}${BACKUP_FILE}${NC}"
echo ""

# Create backup
docker compose exec -T postgres pg_dump -U ${DB_USER:-duoflow} ${DB_NAME:-duoflow} > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Get file size
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    else
        # Linux/Windows
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    fi
    
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo -e "   File: ${YELLOW}${BACKUP_FILE}${NC}"
    echo -e "   Size: ${YELLOW}${SIZE}${NC}"
    echo ""
    
    # Clean old backups (keep last BACKUP_RETENTION_DAYS days)
    RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
    echo -e "${YELLOW}🧹 Cleaning old backups (>${RETENTION_DAYS} days)...${NC}"
    find "$BACKUP_DIR" -name "*.sql" -type f -mtime +${RETENTION_DAYS} -delete
    
    REMAINING=$(find "$BACKUP_DIR" -name "*.sql" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ Total backups: ${REMAINING}${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ Backup Complete!                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
