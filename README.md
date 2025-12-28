<p align="center">
  <img src="https://img.icons8.com/fluency/96/money-bag.png" alt="Mimo Finance Logo" width="96" />
</p>

<h1 align="center">💰 Mimo Finance</h1>

<p align="center">
  <strong>Application moderne de gestion financière collaborative pour individus et couples</strong>
</p>

<p align="center">
  <a href="https://github.com/Linerror99/Mimo-core/actions/workflows/ci.yml">
    <img src="https://github.com/Linerror99/Mimo-core/actions/workflows/ci.yml/badge.svg" alt="CI Pipeline" />
  </a>
  <a href="https://github.com/Linerror99/Mimo-core/actions/workflows/deploy-production.yml">
    <img src="https://github.com/Linerror99/Mimo-core/actions/workflows/deploy-production.yml/badge.svg" alt="Deploy Production" />
  </a>
  <a href="https://sonarcloud.io/summary/new_code?id=Linerror99_Mimo-core">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=Linerror99_Mimo-core&metric=alert_status" alt="Quality Gate Status" />
  </a>
  <a href="https://sonarcloud.io/summary/new_code?id=Linerror99_Mimo-core">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=Linerror99_Mimo-core&metric=coverage" alt="Coverage" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/GCP-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white" alt="GCP Cloud Run" />
  <img src="https://img.shields.io/badge/Terraform-7B42BC?logo=terraform&logoColor=white" alt="Terraform" />
</p>

<p align="center">
  <a href="#-démo-live"><strong>🌐 Démo Live</strong></a> •
  <a href="#-fonctionnalités"><strong>✨ Fonctionnalités</strong></a> •
  <a href="#️-architecture"><strong>🏗️ Architecture</strong></a> •
  <a href="#-infrastructure-gcp"><strong>☁️ Infrastructure GCP</strong></a> •
  <a href="#-installation-locale"><strong>🚀 Installation</strong></a>
</p>

---

## 🌐 Démo Live

<p align="center">
  <a href="https://mimo-frontend-301595415100.europe-west1.run.app">
    <img src="https://img.shields.io/badge/🚀_ACCÉDER_À_L'APPLICATION-Mimo_Finance-4285F4?style=for-the-badge&logoColor=white" alt="Demo Live" />
  </a>
</p>

| Environnement | URL |
|--------------|-----|
| **🖥️ Frontend** | https://mimo-frontend-301595415100.europe-west1.run.app |
| **🔌 Backend API** | https://mimo-backend-xpaldfrvjq-ew.a.run.app |
| **📚 API Docs (Swagger)** | https://mimo-backend-xpaldfrvjq-ew.a.run.app/docs |
| **❤️ Health Check** | https://mimo-backend-xpaldfrvjq-ew.a.run.app/health |

> 💡 **Créez un compte gratuit** pour tester toutes les fonctionnalités : gestion des comptes, transactions, projections 12 mois, mode couple, objectifs d'épargne...

---

## 🎯 À propos du projet

**Mimo Finance** remplace la gestion financière par Excel avec une **timeline unifiée** (passé → présent → futur). L'application permet de :

- 📊 **Visualiser** l'évolution de vos finances sur 12 mois
- 🔄 **Automatiser** les transactions récurrentes (loyer, salaire, abonnements)
- 👫 **Partager** vos finances en couple avec 3 portefeuilles tracés
- ⏰ **Valider** automatiquement les transactions du jour
- 🎯 **Atteindre** vos objectifs d'épargne

### Pourquoi Mimo ?

| ❌ Avant (Excel) | ✅ Avec Mimo |
|-----------------|-------------|
| Perte d'historique | Timeline continue illimitée |
| Pas de projections | Projections automatiques 12 mois |
| Gestion couple complexe | Mode couple avec fusion/dissolution |
| Transactions manuelles | Récurrences auto-générées |
| Pas de notifications | Alertes validation quotidienne |

---

## ✨ Fonctionnalités

<table>
<tr>
<td width="50%">

### 🔐 Authentification
- Inscription / Connexion sécurisée (JWT)
- Tokens refresh (7 jours)
- Blacklist Redis (déconnexion instantanée)
- Modification profil / mot de passe

### 💳 Gestion des Comptes
- 6 types : Courant, Épargne, Investissement, Prêt, Cash, Autre
- Solde dynamique calculé automatiquement
- Fermeture compte (soft delete avec historique)

### 💸 Transactions
- États : PROJETÉ → EN ATTENTE → RÉALISÉ → ANNULÉ
- Timeline mensuelle interactive
- Corbeille avec restauration (30 jours)
- Upload reçus PDF sur Cloud Storage

</td>
<td width="50%">

### 🔄 Récurrences
- Fréquences : Hebdo, Mensuel, Trimestriel, Annuel
- Génération automatique 12 mois à l'avance
- Modification/suppression groupée
- Badge "Récurrent" sur timeline

### 👥 Mode Couple
- Invitation par email (in-app ou nouveau user)
- Fusion automatique des foyers
- 3 portefeuilles : Mon / Partenaire / Commun
- Dissolution avec redistribution intelligente

### 📊 Analytics & Objectifs
- Dashboard avec KPIs temps réel
- Graphiques revenus/dépenses (Recharts)
- Projections balance sur 12 mois
- Objectifs épargne avec barre de progression

</td>
</tr>
</table>

### 🔔 Système de Notifications
- Validation quotidienne automatique (job Cloud Scheduler)
- Notifications in-app temps réel (polling 30s)
- Actions rapides : Valider, Reporter, Modifier, Supprimer

---

## 🏗️ Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UTILISATEURS                                │
│                    (Desktop / Mobile / Tablet)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE CLOUD PLATFORM                          │
│                        (europe-west1)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Cloud Run (Serverless)                     │   │
│  │  ┌─────────────────────┐      ┌─────────────────────┐       │   │
│  │  │      Frontend       │      │       Backend       │       │   │
│  │  │    React + Vite     │ ───► │      FastAPI        │       │   │
│  │  │   (auto-scale 0-10) │      │   (auto-scale 0-10) │       │   │
│  │  └─────────────────────┘      └──────────┬──────────┘       │   │
│  └──────────────────────────────────────────┼──────────────────┘   │
│                                             │                       │
│  ┌──────────────────────────────────────────┼──────────────────┐   │
│  │                    VPC Network (Private)                    │   │
│  │                                          │                  │   │
│  │            ┌─────────────────────────────┤                  │   │
│  │            │     VPC Connector           │                  │   │
│  │            │     (10.8.0.0/28)           │                  │   │
│  │            └─────────────────────────────┤                  │   │
│  │                     │                    │                  │   │
│  │        ┌────────────┴────────────┐       │                  │   │
│  │        ▼                         ▼       ▼                  │   │
│  │  ┌───────────────┐        ┌───────────────┐                 │   │
│  │  │   Cloud SQL   │        │    Redis      │                 │   │
│  │  │ PostgreSQL 15 │        │  Memorystore  │                 │   │
│  │  │ (10.165.0.3)  │        │(10.198.211.99)│                 │   │
│  │  └───────────────┘        └───────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Services Additionnels                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │Cloud Storage │  │Secret Manager│  │   Artifact   │       │   │
│  │  │ (Uploads/    │  │ (Credentials)│  │   Registry   │       │   │
│  │  │  Backups)    │  │              │  │(Docker imgs) │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui, Zustand, Recharts |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy 2.0 (async), Pydantic v2, Alembic |
| **Database** | PostgreSQL 15 (Cloud SQL), Redis 7 (Memorystore) |
| **Infrastructure** | Terraform, Cloud Run, VPC, Secret Manager, Cloud Scheduler |
| **CI/CD** | GitHub Actions, Workload Identity Federation, Artifact Registry |
| **Monitoring** | Cloud Monitoring, Uptime Checks, Alerting |
| **Qualité** | Pytest (111+ tests), Ruff, ESLint, Mypy, SonarCloud |

---

## ☁️ Infrastructure GCP

### Ressources déployées via Terraform (42+ ressources)

```
📦 Compute
├── Cloud Run (Frontend)     → mimo-frontend (auto-scaling 0-10)
├── Cloud Run (Backend)      → mimo-backend (auto-scaling 0-10)
└── VPC Connector            → mimo-vpc-connector (e2-micro, 2-3 instances)

💾 Data
├── Cloud SQL PostgreSQL 15  → mimo-db-7100c619 (db-f1-micro, 10GB SSD)
├── Redis Memorystore        → mimo-redis (1GB, BASIC tier)
└── Cloud Storage            → mimo-uploads-prod, mimo-backups-prod

🔒 Network
├── VPC Network              → mimo-vpc (custom mode)
├── Private Service Access   → 10.165.0.0/16 (Cloud SQL peering)
└── Firewall Rules           → allow-health-check, allow-redis

🔐 Security
├── Secret Manager           → db-password, jwt-secret, admin-token
├── Service Accounts (3)     → cloud-run-sa, github-actions-sa, scheduler-sa
└── IAM Bindings             → Principle of least privilege

🚀 CI/CD
├── Artifact Registry        → mimo-repo (Docker images)
├── Workload Identity Pool   → github-pool (OIDC, no JSON keys!)
└── GitHub Actions           → Build → Test → Deploy (auto on push main)

📊 Monitoring
├── Uptime Checks            → Backend health (every 5 min)
├── Alert Policies           → Email notification on downtime
└── Cloud Scheduler          → Daily validation job, Weekly backup
```

### Sécurité & Bonnes Pratiques

| Aspect | Implementation |
|--------|---------------|
| **🔐 Secrets** | Secret Manager (zéro credential en clair) |
| **🌐 Network** | VPC privé, Cloud SQL/Redis sans IP publique |
| **🔑 Auth CI/CD** | Workload Identity Federation (pas de clés JSON) |
| **🛡️ CORS** | Origins restreints aux frontends autorisés |
| **🎫 Tokens** | JWT signé HS256, refresh 7j, blacklist Redis |
| **📝 Audit** | Cloud Audit Logs activés |

### Coûts estimés (Free tier + pay-per-use)

| Ressource | Coût/mois |
|-----------|-----------|
| Cloud Run (2 services) | ~$5-15 |
| Cloud SQL (db-f1-micro) | ~$8 |
| Redis Memorystore (1GB) | ~$35 |
| Cloud Storage | ~$1-2 |
| Autres (DNS, monitoring) | ~$2-5 |
| **Total estimé** | **~$50-65/mois** |

---

## 🚀 Installation Locale

### Prérequis

- Docker Desktop 24.0+
- Git

### Quick Start

```bash
# 1. Cloner le projet
git clone https://github.com/Linerror99/Mimo-core.git
cd Mimo-core

# 2. Configurer l'environnement
cp .env.example .env

# 3. Démarrer l'application
docker compose up -d

# 4. Vérifier que tout fonctionne
docker compose ps
```

### URLs locales

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

### Commandes utiles

```bash
# Logs en temps réel
docker compose logs -f

# Logs backend uniquement
docker compose logs -f backend

# Rebuild après modifications
docker compose up -d --build

# Lancer les tests backend
docker compose exec backend pytest tests/ -v

# Reset base de données
docker compose exec backend alembic upgrade head

# Arrêter tous les services
docker compose down
```

---

## 📁 Structure du Projet

```
Mimo-core/
├── 📂 backend/                    # API FastAPI (Python)
│   ├── app/
│   │   ├── api/v1/               # Routes REST
│   │   │   ├── auth.py           # Authentification
│   │   │   ├── accounts.py       # Comptes bancaires
│   │   │   ├── transactions.py   # Transactions
│   │   │   ├── categories.py     # Catégories
│   │   │   ├── recurring.py      # Récurrences
│   │   │   ├── notifications.py  # Notifications
│   │   │   └── households.py     # Foyers (couple)
│   │   ├── models/               # Modèles SQLAlchemy
│   │   ├── services/             # Logique métier
│   │   ├── schemas/              # Validation Pydantic
│   │   └── config.py             # Configuration
│   ├── alembic/                  # Migrations DB (13 migrations)
│   └── tests/                    # Tests unitaires (111+ tests)
│
├── 📂 frontend/                   # App React (TypeScript)
│   ├── src/
│   │   ├── components/           # Composants UI réutilisables
│   │   ├── pages/                # Pages (Dashboard, Timeline, Settings...)
│   │   ├── services/             # Appels API (fetch)
│   │   ├── stores/               # State Zustand
│   │   └── types/                # Types TypeScript
│   └── public/                   # Assets statiques
│
├── 📂 terraform/                  # Infrastructure as Code
│   ├── main.tf                   # Ressources GCP (~800 lignes)
│   ├── variables.tf              # Variables
│   ├── outputs.tf                # Outputs
│   └── terraform.tfvars          # Valeurs (gitignored)
│
├── 📂 .github/workflows/          # CI/CD GitHub Actions
│   ├── ci.yml                    # Tests + Lint
│   └── deploy-production.yml     # Déploiement GCP
│
├── 📂 docs/                       # Documentation
│   ├── SPECIFICATIONS.md         # Spécifications fonctionnelles
│   ├── SPRINT-PLANNING.md        # Historique des 10 sprints
│   └── STACK-TECHNIQUE.md        # Stack technique détaillée
│
├── docker-compose.yml            # Orchestration locale
└── README.md                     # Ce fichier
```

---

## 🧪 Tests & Qualité

### Métriques

| Métrique | Valeur |
|----------|--------|
| **Tests unitaires** | 111+ (100% GREEN) |
| **Couverture** | 70%+ |
| **Migrations Alembic** | 13 |
| **Lignes de code** | ~20,000+ |

### Lancer les tests

```bash
# Backend (pytest)
docker compose exec backend pytest tests/ -v --cov=app

# Frontend (vitest)
cd frontend && npm run test

# Linting
docker compose exec backend ruff check app/
cd frontend && npm run lint
```

---

## 📊 Métriques du Projet

| Métrique | Valeur |
|----------|--------|
| **Sprints complétés** | 10 |
| **Durée développement** | ~5 mois |
| **Ressources Terraform** | 42+ |
| **Endpoints API** | 35+ |
| **Composants React** | 50+ |

---

## 🛣️ Roadmap

### ✅ Complété (v1.0)
- [x] Authentification JWT + Redis blacklist
- [x] CRUD Comptes & Catégories
- [x] Transactions avec timeline
- [x] Récurrences automatiques (12 mois)
- [x] Validation quotidienne + Notifications
- [x] Mode Couple (fusion/dissolution)
- [x] Objectifs épargne
- [x] Dashboard analytics avec graphiques
- [x] Upload fichiers (Cloud Storage)
- [x] Déploiement GCP production

### 🔜 À venir (v2.0)
- [ ] Import CSV/OFX bancaire
- [ ] Règles de catégorisation automatique
- [ ] Budgets par catégorie avec alertes
- [ ] Rappels email (SendGrid)
- [ ] Application mobile (React Native)
- [ ] Connexion bancaire (Plaid/Bridge)
- [ ] Multi-langue (i18n)
- [ ] Mode sombre

---

## 🤝 Contribution

Les contributions sont les bienvenues ! 

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

## 📝 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Linerror99">Linerror99</a>
</p>

<p align="center">
  <a href="https://mimo-frontend-301595415100.europe-west1.run.app">
    <img src="https://img.shields.io/badge/🚀_Essayer_Mimo_Finance-Demo_Live-00C853?style=for-the-badge" alt="Demo Live" />
  </a>
</p>
