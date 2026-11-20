#!/bin/bash
# ==========================================================
# MIMO FINANCE - Chargement des données de test sur Cloud SQL
# ==========================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ID="project-df0355fd-eba9-4724-bbd"
INSTANCE_NAME="mimo-db-7100c619"
DB_NAME="mimo_db"
DB_USER="mimo_user"
BUCKET_NAME="${PROJECT_ID}-backups"
GCS_URI="gs://${BUCKET_NAME}/test_data.sql"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     MIMO FINANCE - Chargement Cloud SQL (GCP)           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -f "test_data.sql" ]; then
    echo -e "${RED}❌ Erreur : le fichier test_data.sql n'existe pas.${NC}"
    echo -e "${YELLOW}Générez-le d'abord depuis le menu (option 8).${NC}"
    exit 1
fi

echo -e "Projet GCP          : ${CYAN}${PROJECT_ID}${NC}"
echo -e "Instance Cloud SQL  : ${CYAN}${INSTANCE_NAME}${NC}"
echo -e "Base de données     : ${CYAN}${DB_NAME}${NC}"
echo -e "Utilisateur DB      : ${CYAN}${DB_USER}${NC}"
echo ""

# Étape 1 : Téléversement vers Cloud Storage
echo -e "${YELLOW}>>> [1/2] Téléversement de test_data.sql vers GCS (${GCS_URI})...${NC}"
gcloud storage cp test_data.sql "${GCS_URI}" --project="${PROJECT_ID}" --quiet

# Étape 2 : Importation serveur Cloud SQL
echo -e "${YELLOW}>>> [2/2] Importation native des données dans Cloud SQL (${INSTANCE_NAME})...${NC}"
gcloud sql import sql "${INSTANCE_NAME}" "${GCS_URI}" \
  --project="${PROJECT_ID}" \
  --database="${DB_NAME}" \
  --user="${DB_USER}" \
  --quiet

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      ✅ Données de test chargées sur Cloud SQL !         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e " ${BOLD}Comptes de test actifs sur Cloud (Mot de passe: ${YELLOW}password123${NC}) :${NC}"
echo -e "   1. ${CYAN}alexandre@test.com${NC} - Salarié CDI (2600 €/m)"
echo -e "   2. ${CYAN}sophie@test.com${NC}    - Freelance Tech (3400 €/m)"
echo -e "   3. ${CYAN}lucas@test.com${NC}     - Étudiant / Alternant (950 €/m)"
echo ""
