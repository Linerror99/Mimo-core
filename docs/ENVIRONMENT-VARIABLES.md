# Configuration des Variables d'Environnement - Production GCP

## 🔐 Priorité des Variables

**Pydantic Settings suit cet ordre de priorité (du plus élevé au plus bas) :**

1. ✅ **Variables d'environnement** (ce que Terraform injecte dans Cloud Run)
2. Fichier `.env` (non utilisé en production)
3. Valeurs par défaut dans `config.py` (fallback uniquement)

**Résultat** : Les valeurs hardcodées dans `config.py` sont AUTOMATIQUEMENT écrasées par les variables d'environnement injectées par Terraform. ✅

---

## 📋 Variables Injectées par Terraform

### 🔹 **Application**
```bash
ENVIRONMENT=production
```

### 🔹 **Base de Données**
```bash
DATABASE_URL=postgresql+asyncpg://mimo_user:{password}@{private_ip}:5432/mimo_db
DATABASE_CONNECTION_NAME=mimo-finance-prod:europe-west1:mimo-db-{random}
DATABASE_NAME=mimo_db
DATABASE_USER=mimo_user
```
- `DATABASE_URL` : Connexion directe via IP privée (VPC)
- `DATABASE_CONNECTION_NAME` : Pour pg_dump via Cloud SQL Proxy
- Password récupéré depuis Secret Manager

### 🔹 **Redis**
```bash
REDIS_URL=redis://{private_ip}:6379/0
```
- Connexion via IP privée dans le VPC

### 🔹 **JWT (depuis Secret Manager)**
```bash
JWT_SECRET_KEY={64-char-secret}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```
- `JWT_SECRET_KEY` : Récupéré automatiquement depuis Secret Manager
- Expiration réduite pour la sécurité production

### 🔹 **CORS**
```bash
CORS_ORIGINS={frontend-url}
```
- Mis à jour automatiquement par le workflow CI/CD après déploiement frontend
- Parser dans `config.py` : accepte string comma-separated ou liste

### 🔹 **Google Cloud Storage**
```bash
GCS_BUCKET_UPLOADS=mimo-uploads-prod
GCS_BUCKET_BACKUPS=mimo-backups-prod
```

### 🔹 **Admin (depuis Secret Manager)**
```bash
ADMIN_TOKEN={hex-token}
```
- Utilisé pour sécuriser l'endpoint `/api/v1/admin/migrate`

---

## 🔄 Comment ça marche ?

### 1️⃣ **Terraform crée les secrets**
```bash
# Dans scripts/setup-gcp-project.sh
gcloud secrets create jwt-secret --data-file=<(openssl rand -base64 64)
gcloud secrets create admin-token --data-file=<(openssl rand -hex 32)
gcloud secrets create db-password --data-file=<(echo -n "{password}" | base64)
```

### 2️⃣ **Terraform donne les permissions**
```hcl
# Service Account Cloud Run
resource "google_project_iam_member" "cloud_run_secret_accessor" {
  role   = "roles/secretmanager.secretAccessor"
  member = "serviceAccount:cloud-run-sa@mimo-finance-prod.iam.gserviceaccount.com"
}
```

### 3️⃣ **Terraform injecte dans Cloud Run**
```hcl
env {
  name = "JWT_SECRET_KEY"
  value_source {
    secret_key_ref {
      secret  = "jwt-secret"
      version = "latest"
    }
  }
}

env {
  name  = "DATABASE_URL"
  value = "postgresql+asyncpg://mimo_user:${secret}@${ip}:5432/mimo_db"
}
```

### 4️⃣ **Pydantic Settings charge les valeurs**
```python
# backend/app/config.py
class Settings(BaseSettings):
    JWT_SECRET_KEY: str = "default-only-for-dev"  # ❌ Écrasé en prod
    DATABASE_URL: str = "postgresql://..."        # ❌ Écrasé en prod
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
```

✅ **En production** : Les env vars de Terraform ont priorité absolue  
✅ **En développement** : Les valeurs par défaut sont utilisées

---

## 🤖 Cloud Scheduler → Backend

### Configuration dans Terraform

```hcl
resource "google_cloud_scheduler_job" "auto_validation" {
  schedule = "0 6 * * *"  # Daily 06h UTC
  
  http_target {
    http_method = "POST"
    uri         = "${backend_url}/api/v1/scheduled/validation"
    
    oidc_token {
      service_account_email = "scheduler-sa@mimo-finance-prod.iam.gserviceaccount.com"
    }
  }
}

# IAM: Scheduler peut invoquer Cloud Run
resource "google_cloud_run_v2_service_iam_member" "scheduler_backend_invoker" {
  role   = "roles/run.invoker"
  member = "serviceAccount:scheduler-sa@mimo-finance-prod.iam.gserviceaccount.com"
}
```

### ✅ Comment ça marche ?

1. **Cloud Scheduler génère un OIDC token** signé par `scheduler-sa@mimo-finance-prod.iam.gserviceaccount.com`
2. **Envoie la requête** avec `Authorization: Bearer {oidc_token}`
3. **Cloud Run valide automatiquement** le token OIDC (pas de code nécessaire côté backend !)
4. **Endpoint backend reçoit la requête** authentifiée

### Backend : Validation OIDC

```python
# backend/app/api/v1/scheduled/backup.py
def verify_cloud_scheduler(authorization: str = Header(None)):
    """Cloud Run valide automatiquement les OIDC tokens de Cloud Scheduler"""
    if os.getenv("ENVIRONMENT") != "production":
        return  # Skip en dev
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth")
    
    # En production, si on arrive ici, le token est déjà validé par Cloud Run ✅
```

**Important** : Google Cloud Run valide les OIDC tokens automatiquement. Si la requête atteint le backend, c'est que l'authentification a réussi ! 🎯

---

## 🔍 Vérification

### Vérifier les variables dans Cloud Run
```bash
gcloud run services describe mimo-backend \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Tester les secrets
```bash
# JWT Secret
gcloud secrets versions access latest --secret=jwt-secret

# Admin Token
gcloud secrets versions access latest --secret=admin-token

# DB Password
gcloud secrets versions access latest --secret=db-password
```

### Tester l'endpoint admin
```bash
ADMIN_TOKEN=$(gcloud secrets versions access latest --secret=admin-token)
BACKEND_URL=$(gcloud run services describe mimo-backend --region=europe-west1 --format='value(status.url)')

curl -X POST "$BACKEND_URL/api/v1/admin/migrate" \
  -H "X-Admin-Token: $ADMIN_TOKEN"
```

### Tester que scheduler peut appeler backend
```bash
# Force run du job (sans attendre le cron)
gcloud scheduler jobs run auto-validation --location=europe-west1

# Voir les logs
gcloud run services logs read mimo-backend --region=europe-west1 --limit=20
```

---

## 🎯 Résumé

| Variable | Source | Comment |
|----------|--------|---------|
| `JWT_SECRET_KEY` | Secret Manager | ✅ Auto-injecté par Terraform |
| `ADMIN_TOKEN` | Secret Manager | ✅ Auto-injecté par Terraform |
| `DATABASE_URL` | Construit par Terraform | ✅ Avec password depuis Secret Manager |
| `REDIS_URL` | Construit par Terraform | ✅ IP privée VPC |
| `CORS_ORIGINS` | Mis à jour par CI/CD | ✅ Après déploiement frontend |
| `GCS_BUCKET_*` | Terraform | ✅ Noms des buckets créés |
| `DATABASE_CONNECTION_NAME` | Terraform | ✅ Pour pg_dump |

**Conclusion** : Aucun secret hardcodé, tout vient de Secret Manager ou est généré par Terraform. Les valeurs par défaut dans `config.py` ne servent QUE pour le développement local. ✅✅✅
