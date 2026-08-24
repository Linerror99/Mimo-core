#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"

FILE="$1"

if [ -z "$FILE" ]; then
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "❌ Aucun dossier de backup trouvé à $BACKUP_DIR"
        exit 1
    fi
    FILE=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -n 1)
    if [ -z "$FILE" ]; then
        echo "❌ Aucun fichier de sauvegarde .sql trouvé dans $BACKUP_DIR"
        exit 1
    fi
elif [ ! -f "$FILE" ]; then
    if [ -f "$BACKUP_DIR/$FILE" ]; then
        FILE="$BACKUP_DIR/$FILE"
    else
        echo "❌ Fichier de sauvegarde introuvable : $FILE"
        exit 1
    fi
fi

echo "⚠️ ATTENTION : La restauration va écraser les données actuelles de la base de données !"
echo "📁 Fichier à restaurer : $FILE"
read -p "Êtes-vous sûr de vouloir continuer ? (o/N) " confirm

if [[ "$confirm" =~ ^[oOyY]$ ]]; then
    echo "🔄 Restauration en cours..."
    docker compose exec -T postgres psql -U duoflow -d duoflow < "$FILE"
    echo "🔄 Redémarrage du backend..."
    docker compose restart backend
    echo "✅ Restauration effectuée avec succès !"
else
    echo "🛑 Restauration annulée."
fi
