#!/bin/bash
set -e

# Répertoire du script et dossier de sauvegarde
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/mimo_backup_$TIMESTAMP.sql"

echo "📦 Création du dump de la base de données PostgreSQL..."

docker compose exec -T postgres pg_dump -U duoflow --clean --if-exists duoflow > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Sauvegarde réussie !"
    echo "📁 Fichier : $BACKUP_FILE"
    echo "📊 Taille  : $FILE_SIZE"
else
    echo "❌ Erreur lors de la création de la sauvegarde."
fi
