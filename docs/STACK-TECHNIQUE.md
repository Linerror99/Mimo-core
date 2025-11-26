# DuoFlow Finance - Stack Technique Complète

## 📋 Table des Matières

1. [Architecture GCP](#architecture-gcp)
2. [Stack Technique Détaillée](#stack-technique-détaillée)
3. [Infrastructure (Terraform)](#infrastructure-terraform)
4. [CI/CD (GitHub Actions)](#cicd-github-actions)
5. [Coûts Estimés](#coûts-estimés)

---

## 🏗️ Architecture GCP

### **Vue d'ensemble**

```
┌─────────────────────────────────────────────────────────────┐
│                      UTILISATEUR                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│          GOOGLE CLOUD PLATFORM                              │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloud Run (Frontend)                                 │  │
│  │  https://frontend-xxx.run.app                         │  │
│  │                                                        │  │
│  │  Next.js 15 SSR                                       │  │
│  │  Port: 3000                                           │  │
│  │  Min instances: 1                                     │  │
│  └──────────────┬────────────────────────────────────────┘  │
│                 │ API Calls (HTTPS)                          │
│                 ↓                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloud Run (Backend API)                              │  │
│  │  https://backend-xxx.run. app                          │  │
│  │                                                        │  │
│  │  FastAPI + Python 3.12                                │  │
│  │  Port: 8000                                           │  │
│  │  Min instances: 1                                     │  │
│  └──────────────┬────────────────────────────────────────┘  │
│                 │                                            │
│                 ├─────┬──────┬──────────┬──────────────┐    │
│                 ↓     ↓      ↓          ↓              ↓    │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
│  │Cloud SQL │ │Artifact│ │Memorystore│ │  Secret  │ │ GCS ││
│  │          │ │Registry│ │  Redis   │ │  Manager │ │     ││
│  │PostgreSQL│ │        │ │          │ │          │ │Avatars││
│  │15        │ │Docker  │ │1GB Basic │ │- DB URL  │ │PDFs ││
│  │          │ │images  │ │          │ │- JWT     │ │Tickets││
│  │Private IP│ │        │ │Private IP│ │- Secrets │ │     ││
│  └──────────┘ └────────┘ └──────────┘ └──────────┘ └─────┘│
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloud Scheduler                                      │  │
│  │  Cron: "0 6 * * *" (06:00 Europe/Paris)               │  │
│  │  → POST backend-xxx.run.app/api/v1/jobs/daily        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  VPC Network                                          │  │
│  │  - Serverless VPC Connector (e2-micro)                │  │
│  │  - Cloud SQL Private IP                               │  │
│  │  - Redis Private IP                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloud Logging + Cloud Monitoring                     │  │
│  │  - Logs centralisés (frontend + backend)              │  │
│  │  - Métriques (CPU, RAM, latence, erreurs)            │  │
│  │  - Alertes (email/Slack si erreurs)                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Stack Technique Détaillée

### **Frontend**

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **Framework** | Next.js 15 (App Router) | - SSR/SSG pour performances<br>- App Router moderne (React Server Components)<br>- Image optimization native<br>- Déploiement Cloud Run simple |
| **Langage** | TypeScript | - Type safety → moins de bugs<br>- IntelliSense meilleur<br>- Refactoring sûr |
| **Styling** | Tailwind CSS + Shadcn/ui | - Développement rapide<br>- Composants headless customizables<br>- Pas de vendor lock-in<br>- Design system cohérent |
| **State Management** | Zustand | - Léger (3kb)<br>- API simple<br>- Pas de boilerplate Redux<br>- DevTools intégrés |
| **Data Fetching** | TanStack Query (React Query) | - Cache automatique intelligent<br>- Optimistic updates<br>- Refetch automatique<br>- Gestion erreurs/retry |
| **Forms** | React Hook Form + Zod | - Performances (pas de re-renders)<br>- Validation type-safe<br>- Schemas réutilisables backend/frontend |
| **Charts** | Recharts | - React-native<br>- Composable<br>- Responsive<br>- Bonne documentation |
| **Animations** | Framer Motion | - Animations fluides<br>- API déclarative<br>- Transitions page élégantes |
| **Hébergement** | GCP Cloud Run | - Serverless (scale automatique)<br>- Pas de gestion serveur<br>- Intégration GCP native |

---

### **Backend**

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **Framework** | FastAPI | - Performant (async natif, ASGI)<br>- Type hints Pydantic<br>- Auto-documentation Swagger/ReDoc<br>- Moderne et pythonic<br>- Excellent écosystème |
| **Langage** | Python 3. 12 | - Version LTS récente<br>- Performances améliorées<br>- Type hints améliorés<br>- Écosystème mature |
| **ORM** | SQLAlchemy 2.0 | - ORM mature et puissant<br>- Support async complet<br>- Type hints intégrés<br>- Relations complexes faciles<br>- Migrations avec Alembic |
| **Migrations** | Alembic | - Standard avec SQLAlchemy<br>- Migrations versionnées<br>- Rollback facile<br>- Auto-génération |
| **Validation** | Pydantic V2 | - Validation type-safe<br>- Sérialisation automatique<br>- 5-50x plus rapide que V1<br>- Schemas partagés frontend/backend |
| **Auth** | JWT (python-jose) | - Stateless (scalable)<br>- Standard industrie<br>- Refresh tokens supportés |
| **Password** | passlib + bcrypt | - Hashing sécurisé<br>- Résistant attaques brute-force<br>- Standard cryptographique |
| **ASGI Server** | Uvicorn | - Performant (uvloop)<br>- Async natif<br>- Production-ready<br>- Compatible Gunicorn |
| **Tests** | pytest + pytest-asyncio | - Standard Python<br>- Fixtures puissantes<br>- Support async<br>- Coverage intégré |
| **Linting** | Ruff + Black + mypy | - Ruff: ultra-rapide (Rust)<br>- Black: formatage auto<br>- mypy: type checking strict |
| **Hébergement** | GCP Cloud Run | - Serverless<br>- Auto-scaling<br>- Intégration Secret Manager |

---

### **Base de Données**

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **SGBD** | PostgreSQL 15 | - ACID (critique pour finances)<br>- Fiable et mature<br>- JSON support (JSONB)<br>- Relations complexes<br>- Excellent pour analytics |
| **Hébergement** | GCP Cloud SQL | - Managé (backups auto)<br>- High Availability<br>- Point-in-time recovery<br>- Monitoring intégré<br>- Scalable |
| **Configuration** | Private IP (via VPC) | - Plus sécurisé<br>- Pas d'exposition internet<br>- Latence réduite |
| **Tier** | db-f1-micro (dev)<br>db-custom-2-4096 (prod) | - f1-micro: économique pour tests<br>- custom-2-4096: production (2vCPU, 4GB) |

---

### **Cache & Sessions**

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **Cache** | Redis (Memorystore) | - Cache ultra-rapide (in-memory)<br>- Sessions JWT (refresh tokens)<br>- Blacklist tokens (logout)<br>- Cache requêtes DB fréquentes<br>- TTL automatique |
| **Hébergement** | GCP Memorystore | - Managé (pas de maintenance)<br>- High Availability<br>- Private IP (sécurisé)<br>- Monitoring intégré |
| **Tier** | Basic 1GB | - Suffisant pour V1<br>- Upgradable facilement |

**Pourquoi Redis est nécessaire :**
1. **Sessions JWT** : Stocker refresh tokens (7j durée) pour permettre logout réel
2. **Blacklist tokens** : Invalider tokens après logout/changement password
3. **Cache DB** : 
   - Liste catégories (rarement modifiée, très sollicitée)
   - Soldes comptes (cache 5min, recalculé si transaction)
   - Dashboard metrics (cache 1min)
4. **Rate limiting** : Limiter tentatives login (anti brute-force)

---

### **Stockage Fichiers**

| Type | Service | Bucket | Justification |
|------|---------|--------|---------------|
| **Photos profil** | GCS | `duoflow-avatars` | - Stockage objet scalable<br>- CDN intégré<br>- Signed URLs (sécurité)<br>- Lifecycle: conserver indéfiniment |
| **Exports PDF** | GCS | `duoflow-exports` | - Génération à la demande<br>- Lifecycle: auto-delete après 90j<br>- Signed URLs expire 24h |
| **Tickets/Reçus** | GCS | `duoflow-receipts` | - Archive long terme<br>- Lifecycle: NEARLINE après 1 an<br>- Moins cher que STANDARD |

---

### **Infrastructure**

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **IaC** | Terraform | - Standard industrie<br>- Déclaratif<br>- State management (GCS)<br>- Modules réutilisables<br>- Preview changes (plan) |
| **Container Registry** | Artifact Registry | - Intégré GCP<br>- Vulnerability scanning<br>- IAM natif<br>- Multi-région |
| **Secrets** | Secret Manager | - Chiffré au repos<br>- Versioning<br>- Audit logs<br>- Rotation facilitée<br>- Injection Cloud Run native |
| **Scheduler** | Cloud Scheduler | - Cron managé<br>- Retry automatique<br>- Auth OIDC<br>- Monitoring intégré<br>- Gratuit |
| **Monitoring** | Cloud Logging + Monitoring | - Logs centralisés<br>- Métriques temps réel<br>- Alerting<br>- Dashboards<br>- Intégration native |

---

### **CI/CD**

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **Pipeline** | GitHub Actions | - Intégré GitHub<br>- Gratuit (2000min/mois)<br>- Workflows YAML<br>- Marketplace actions<br>- Matrix builds |
| **Quality** | SonarCloud | - Analyse statique<br>- Détection bugs/smells<br>- Coverage tracking<br>- Quality gates<br>- Gratuit open source |
| **Tests** | pytest (backend)<br>Jest (frontend) | - Standards écosystème<br>- Coverage reporting<br>- CI-friendly<br>- Fast |
| **Auth GCP** | Workload Identity Federation | - Pas de clés JSON<br>- Plus sécurisé<br>- Rotation auto<br>- Best practice Google |

---

## 🗂️ Infrastructure (Terraform)

### **Structure Terraform**

```
terraform/
├── main.tf                          # Root module (appelle tous les modules)
├── variables. tf                     # Variables globales
├── terraform.tfvars                 # Values (pas commité, . gitignore)
├── backend.tf                       # State backend (GCS)
├── provider.tf                      # GCP provider config
├── versions.tf                      # Terraform version constraints
│
├── modules/
│   ├── vpc/                         # VPC + Serverless VPC Connector
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── cloud-run-frontend/          # Service Cloud Run Next.js
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── cloud-run-backend/           # Service Cloud Run FastAPI
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs. tf
│   │
│   ├── cloud-sql/                   # PostgreSQL managé
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs. tf
│   │
│   ├── artifact-registry/           # Container registry
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── memorystore/                 # Redis managé
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs. tf
│   │
│   ├── cloud-storage/               # Buckets GCS (avatars, pdfs, receipts)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── cloud-scheduler/             # Job quotidien cron
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs. tf
│   │
│   ├── secret-manager/              # Secrets (DB, JWT, etc.)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── iam/                         # Service Accounts + roles
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   └── monitoring/                  # Logging, alerting, dashboards
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
└── README.md
```

### **Modules Terraform Principaux**

#### **Module VPC**
- VPC Network
- Subnet pour VPC Connector (/28 = 16 IPs)
- Serverless VPC Connector (e2-micro, 2-3 instances)
- Firewall rules (Cloud Run → Cloud SQL, Cloud Run → Redis)

#### **Module Cloud Run (Frontend)**
- Service Cloud Run
- Image: Artifact Registry (Next.js)
- Resources: 1Gi RAM, 1 vCPU
- Min instances: 1, Max: 10
- Env vars: `NEXT_PUBLIC_API_URL`
- Secrets: `NEXTAUTH_SECRET` (via Secret Manager)
- VPC Connector attaché
- IAM: allow public access (`allUsers`)

#### **Module Cloud Run (Backend)**
- Service Cloud Run
- Image: Artifact Registry (FastAPI)
- Resources: 2Gi RAM, 2 vCPU
- Min instances: 1, Max: 10
- Secrets: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- VPC Connector attaché
- IAM: allow public access
- Service Account avec permissions Storage, Secret Manager

#### **Module Cloud SQL**
- Instance PostgreSQL 15
- Tier: db-custom-2-4096 (2 vCPU, 4GB RAM)
- Private IP (VPC)
- Backups automatiques (daily, 7 jours retention)
- Point-in-time recovery activé
- Maintenance window: dimanche 3-4am
- Database: `duoflow`
- User: généré avec password dans Secret Manager

#### **Module Memorystore Redis**
- Instance Redis 7
- Tier: Basic, 1GB
- Private IP (VPC)
- Auth activé (password dans Secret Manager)
- Maintenance window: dimanche 4-5am

#### **Module Cloud Storage**
- 3 buckets:
  - `duoflow-avatars`: STANDARD, pas de lifecycle
  - `duoflow-exports`: STANDARD, delete après 90j
  - `duoflow-receipts`: STANDARD → NEARLINE après 1 an
- Uniform bucket-level access
- CORS configuré (allow frontend URL)
- IAM: backend service account = `storage. objectAdmin`

#### **Module Cloud Scheduler**
- Job: `duoflow-daily-maintenance`
- Schedule: `0 6 * * *` (06:00)
- Timezone: `Europe/Paris`
- Target: HTTP POST → Backend Cloud Run URL
- Auth: OIDC avec service account
- Retry config: max 3 retries, backoff

#### **Module Secret Manager**
- Secrets créés:
  - `DATABASE_URL` (connection string Cloud SQL)
  - `REDIS_URL` (connection string Redis)
  - `JWT_SECRET` (généré aléatoirement)
  - `NEXTAUTH_SECRET` (généré aléatoirement)
  - `SCHEDULER_SECRET_TOKEN` (pour sécuriser endpoint job)
- Versioning activé
- IAM: service accounts ont accès (`secretAccessor`)

#### **Module IAM**
- Service Account Backend:
  - `roles/cloudsql.client`
  - `roles/secretmanager.secretAccessor`
  - `roles/storage.objectAdmin`
  - `roles/logging.logWriter`
- Service Account Frontend:
  - `roles/secretmanager.secretAccessor`
  - `roles/logging.logWriter`
- Service Account Scheduler:
  - `roles/run.invoker` (sur service backend)

#### **Module Monitoring**
- Log sinks (BigQuery pour analytics long-terme)
- Alerting policies:
  - Erreurs 5xx > 10 en 5min → Email
  - Latence P95 > 1s → Email
  - Cloud Run crash → Email + Slack
  - Database connections > 80% → Email
- Dashboards:
  - Dashboard Services (Cloud Run metrics)
  - Dashboard Database (Cloud SQL metrics)
  - Dashboard Redis (Memorystore metrics)

---

## 🔄 CI/CD (GitHub Actions)

### **Flux CI/CD Frontend**

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER                                                    │
│  • Push sur main                                            │
│  • Pull Request sur duoflow-frontend/**                     │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 1: LINT & TEST                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. Checkout code                                       │ │
│  │ 2. Setup Node.js 20 (avec cache npm)                   │ │
│  │ 3. npm ci (install dependencies)                       │ │
│  │ 4.  npm run lint (ESLint)                               │ │
│  │ 5. npm run type-check (TypeScript tsc)                 │ │
│  │ 6. npm run test (Jest + coverage)                      │ │
│  │ 7. npm run build (Next.js build)                       │ │
│  │ 8. Upload coverage to Codecov                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ✅ Success → Continue                                      │
│  ❌ Failure → Stop pipeline, notify                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓ (si branch = main)
┌─────────────────────────────────────────────────────────────┐
│  JOB 2: BUILD & PUSH                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1.  Authenticate GCP (Workload Identity Federation)     │ │
│  │ 2. Configure Docker (gcloud auth configure-docker)     │ │
│  │ 3. docker build:                                       │ │
│  │    - Multi-stage (deps → builder → runner)            │ │
│  │    - Build arg: NEXT_PUBLIC_API_URL                   │ │
│  │    - Tag: frontend:${GITHUB_SHA}                      │ │
│  │    - Tag: frontend:latest                             │ │
│  │ 4. docker push → Artifact Registry                     │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 3: DEPLOY                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. gcloud run deploy duoflow-frontend:                 │ │
│  │    - Image: frontend:${GITHUB_SHA}                     │ │
│  │    - Region: europe-west1                              │ │
│  │    - Update env vars (NEXT_PUBLIC_API_URL)            │ │
│  │    - Update secrets (NEXTAUTH_SECRET)                  │ │
│  │    - Min instances: 1                                  │ │
│  │    - Memory: 1Gi, CPU: 1                               │ │
│  │ 2. Wait for deployment                                 │ │
│  │ 3.  Get service URL                                     │ │
│  │ 4.  Smoke test: curl ${URL}/api/health                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ✅ Success → Notify Slack "Frontend deployed"             │
│  ❌ Failure → Rollback + Alert                             │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flux CI/CD Backend**

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER                                                    │
│  • Push sur main                                            │
│  • Pull Request sur duoflow-backend/**                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 1: LINT & TEST                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Services (Docker Compose):                             │ │
│  │ • postgres:15 (healthcheck, port 5432)                 │ │
│  │ • redis:7-alpine (healthcheck, port 6379)              │ │
│  │                                                         │ │
│  │ Steps:                                                  │ │
│  │ 1. Checkout code                                       │ │
│  │ 2. Setup Python 3.12 (avec cache pip)                  │ │
│  │ 3.  pip install -r requirements.txt                     │ │
│  │ 4. pip install -r requirements-dev.txt                 │ │
│  │ 5. ruff check .  (linting ultra-rapide)                 │ │
│  │ 6. black --check .  (format check)                      │ │
│  │ 7. mypy app/ (type checking)                           │ │
│  │ 8. alembic upgrade head (test migrations)              │ │
│  │ 9. pytest tests/ --cov=app --cov-report=xml            │ │
│  │ 10. Upload coverage to Codecov                         │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 2: SONARCLOUD                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1.  Checkout (fetch-depth: 0 pour historique)          │ │
│  │ 2. SonarCloud Scan:                                    │ │
│  │    - Analyse statique Python                           │ │
│  │    - Coverage report (coverage.xml)                    │ │
│  │    - Security vulnerabilities                          │ │
│  │    - Code smells                                       │ │
│  │    - Duplications                                      │ │
│  │ 3. Quality Gate check                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ✅ Quality Gate passed → Continue                          │
│  ❌ Quality Gate failed → Block merge (si PR)              │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓ (si branch = main)
┌─────────────────────────────────────────────────────────────┐
│  JOB 3: BUILD & PUSH                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. Authenticate GCP (Workload Identity)                │ │
│  │ 2. Configure Docker                                    │ │
│  │ 3. docker build:                                       │ │
│  │    - FROM python:3.12-slim                             │ │
│  │    - Install system deps (gcc, postgresql-client)      │ │
│  │    - pip install -r requirements.txt                   │ │
│  │    - Copy app code                                     │ │
│  │    - Non-root user (security)                          │ │
│  │    - Tag: backend:${GITHUB_SHA}                        │ │
│  │    - Tag: backend:latest                               │ │
│  │ 4. docker push → Artifact Registry                     │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 4: DEPLOY                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. gcloud run deploy duoflow-backend:                  │ │
│  │    - Image: backend:${GITHUB_SHA}                      │ │
│  │    - Region: europe-west1                              │ │
│  │    - Update secrets (DATABASE_URL, REDIS_URL, JWT)     │ │
│  │    - VPC Connector                                     │ │
│  │    - Min instances: 1                                  │ │
│  │    - Memory: 2Gi, CPU: 2                               │ │
│  │    - Concurrency: 80                                   │ │
│  │ 2. Wait for deployment                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 5: DATABASE MIGRATIONS                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. gcloud run jobs execute duoflow-migrations:         │ │
│  │    - Container: backend:${GITHUB_SHA}                  │ │
│  │    - CMD: ["alembic", "upgrade", "head"]               │ │
│  │    - Env: DATABASE_URL (via Secret Manager)            │ │
│  │    - Wait for completion                               │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 6: SMOKE TEST                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. Get service URL                                     │ │
│  │ 2.  curl ${URL}/health (assert 200)                     │ │
│  │ 3. curl ${URL}/docs (Swagger accessible)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ✅ Success → Notify Slack "Backend deployed"              │
│  ❌ Failure → Rollback + Alert                             │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flux CI/CD Terraform**

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER                                                    │
│  • Manual (workflow_dispatch)                               │
│  • OU Push sur terraform/** (avec approval required)        │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│  JOB 1: TERRAFORM PLAN                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. Checkout code                                       │ │
│  │ 2. Setup Terraform CLI (latest)                        │ │
│  │ 3.  Authenticate GCP (Workload Identity)                │ │
│  │ 4. terraform init (backend: GCS bucket)                │ │
│  │ 5. terraform validate                                  │ │
│  │ 6. terraform fmt -check                                │ │
│  │ 7. terraform plan -out=tfplan                          │ │
│  │ 8. Upload plan artifact                                │ │
│  │ 9. Comment plan summary on PR (si PR)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓ (manual approval required)
┌─────────────────────────────────────────────────────────────┐
│  JOB 2: TERRAFORM APPLY                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Steps:                                                 │ │
│  │ 1. Download plan artifact                              │ │
│  │ 2. terraform apply tfplan                              │ │
│  │ 3. terraform output -json > outputs.json               │ │
│  │ 4. Update GitHub Secrets (service URLs, etc.)          │ │
│  │ 5. Notify Slack "Infrastructure updated"               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Coûts Estimés

### **Coûts Mensuels GCP (Environnement unique)**

| Service | Configuration | Coût/mois |
|---------|--------------|-----------|
| **Cloud Run Frontend** | 1GB RAM, 1 vCPU<br>Min instances: 1<br>~100K requêtes | ~8-12€ |
| **Cloud Run Backend** | 2GB RAM, 2 vCPU<br>Min instances: 1<br>~100K requêtes | ~15-20€ |
| **Cloud SQL** | db-custom-2-4096<br>(2 vCPU, 4GB RAM)<br>Backups activés | ~80€ |
| **Memorystore Redis** | Basic tier, 1GB | ~30€ |
| **Cloud Storage (GCS)** | 20GB stockage<br>(avatars + PDFs + receipts)<br>~10GB egress | ~1-2€ |
| **Artifact Registry** | Stockage images Docker<br>(~5GB) | ~0.50€ |
| **VPC Connector** | e2-micro, 2-3 instances<br>Always-on | ~15€ |
| **Cloud Scheduler** | 1 job (daily) | Gratuit |
| **Secret Manager** | ~10 secrets<br>Versions multiples | ~0.10€ |
| **Logging & Monitoring** | 10GB logs/mois<br>Métriques standard | ~5€ |
| **Egress (réseau sortant)** | ~10GB/mois | ~1€ |

**TOTAL : ~155-165€/mois**

---

### **Optimisations Possibles**

| Optimisation | Économie | Impact |
|--------------|----------|--------|
| Min instances: 0 (Cloud Run) | -10€ | Cold starts (2-3s) |
| Cloud SQL: db-f1-micro | -65€ | Performances réduites (OK pour tests) |
| VPC Public IP (pas de Connector) | -15€ | Moins sécurisé (OK si Cloud SQL Public IP + SSL) |
| Redis: tier BASIC → shared | -15€ | Pas de HA (OK pour V1) |

**Total optimisé (dev/test) : ~50-70€/mois**

---

### **Comparaison Alternatives**

| Stack | Coût/mois | Avantages | Inconvénients |
|-------|-----------|-----------|---------------|
| **GCP Full (actuel)** | ~160€ | - Tout managé<br>- Scalable<br>- Monitoring intégré | - Plus cher |
| **Railway** | ~50€ | - Plus simple<br>- Redis inclus<br>- Moins de config | - Moins de contrôle<br>- Scalabilité limitée |
| **Vercel + Supabase + Upstash** | ~30€ | - Économique<br>- Serverless complet | - Vendor lock-in<br>- Moins flexible |
| **VPS (Hetzner)** | ~15€ | - Très économique | - Tout à gérer soi-même<br>- Pas scalable |

**Recommandation : GCP Full** pour apprentissage professionnel + scalabilité future. 

---

## ✅ Validation Stack

**Stack complète validée :**

✅ Frontend : Next.js 15 + TypeScript + Tailwind → Cloud Run  
✅ Backend : FastAPI + Python 3.12 + SQLAlchemy → Cloud Run  
✅ Database : PostgreSQL 15 → Cloud SQL (Private IP)  
✅ Cache : Redis → Memorystore  
✅ Storage : GCS (3 buckets : avatars, pdfs, receipts)  
✅ Infrastructure : Terraform complet (12 modules)  
✅ CI/CD : GitHub Actions (lint, test, build, deploy)  
✅ Quality : SonarCloud  
✅ Monitoring : Cloud Logging + Monitoring + Alertes  

**URLs d'accès (après déploiement) :**
- Frontend : `https://duoflow-frontend-xxx.run.app`
- Backend API : `https://duoflow-backend-xxx.run.app`
- Swagger Docs : `https://duoflow-backend-xxx.run.app/docs`

**Prochaine étape : Sprint Planning Détaillé** 🚀