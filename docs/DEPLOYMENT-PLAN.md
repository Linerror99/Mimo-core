# 🚀 Plan de Déploiement GCP - Mimo Finance

**Date :** 13 décembre 2025  
**Sprint :** Sprint 9  
**Branch de travail :** `sprint_9`  
**Environnement :** Production uniquement (pas de staging)

---

## 📋 Vue d'Ensemble

### Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────┐
│                    DÉPLOIEMENT SIMPLIFIÉ                     │
│                  (Projet Personnel - Prod)                   │
└─────────────────────────────────────────────────────────────┘

GIT WORKFLOW
├─ develop          → développement local
├─ staging          → PRODUCTION (merge = auto-deploy via CI)
└─ main             → releases manuelles (tags, changelog)

GCP PRODUCTION
├─ Cloud Run Backend    (FastAPI - 1 vCPU, 512MB)
├─ Cloud Run Frontend   (React/Nginx - 1 vCPU, 256MB)
├─ Cloud SQL           (PostgreSQL db-f1-micro)
├─ Cloud Memorystore   (Redis 1GB)
├─ Cloud Storage       (Uploads + Backups)
├─ Cloud Scheduler     (Jobs automatiques)
└─ Cloud Monitoring    (Logs + Métriques + Alertes)
```

### Stratégie CI/CD

**✅ CE QU'ON FAIT :**
- Merge `develop` → `staging` = **Déploiement automatique en production**
- GitHub Actions construit, teste et déploie
- Monitoring et alertes activés

**❌ CE QU'ON NE FAIT PAS :**
- Pas d'environnement staging séparé
- Pas de CI sur `main` (releases manuelles uniquement)
- Pas de tests staging (tests locaux suffisants)

---

## 🎯 Objectifs du Déploiement

### Critères de Succès

✅ Application accessible via HTTPS (domaine ou Cloud Run URL)  
✅ Backend + Frontend déployés et communiquent  
✅ Base de données PostgreSQL opérationnelle  
✅ Redis connecté pour les sessions  
✅ Uploads de fichiers fonctionnels (Cloud Storage)  
✅ Job validation automatique à 06h UTC quotidien  
✅ Backup hebdomadaire de la DB (chaque dimanche)  
✅ Monitoring et alertes configurés  
✅ CORS configuré avec URL frontend production  
✅ Tous les secrets dans Secret Manager  
✅ JWT sécurisé avec expiration réduite (15min access, 7j refresh)  

---

## 📦 PHASE 1 : Préparation GCP (Jour 1)

### Étape 1.1 : Création Projet GCP

```bash
# Variables
PROJECT_ID="mimo-finance-prod"
PROJECT_NAME="Mimo Finance Production"
REGION="europe-west1"  # Belgique (proche France)
ZONE="europe-west1-b"

# Créer projet
gcloud projects create $PROJECT_ID \
  --name="$PROJECT_NAME" \
  --set-as-default

# Lier à un compte de facturation (requis)
# → À faire manuellement dans Console GCP
```

### Étape 1.2 : Activer les APIs

```bash
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
  compute.googleapis.com
```

### Étape 1.3 : Générer JWT Secret

**Script de génération** (`scripts/generate-jwt-secret.sh`) :

```bash
#!/bin/bash
# Génère un secret JWT sécurisé de 64 caractères

SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
echo "JWT_SECRET généré (à copier dans Secret Manager) :"
echo "$SECRET"
echo ""
echo "⚠️  NE PAS COMMIT CE SECRET !"
```

**Exécuter :**
```bash
chmod +x scripts/generate-jwt-secret.sh
./scripts/generate-jwt-secret.sh

# Copier la valeur générée pour Secret Manager
```

### Étape 1.4 : Créer Secrets Manager

```bash
# 1. JWT Secret
echo -n "VOTRE_JWT_SECRET_GENERE" | \
  gcloud secrets create jwt-secret \
    --data-file=- \
    --replication-policy="automatic"

# 2. Database Password
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create db-password \
    --data-file=- \
    --replication-policy="automatic"

# 3. Redis Auth (optionnel selon config)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create redis-auth \
    --data-file=- \
    --replication-policy="automatic"

# Vérifier
gcloud secrets list
```

---

## 🏗️ PHASE 2 : Infrastructure Terraform (Jours 2-4)

### Étape 2.1 : Structure des Fichiers

```
terraform/
├── backend.tf              # State dans GCS
├── main.tf                 # Ressources principales
├── variables.tf            # Variables d'input
├── outputs.tf              # Outputs (URLs, IPs)
├── terraform.tfvars        # Valeurs production
├── modules/
│   ├── vpc/
│   ├── cloud-sql/
│   ├── redis/
│   ├── cloud-run/
│   ├── storage/
│   ├── scheduler/
│   ├── monitoring/
│   └── iam/
└── README.md
```

### Étape 2.2 : Configuration Backend (State)

**`terraform/backend.tf`** :
```hcl
terraform {
  backend "gcs" {
    bucket = "mimo-terraform-state"
    prefix = "production/state"
  }
  
  required_version = ">= 1.6"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

**Créer le bucket state manuellement** :
```bash
gsutil mb -p mimo-finance-prod -l europe-west1 gs://mimo-terraform-state
gsutil versioning set on gs://mimo-terraform-state
```

### Étape 2.3 : Ressources à Créer

#### 📌 Module VPC (Simplifié)
- VPC avec subnet privé
- Cloud NAT pour accès internet sortant
- Firewall rules (SSH, HTTPS)

#### 📌 Module Cloud SQL
```hcl
resource "google_sql_database_instance" "main" {
  name             = "mimo-db-prod"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier              = "db-f1-micro"  # 0.6GB RAM, partagé
    availability_type = "ZONAL"        # Pas de HA (coût réduit)
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"  # 2h UTC
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 4          # 4 semaines de backups
        retention_unit   = "COUNT"
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false         # Pas d'IP publique
      private_network = google_compute_network.vpc.id
    }
  }
  
  deletion_protection = true  # Protection accidentelle
}

resource "google_sql_database" "mimo" {
  name     = "mimo"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "mimo" {
  name     = "mimo_user"
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.db_password.secret_data
}
```

#### 📌 Module Redis
```hcl
resource "google_redis_instance" "main" {
  name               = "mimo-redis-prod"
  memory_size_gb     = 1
  region             = var.region
  tier               = "BASIC"  # Pas de réplication (coût réduit)
  redis_version      = "REDIS_7_0"
  
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
}
```

#### 📌 Module Cloud Storage
```hcl
# Bucket Uploads
resource "google_storage_bucket" "uploads" {
  name          = "mimo-uploads-prod"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 365  # Supprimer après 1 an
    }
    action {
      type = "Delete"
    }
  }
  
  cors {
    origin          = [var.frontend_url]
    method          = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Bucket Backups
resource "google_storage_bucket" "backups" {
  name          = "mimo-backups-prod"
  location      = var.region
  force_destroy = false
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90  # Garder 90 jours
    }
    action {
      type = "Delete"
    }
  }
}
```

#### 📌 Module Cloud Run Backend
```hcl
resource "google_cloud_run_v2_service" "backend" {
  name     = "mimo-backend-prod"
  location = var.region
  
  template {
    scaling {
      min_instance_count = 0  # Scale to zero
      max_instance_count = 5
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/mimo-repo/backend:latest"
      
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
      
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.mimo.name}:${data.google_secret_manager_secret_version.db_password.secret_data}@${google_sql_database_instance.main.private_ip_address}:5432/mimo"
      }
      
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:6379"
      }
      
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "jwt-secret"
            version = "latest"
          }
        }
      }
      
      env {
        name  = "JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
        value = "15"  # 15min au lieu de 30min
      }
      
      env {
        name  = "JWT_REFRESH_TOKEN_EXPIRE_DAYS"
        value = "7"   # 7 jours
      }
      
      env {
        name  = "CORS_ORIGINS"
        value = var.frontend_url  # Sera mis à jour après déploiement frontend
      }
      
      env {
        name  = "ENVIRONMENT"
        value = "production"
      }
      
      env {
        name  = "GCS_BUCKET_UPLOADS"
        value = google_storage_bucket.uploads.name
      }
    }
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "backend_public" {
  service  = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

#### 📌 Module Cloud Run Frontend
```hcl
resource "google_cloud_run_v2_service" "frontend" {
  name     = "mimo-frontend-prod"
  location = var.region
  
  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/mimo-repo/frontend:latest"
      
      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }
      
      env {
        name  = "VITE_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      
      ports {
        container_port = 80
      }
    }
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_service_iam_member" "frontend_public" {
  service  = google_cloud_run_v2_service.frontend.name
  location = google_cloud_run_v2_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

#### 📌 Module Cloud Scheduler
```hcl
# Job Validation Automatique - 06h UTC quotidien
resource "google_cloud_scheduler_job" "auto_validation" {
  name             = "mimo-auto-validation"
  description      = "Valide automatiquement les transactions pending"
  schedule         = "0 6 * * *"  # 06h UTC tous les jours
  time_zone        = "UTC"
  attempt_deadline = "320s"
  
  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.backend.uri}/api/v1/scheduled/auto-validate"
    
    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = google_cloud_run_v2_service.backend.uri
    }
  }
}

# Job Backup Base de Données - Dimanche 02h UTC
resource "google_cloud_scheduler_job" "db_backup" {
  name             = "mimo-db-backup"
  description      = "Sauvegarde hebdomadaire de la base de données"
  schedule         = "0 2 * * 0"  # Dimanche 02h UTC
  time_zone        = "UTC"
  attempt_deadline = "600s"
  
  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.backend.uri}/api/v1/scheduled/backup"
    
    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = google_cloud_run_v2_service.backend.uri
    }
  }
}
```

#### 📌 Module Monitoring
```hcl
# Uptime Check Backend
resource "google_monitoring_uptime_check_config" "backend" {
  display_name = "Mimo Backend Health Check"
  timeout      = "10s"
  period       = "300s"  # Toutes les 5 min
  
  http_check {
    path           = "/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(google_cloud_run_v2_service.backend.uri, "https://", "")
    }
  }
}

# Alert Policy - Erreurs 5xx
resource "google_monitoring_alert_policy" "backend_errors" {
  display_name = "Backend - Taux d'erreurs élevé"
  combiner     = "OR"
  
  conditions {
    display_name = "Erreurs 5xx > 5%"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
}

# Alert Policy - Latence élevée
resource "google_monitoring_alert_policy" "backend_latency" {
  display_name = "Backend - Latence élevée"
  combiner     = "OR"
  
  conditions {
    display_name = "Latence P95 > 2 secondes"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000  # 2000ms
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
}

# Canal de notification Email
resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Admin"
  type         = "email"
  
  labels = {
    email_address = var.admin_email
  }
}
```

#### 📌 Module IAM
```hcl
# Service Account Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "mimo-cloud-run"
  display_name = "Mimo Cloud Run Service Account"
}

# Permissions Cloud SQL
resource "google_project_iam_member" "cloud_run_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Permissions Cloud Storage
resource "google_storage_bucket_iam_member" "uploads" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Permissions Secret Manager
resource "google_secret_manager_secret_iam_member" "jwt" {
  secret_id = "jwt-secret"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Service Account Cloud Scheduler
resource "google_service_account" "scheduler" {
  account_id   = "mimo-scheduler"
  display_name = "Mimo Cloud Scheduler"
}

resource "google_cloud_run_service_iam_member" "scheduler_invoker" {
  service  = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

# Workload Identity Federation (GitHub Actions)
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }
  
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "github_actions" {
  account_id   = "github-actions"
  display_name = "GitHub Actions Deployer"
}

# Permissions déploiement
resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer",
    "roles/storage.admin",
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Lier GitHub repo à Service Account
resource "google_service_account_iam_member" "github_workload_identity" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/Linerror99/Mimo-core"
}
```

### Étape 2.4 : Variables et Outputs

**`terraform/variables.tf`** :
```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "mimo-finance-prod"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "admin_email" {
  description = "Email pour les alertes monitoring"
  type        = string
}

variable "frontend_url" {
  description = "URL du frontend (sera mis à jour après déploiement)"
  type        = string
  default     = "https://mimo-frontend-prod-XXXXXX.run.app"
}
```

**`terraform/outputs.tf`** :
```hcl
output "backend_url" {
  description = "URL du backend Cloud Run"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "URL du frontend Cloud Run"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "database_ip" {
  description = "IP privée de la base de données"
  value       = google_sql_database_instance.main.private_ip_address
  sensitive   = true
}

output "redis_host" {
  description = "Host Redis"
  value       = google_redis_instance.main.host
  sensitive   = true
}

output "uploads_bucket" {
  description = "Bucket uploads"
  value       = google_storage_bucket.uploads.name
}

output "backups_bucket" {
  description = "Bucket backups"
  value       = google_storage_bucket.backups.name
}
```

---

## 🔄 PHASE 3 : CI/CD GitHub Actions (Jour 5)

### Étape 3.1 : Workflow Deploy Production

**`.github/workflows/deploy-production.yml`** :

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - staging  # Merge dans staging = déploiement prod

env:
  PROJECT_ID: mimo-finance-prod
  REGION: europe-west1
  REPOSITORY: mimo-repo

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run backend tests
        working-directory: ./backend
        run: |
          pytest tests/ --cov=app --cov-report=term-missing
      
      - name: Verify coverage
        working-directory: ./backend
        run: |
          COVERAGE=$(pytest tests/ --cov=app --cov-report=term | grep "TOTAL" | awk '{print $4}' | sed 's/%//')
          if (( $(echo "$COVERAGE < 75" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% < 75%"
            exit 1
          fi
          echo "✅ Coverage $COVERAGE% OK"

  build-and-deploy:
    name: Build and Deploy
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider'
          service_account: 'github-actions@mimo-finance-prod.iam.gserviceaccount.com'
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
      
      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev
      
      - name: Build and Push Backend Image
        run: |
          docker build \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/backend:${{ github.sha }} \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/backend:latest \
            -f backend/Dockerfile \
            ./backend
          
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/backend:${{ github.sha }}
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/backend:latest
      
      - name: Build and Push Frontend Image
        run: |
          # Récupérer URL backend
          BACKEND_URL=$(gcloud run services describe mimo-backend-prod \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          
          docker build \
            --build-arg VITE_API_URL=$BACKEND_URL \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/frontend:${{ github.sha }} \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/frontend:latest \
            -f frontend/Dockerfile.prod \
            ./frontend
          
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/frontend:${{ github.sha }}
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/frontend:latest
      
      - name: Deploy Backend to Cloud Run
        run: |
          gcloud run deploy mimo-backend-prod \
            --image=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/backend:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --allow-unauthenticated
      
      - name: Run Database Migrations
        run: |
          BACKEND_URL=$(gcloud run services describe mimo-backend-prod \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          
          # Trigger migration endpoint (ou via Cloud SQL Proxy)
          curl -f -X POST "$BACKEND_URL/api/v1/admin/migrate" \
            -H "X-Admin-Token: ${{ secrets.ADMIN_TOKEN }}" || exit 1
      
      - name: Deploy Frontend to Cloud Run
        run: |
          gcloud run deploy mimo-frontend-prod \
            --image=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/frontend:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --allow-unauthenticated
      
      - name: Update CORS Configuration
        run: |
          FRONTEND_URL=$(gcloud run services describe mimo-frontend-prod \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          
          # Mettre à jour variable d'env backend avec URL frontend
          gcloud run services update mimo-backend-prod \
            --region=${{ env.REGION }} \
            --update-env-vars=CORS_ORIGINS=$FRONTEND_URL
      
      - name: Smoke Tests
        run: |
          BACKEND_URL=$(gcloud run services describe mimo-backend-prod \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          
          FRONTEND_URL=$(gcloud run services describe mimo-frontend-prod \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          
          # Test backend health
          curl -f $BACKEND_URL/health || exit 1
          
          # Test frontend accessible
          curl -f -I $FRONTEND_URL || exit 1
          
          echo "✅ Smoke tests passed"
          echo "🚀 Backend: $BACKEND_URL"
          echo "🚀 Frontend: $FRONTEND_URL"
      
      - name: Notify Deployment Success
        if: success()
        run: |
          echo "🎉 Déploiement réussi !"
          echo "Backend: $(gcloud run services describe mimo-backend-prod --region=${{ env.REGION }} --format='value(status.url)')"
          echo "Frontend: $(gcloud run services describe mimo-frontend-prod --region=${{ env.REGION }} --format='value(status.url)')"
```

### Étape 3.2 : Configuration des Secrets GitHub

**À ajouter dans GitHub Repository Settings > Secrets** :

```
ADMIN_TOKEN        # Token pour endpoint migration (générer avec openssl rand -hex 32)
```

---

## 🔧 PHASE 4 : Adaptations Code Backend (Jour 6)

### Étape 4.1 : Configuration JWT Production

**`backend/app/core/config.py`** :

```python
class Settings(BaseSettings):
    # JWT Settings
    JWT_SECRET: str = Field(..., env="JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    
    # ⚠️ PRODUCTION : Expiration réduite
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15,  # 15 min au lieu de 30
        env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,   # 7 jours
        env="JWT_REFRESH_TOKEN_EXPIRE_DAYS"
    )
    
    # CORS - À mettre à jour après déploiement frontend
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:5173"],
        env="CORS_ORIGINS",
        description="Liste des origines autorisées (séparées par virgules)"
    )
    
    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # Environment
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Cloud Storage
    GCS_BUCKET_UPLOADS: str | None = Field(default=None, env="GCS_BUCKET_UPLOADS")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
```

### Étape 4.2 : Endpoint Migration Admin

**`backend/app/api/v1/admin.py`** (nouveau fichier) :

```python
from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.config import settings
import subprocess

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_TOKEN = settings.ADMIN_TOKEN  # À configurer

@router.post("/migrate")
async def run_migrations(
    x_admin_token: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    """Exécute les migrations Alembic (CI/CD uniquement)"""
    
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app",
            capture_output=True,
            text=True,
            check=True
        )
        
        return {
            "status": "success",
            "output": result.stdout,
            "message": "Migrations executed successfully"
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {e.stderr}"
        )
```

### Étape 4.3 : Endpoint Backup Database

**`backend/app/api/v1/scheduled/backup.py`** (nouveau fichier) :

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from google.cloud import storage
from datetime import datetime
import subprocess
import os

router = APIRouter(prefix="/scheduled", tags=["scheduled"])

@router.post("/backup")
async def backup_database(db: AsyncSession = Depends(get_db)):
    """
    Sauvegarde hebdomadaire de la base de données
    Appelé par Cloud Scheduler tous les dimanches à 02h UTC
    """
    
    try:
        # Générer dump PostgreSQL
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"mimo_backup_{timestamp}.sql"
        local_path = f"/tmp/{filename}"
        
        # pg_dump via Cloud SQL Proxy ou psql
        db_url = os.getenv("DATABASE_URL")
        subprocess.run(
            f"pg_dump {db_url} > {local_path}",
            shell=True,
            check=True
        )
        
        # Upload vers Cloud Storage
        bucket_name = os.getenv("GCS_BUCKET_BACKUPS", "mimo-backups-prod")
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"weekly/{filename}")
        
        blob.upload_from_filename(local_path)
        
        # Nettoyer fichier local
        os.remove(local_path)
        
        return {
            "status": "success",
            "backup_file": filename,
            "bucket": bucket_name,
            "timestamp": timestamp
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Backup failed: {str(e)}"
        )
```

### Étape 4.4 : Dockerfile Production Backend

**`backend/Dockerfile`** (optimisé pour prod) :

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

#Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run with gunicorn + uvicorn workers
CMD ["gunicorn", "app.main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

### Étape 4.5 : Dockerfile Production Frontend

**`frontend/Dockerfile.prod`** :

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration Nginx optimisée
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/nginx.prod.conf`** :

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

---

## ✅ PHASE 5 : Déploiement Initial (Jour 7)

### Étape 5.1 : Checklist Pré-Déploiement

- [ ] Projet GCP créé et configuré
- [ ] APIs activées
- [ ] JWT Secret généré et stocké dans Secret Manager
- [ ] Bucket Terraform state créé
- [ ] Terraform `init` + `plan` + `apply` réussi
- [ ] Backend et Frontend build localement OK
- [ ] Tests backend passent (coverage > 75%)
- [ ] Workload Identity configuré
- [ ] GitHub Secrets ajoutés

### Étape 5.2 : Déploiement Terraform

```bash
cd terraform/

# Initialiser
terraform init

# Vérifier plan
terraform plan -out=tfplan

# Appliquer (première fois)
terraform apply tfplan

# Récupérer outputs
terraform output backend_url
terraform output frontend_url
```

### Étape 5.3 : Premier Déploiement Manuel

```bash
# Build images localement
docker build -t backend:test -f backend/Dockerfile ./backend
docker build -t frontend:test -f frontend/Dockerfile.prod ./frontend

# Push vers Artifact Registry
docker tag backend:test europe-west1-docker.pkg.dev/mimo-finance-prod/mimo-repo/backend:v1.0.0
docker tag frontend:test europe-west1-docker.pkg.dev/mimo-finance-prod/mimo-repo/frontend:v1.0.0

docker push europe-west1-docker.pkg.dev/mimo-finance-prod/mimo-repo/backend:v1.0.0
docker push europe-west1-docker.pkg.dev/mimo-finance-prod/mimo-repo/frontend:v1.0.0

# Déployer Cloud Run (première fois)
gcloud run deploy mimo-backend-prod \
  --image=europe-west1-docker.pkg.dev/mimo-finance-prod/mimo-repo/backend:v1.0.0 \
  --region=europe-west1 \
  --allow-unauthenticated

gcloud run deploy mimo-frontend-prod \
  --image=europe-west1-docker.pkg.dev/mimo-finance-prod/mimo-repo/frontend:v1.0.0 \
  --region=europe-west1 \
  --allow-unauthenticated
```

### Étape 5.4 : Mise à Jour CORS

```bash
# Récupérer URL frontend
FRONTEND_URL=$(gcloud run services describe mimo-frontend-prod \
  --region=europe-west1 \
  --format='value(status.url)')

# Mettre à jour CORS backend
gcloud run services update mimo-backend-prod \
  --region=europe-west1 \
  --update-env-vars=CORS_ORIGINS=$FRONTEND_URL

echo "✅ CORS mis à jour avec: $FRONTEND_URL"
```

### Étape 5.5 : Tests Post-Déploiement

```bash
# 1. Health check backend
curl https://mimo-backend-prod-XXXXXX.run.app/health

# 2. Test endpoint auth
curl -X POST https://mimo-backend-prod-XXXXXX.run.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@mimo.fr",
    "password": "Test123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# 3. Accès frontend
curl -I https://mimo-frontend-prod-XXXXXX.run.app

# 4. Vérifier logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mimo-backend-prod" \
  --limit 50 \
  --format json
```

---

## 📊 PHASE 6 : Monitoring & Alerting (Jour 8)

### Étape 6.1 : Dashboards Cloud Monitoring

**Dashboard Custom à créer dans Console GCP** :

Widgets à ajouter :
- Request Count (Backend + Frontend)
- Latency P50, P95, P99
- Error Rate 4xx, 5xx
- Container CPU Usage
- Container Memory Usage
- Cloud SQL Connections
- Redis Hit Rate

### Étape 6.2 : Alertes Configurées

Via Terraform (déjà dans module monitoring) :
- ✅ Erreurs 5xx > 5%
- ✅ Latence P95 > 2 secondes
- ✅ Uptime check backend failed
- ✅ Cloud SQL CPU > 80%
- ✅ Redis Memory > 90%

### Étape 6.3 : Logs Structurés

Vérifier que les logs backend sont bien structurés (JSON) :

```json
{
  "timestamp": "2025-12-13T14:30:00Z",
  "severity": "INFO",
  "service": "mimo-backend-prod",
  "user_id": "uuid-xxx",
  "method": "POST",
  "path": "/api/v1/transactions",
  "status": 201,
  "duration_ms": 45
}
```

---

## 🔄 PHASE 7 : CI/CD Automatique (Jour 9)

### Étape 7.1 : Tester le Workflow

```bash
# 1. Merger develop → staging
git checkout develop
git pull origin develop

git checkout staging
git merge develop --no-ff -m "chore: deploy v1.0.0 to production"

git push origin staging

# 2. Suivre déploiement dans GitHub Actions
# → https://github.com/Linerror99/Mimo-core/actions

# 3. Vérifier logs déploiement
gcloud logging read "resource.type=cloud_run_revision" \
  --limit 100 \
  --format json
```

### Étape 7.2 : Rollback en Cas d'Échec

```bash
# Lister révisions
gcloud run revisions list \
  --service=mimo-backend-prod \
  --region=europe-west1

# Rollback vers révision précédente
gcloud run services update-traffic mimo-backend-prod \
  --region=europe-west1 \
  --to-revisions=mimo-backend-prod-00002-xxx=100
```

---

## 📝 PHASE 8 : Documentation & Release (Jour 10)

### Étape 8.1 : Créer Release Notes

**Merger staging → main manuellement** :

```bash
git checkout main
git merge staging --no-ff -m "Release v1.0.0 - Production Deployment"

# Créer tag
git tag -a v1.0.0 -m "Release v1.0.0 - First Production Deployment"
git push origin main --tags
```

### Étape 8.2 : Créer GitHub Release

Dans GitHub :
- Releases > New Release
- Tag: v1.0.0
- Title: "Mimo Finance v1.0.0 - Production Release"
- Description: Changelog complet

### Étape 8.3 : Documentation Finale

Créer `docs/PRODUCTION.md` avec :
- URLs production (backend + frontend)
- Commandes de monitoring
- Procédure rollback
- Contacts et accès GCP

---

## 📋 Checklist Finale

### Infrastructure
- [ ] Projet GCP créé
- [ ] 12 modules Terraform déployés
- [ ] Cloud SQL db-f1-micro opérationnel
- [ ] Redis 1GB connecté
- [ ] Cloud Storage buckets créés
- [ ] Cloud Scheduler jobs configurés (06h validation, dimanche 02h backup)
- [ ] Workload Identity configuré

### Application
- [ ] Backend déployé sur Cloud Run
- [ ] Frontend déployé sur Cloud Run
- [ ] CORS configuré avec URL frontend
- [ ] JWT expiration réduite (15min access, 7j refresh)
- [ ] Tous secrets dans Secret Manager
- [ ] Migrations DB exécutées

### CI/CD
- [ ] Workflow `.github/workflows/deploy-production.yml` créé
- [ ] Tests automatiques (coverage > 75%)
- [ ] Build + Push Artifact Registry automatique
- [ ] Déploiement automatique sur merge staging
- [ ] Smoke tests post-déploiement

### Monitoring
- [ ] Uptime checks configurés
- [ ] Alertes erreurs 5xx
- [ ] Alertes latence > 2s
- [ ] Dashboard Cloud Monitoring
- [ ] Logs structurés JSON
- [ ] Email alerting configuré

### Sécurité
- [ ] Pas d'IP publiques (sauf Load Balancer)
- [ ] Secrets jamais en clair
- [ ] HTTPS partout
- [ ] Firewall rules configurées
- [ ] Backups automatiques (hebdomadaire)

---

## 💰 Estimation Coûts Mensuels

| Service | Configuration | Coût Mensuel |
|---------|--------------|--------------|
| Cloud Run Backend | 0 min instances, scale to zero | ~5-10€ |
| Cloud Run Frontend | 0 min instances, scale to zero | ~2-5€ |
| Cloud SQL (db-f1-micro) | PostgreSQL 15, 0.6GB RAM | ~7€ |
| Cloud Memorystore | Redis 1GB BASIC | ~25€ |
| Cloud Storage | 10GB uploads + backups | ~0.50€ |
| Cloud Scheduler | 2 jobs (validation + backup) | Gratuit (3 jobs inclus) |
| Artifact Registry | <10GB images | ~0.20€ |
| Cloud Monitoring | Logs + métriques | ~5€ |
| **TOTAL ESTIMÉ** | | **~45-50€/mois** |

*Coûts variables selon trafic. Cloud Run facturé à l'utilisation (scale to zero = gratuit au repos)*

---

## 🚀 Prochaines Étapes Après Déploiement

1. **Tester manuellement** toutes les fonctionnalités
2. **Monitorer** pendant 48h (alertes, latence, erreurs)
3. **Optimiser** si besoin (cache, index DB)
4. **Documenter** URLs et procédures pour équipe
5. **Communiquer** release (LinkedIn, portfolio)

---

## 📞 Support & Contact

**Projet GCP :** `mimo-finance-prod`  
**Region :** `europe-west1` (Belgique)  
**Repository :** https://github.com/Linerror99/Mimo-core  
**Documentation :** `/docs`

**Commandes utiles :**

```bash
# Voir logs backend
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=mimo-backend-prod"

# Voir métriques
gcloud monitoring dashboards list

# Status services
gcloud run services list --region=europe-west1

# Cloud SQL status
gcloud sql instances describe mimo-db-prod
```

---

**🎉 Prêt pour le déploiement !**

Valide ce plan et on commence par la Phase 1 (Setup GCP + génération secrets) ! 🚀
