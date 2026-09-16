#!/bin/bash

###############################################################################
# Script d'Initialisation du Projet GCP - Mimo Finance
#
# Ce script configure le projet GCP complet en un seul passage :
# - Détection ou configuration du projet GCP actif
# - Activation des 16 APIs requises (dont secretmanager et vpcaccess)
# - Génération et stockage sécurisé des secrets (jwt-secret, db-password, admin-token)
# - Création du bucket Terraform state avec versioning (${PROJECT_ID}-tfstate)
# - Génération du fichier terraform/terraform.tfvars
#
# Pré-requis :
#   - gcloud CLI installé et authentifié (gcloud auth login)
#   - gcloud auth application-default login
#
# Usage:
#   ./scripts/setup-gcp-project.sh [PROJECT_ID] [ADMIN_EMAIL]
###############################################################################

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        🚀 MIMO FINANCE - Setup GCP Production        ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Détection du projet actif ou paramètre
DEFAULT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "project-df0355fd-eba9-4724-bbd")
PROJECT_ID="${1:-$DEFAULT_PROJECT}"
ADMIN_EMAIL="${2:-djossou628@gmail.com}"
REGION="europe-west1"
ZONE="europe-west1-b"
BUCKET_NAME="${PROJECT_ID}-tfstate"

echo -e "${YELLOW}📋 Configuration :${NC}"
echo "  Project ID   : $PROJECT_ID"
echo "  Region       : $REGION (Belgique)"
echo "  Zone         : $ZONE"
echo "  Admin Email  : $ADMIN_EMAIL"
echo "  State Bucket : gs://$BUCKET_NAME"
echo ""

# Définir le projet actif dans gcloud
gcloud config set project "$PROJECT_ID" --quiet

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 1/4 : Activation des APIs GCP${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Activation des APIs requises (cela peut prendre 1 à 2 minutes)..."

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
    vpcaccess.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    --project="$PROJECT_ID"

echo -e "${GREEN}✅ Toutes les APIs sont activées${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 2/4 : Gestion des Secrets dans Secret Manager${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. JWT Secret
if gcloud secrets describe jwt-secret --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret jwt-secret existe déjà, skip${NC}"
else
    echo "🔐 Création du secret jwt-secret..."
    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/\n" | cut -c1-64 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✅ jwt-secret créé${NC}"
fi

# 2. Database Password
if gcloud secrets describe db-password --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret db-password existe déjà, skip${NC}"
else
    echo "🔐 Création du secret db-password..."
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/\n" 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✅ db-password créé${NC}"
fi

# 3. Admin Token
if gcloud secrets describe admin-token --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret admin-token existe déjà, récupération...${NC}"
    ADMIN_TOKEN=$(gcloud secrets versions access latest --secret=admin-token --project="$PROJECT_ID")
else
    echo "🔐 Création du secret admin-token..."
    ADMIN_TOKEN=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    echo -n "$ADMIN_TOKEN" | gcloud secrets create admin-token \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✅ admin-token créé${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 3/4 : Création du Bucket Terraform State${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if gcloud storage buckets describe "gs://$BUCKET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Le bucket gs://$BUCKET_NAME existe déjà${NC}"
else
    echo "Création du bucket Terraform state gs://$BUCKET_NAME..."
    gcloud storage buckets create "gs://$BUCKET_NAME" \
        --project="$PROJECT_ID" \
        --location="$REGION" \
        --uniform-bucket-level-access
    echo -e "${GREEN}✅ Bucket créé${NC}"
fi

# Activer le versioning
echo "Activation du versioning sur le bucket..."
gcloud storage buckets update "gs://$BUCKET_NAME" --versioning
echo -e "${GREEN}✅ Versioning activé${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Étape 4/4 : Fichiers de Configuration Terraform${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

# Mise à jour de backend.tf avec le bon bucket
cat <<EOF > "$TERRAFORM_DIR/backend.tf"
# Terraform Configuration - Mimo Finance Production

terraform {
  backend "gcs" {
    bucket = "$BUCKET_NAME"
    prefix = "production/state"
  }
  
  required_version = ">= 1.6"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
EOF
echo -e "${GREEN}✅ terraform/backend.tf configuré avec $BUCKET_NAME${NC}"

# Création du fichier terraform.tfvars pour éviter toute invite interactive
cat <<EOF > "$TERRAFORM_DIR/terraform.tfvars"
project_id  = "$PROJECT_ID"
region      = "$REGION"
zone        = "$ZONE"
admin_email = "$ADMIN_EMAIL"
EOF
echo -e "${GREEN}✅ terraform/terraform.tfvars généré (plus de questions lors du apply)${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        ✅ Configuration GCP Terminée avec Succès !   ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Project ID        : ${GREEN}$PROJECT_ID${NC}"
echo -e "Bucket State      : ${GREEN}gs://$BUCKET_NAME${NC}"
echo -e "Admin Token       : ${YELLOW}$ADMIN_TOKEN${NC}"
echo ""
echo -e "${YELLOW}👉 Vous pouvez maintenant lancer Terraform :${NC}"
echo "   cd terraform"
echo "   terraform init -reconfigure"
echo "   terraform plan"
echo "   terraform apply"
echo ""
