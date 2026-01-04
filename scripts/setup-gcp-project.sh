#!/bin/bash

###############################################################################
# Script d'Initialisation du Projet GCP - Mimo Finance
#
# Ce script configure le projet GCP complet :
# - Création du projet
# - Activation des APIs
# - Création des secrets
# - Configuration des permissions
#
# Pré-requis :
#   - gcloud CLI installé et authentifié
#   - Compte GCP avec permissions de création de projet
#   - Compte de facturation actif
#
# Usage:
#   ./scripts/setup-gcp-project.sh
###############################################################################

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        🚀 MIMO FINANCE - Setup GCP Production        ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration
PROJECT_ID="mimo-finance-prod"
PROJECT_NAME="Mimo Finance Production"
REGION="europe-west1"
ZONE="europe-west1-b"

echo -e "${YELLOW}📋 Configuration :${NC}"
echo "  Project ID   : $PROJECT_ID"
echo "  Project Name : $PROJECT_NAME"
echo "  Region       : $REGION (Belgique)"
echo "  Zone         : $ZONE"
echo ""

# Demander confirmation
read -p "Continuer avec cette configuration ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Installation annulée${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 1/5 : Création du Projet GCP${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Vérifier si le projet existe déjà
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  Le projet $PROJECT_ID existe déjà${NC}"
else
    echo "Création du projet..."
    gcloud projects create $PROJECT_ID \
        --name="$PROJECT_NAME" \
        --set-as-default
    
    echo -e "${GREEN}✅ Projet créé avec succès${NC}"
fi

# Définir le projet par défaut
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✅ Projet défini comme projet actif${NC}"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT : Lier un compte de facturation${NC}"
echo "Aller sur : https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
echo ""
read -p "Appuyer sur Entrée après avoir lié le compte de facturation..."
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 2/5 : Activation des APIs GCP${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Activation de 15 APIs (cela peut prendre 2-3 minutes)..."

gcloud services enable \
    run.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    storage.googleapis.com \
    cloudscheduler.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com

echo -e "${GREEN}✅ Toutes les APIs sont activées${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 3/5 : Génération et Stockage des Secrets${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Générer JWT Secret
echo "🔐 Génération du JWT Secret..."
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/\n" | cut -c1-64)
echo -e "${GREEN}✅ JWT Secret généré${NC}"

# Générer Database Password
echo "🔐 Génération du Database Password..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/\n")
echo -e "${GREEN}✅ Database Password généré${NC}"

# Générer Admin Token
echo "🔐 Génération de l'Admin Token..."
ADMIN_TOKEN=$(openssl rand -hex 32)
echo -e "${GREEN}✅ Admin Token généré${NC}"

echo ""
echo "Stockage des secrets dans Google Secret Manager..."

# JWT Secret
if gcloud secrets describe jwt-secret --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret jwt-secret existe déjà, skip${NC}"
else
    echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret \
        --data-file=- \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✅ jwt-secret créé${NC}"
fi

# Database Password
if gcloud secrets describe db-password --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret db-password existe déjà, skip${NC}"
else
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
        --data-file=- \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✅ db-password créé${NC}"
fi

# Admin Token
if gcloud secrets describe admin-token --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret admin-token existe déjà, récupération...${NC}"
    ADMIN_TOKEN=$(gcloud secrets versions access latest --secret=admin-token --project=$PROJECT_ID)
    echo -e "${GREEN}✅ admin-token récupéré depuis Secret Manager${NC}"
else
    echo -n "$ADMIN_TOKEN" | gcloud secrets create admin-token \
        --data-file=- \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✅ admin-token créé${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 4/5 : Création du Bucket Terraform State${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BUCKET_NAME="${PROJECT_ID}-terraform-state"

# Vérifier si le bucket existe
if gcloud storage buckets describe gs://$BUCKET_NAME --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  Le bucket $BUCKET_NAME existe déjà${NC}"
else
    echo "Création du bucket Terraform state..."
    gcloud storage buckets create gs://$BUCKET_NAME \
        --project=$PROJECT_ID \
        --location=$REGION \
        --uniform-bucket-level-access
    echo -e "${GREEN}✅ Bucket créé${NC}"
fi

# Activer le versioning
echo "Activation du versioning..."
gcloud storage buckets update gs://$BUCKET_NAME --versioning
echo -e "${GREEN}✅ Versioning activé${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 5/5 : Création de l'Artifact Registry${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

REPO_NAME="mimo-repo"

# Vérifier si le repository existe
if gcloud artifacts repositories describe $REPO_NAME --location=$REGION &>/dev/null; then
    echo -e "${YELLOW}⚠️  Le repository $REPO_NAME existe déjà${NC}"
else
    echo "Création du repository Docker..."
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Mimo Finance Docker Images" \
        --project=$PROJECT_ID
    
    echo -e "${GREEN}✅ Artifact Registry créé${NC}"
fi

# Configurer Docker pour Artifact Registry
echo "Configuration de Docker..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo -e "${GREEN}✅ Docker configuré${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        ✅ Setup GCP Terminé avec Succès !        ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}📋 Récapitulatif :${NC}"
echo ""
echo "  Project ID        : $PROJECT_ID"
echo "  Region            : $REGION"
echo "  APIs activées     : 15"
echo "  Secrets créés     : 3 (jwt-secret, db-password, admin-token)"
echo "  Terraform Bucket  : gs://$BUCKET_NAME"
echo "  Artifact Registry : $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"
echo ""

echo -e "${YELLOW}📝 Secrets à ajouter dans GitHub :${NC}"
echo ""
echo "  ADMIN_TOKEN=$ADMIN_TOKEN"
echo ""
echo "⚠️  Copier cette valeur dans GitHub Repository Settings > Secrets"
echo ""

echo -e "${GREEN}🎯 Prochaine étape :${NC}"
echo "  cd terraform/"
echo "  terraform init"
echo "  terraform plan"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
