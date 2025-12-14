#!/bin/bash

###############################################################################
# Script de Génération de Secret JWT Sécurisé
# 
# Génère un secret aléatoire de 64 caractères pour JWT
# À utiliser pour créer le secret dans Google Secret Manager
#
# Usage:
#   ./scripts/generate-jwt-secret.sh
###############################################################################

set -e

echo "🔐 Génération du JWT Secret..."
echo ""

# Générer un secret de 64 caractères (base64 puis nettoyé)
SECRET=$(openssl rand -base64 48 | tr -d "=+/\n" | cut -c1-64)

echo "✅ JWT Secret généré (64 caractères) :"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT : Copier ce secret et le stocker dans Google Secret Manager"
echo ""
echo "📋 Commande pour créer le secret dans GCP :"
echo ""
echo "echo -n \"$SECRET\" | gcloud secrets create jwt-secret \\"
echo "  --data-file=- \\"
echo "  --replication-policy=\"automatic\" \\"
echo "  --project=mimo-finance-prod"
echo ""
echo "⚠️  NE JAMAIS COMMIT CE SECRET DANS GIT !"
echo "⚠️  Effacer ce terminal après utilisation"
echo ""
