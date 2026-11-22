<p align="center">
  <img src="https://img.icons8.com/fluency/96/money-bag.png" alt="Mimo Finance Logo" width="96" />
</p>

<h1 align="center">💰 Mimo Finance v2</h1>

<p align="center">
  <strong>Application moderne de gestion financière personnelle et couple avec Timeline unifiée, Projections 5 ans et Open Banking DSP2</strong>
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
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 15" />
  <img src="https://img.shields.io/badge/Open%20Banking-DSP2-7C3AED" alt="Open Banking DSP2" />
  <img src="https://img.shields.io/badge/GCP-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white" alt="GCP Cloud Run" />
</p>

<p align="center">
  <a href="#-fonctionnalités"><strong>✨ Fonctionnalités</strong></a> •
  <a href="#-open-banking-dsp2"><strong>🏦 Open Banking</strong></a> •
  <a href="#-sécurité"><strong>🔐 Sécurité</strong></a> •
  <a href="#️-architecture"><strong>🏗️ Architecture</strong></a> •
  <a href="#-installation-locale"><strong>🚀 Installation</strong></a> •
  <a href="#-déploiement-gcp"><strong>☁️ Déploiement</strong></a>
</p>

---

## 🎯 À propos du projet

**Mimo Finance** remplace les tableurs Excel par une **timeline financière unifiée** (passé → présent → futur) synchronisée avec vos comptes bancaires européens (DSP2). L'application permet de :

- 🏦 **Synchroniser vos banques** automatiquement en lecture seule (Enable Banking DSP2, synchro toutes les 6h + manuelle)
- 📅 **Suivre votre trésorerie** en vue **Liste** (regroupée par jour avec solde fin de journée) ou **Calendrier** mensuel
- 📊 **Projeter vos finances** de 1 mois à **5 ans** avec détection automatique des mois déficitaires
- 🧳 **Planifier des projets** (vacances, achats, travaux) avec enveloppes budgétaires et simulation **What-If**
- 🎯 **Suivre vos objectifs d'épargne** et échéances réalisées
- 🔄 **Automatiser vos récurrences** (loyer, salaire, abonnements, virements internes)
- 👥 **Partager vos finances en couple** avec 3 portefeuilles tracés (Mon / Partenaire / Commun)

---

## ✨ Fonctionnalités

<table>
<tr>
<td width="50%">

### 🏦 Open Banking (DSP2 / Enable Banking)
- Connexion bancaire européenne en **lecture seule** (zéro initiation de virement)
- **Auto-matching exact** au centime près (±3 jours) sur les opérations `PROJECTED`/`PENDING` (y compris virements internes)
- **Fusion manuelle intelligente** depuis la Timeline (classe les correspondances probables en tête, supporte virements internes, recherche par libellé / montant / date)
- Date de reprise **« Importer à partir du »** modifiable à tout moment par compte
- Déliaison unitaire par compte ou par transaction, alertes d'expiration du consentement (90 jours)

### 💸 Timeline & Récurrences
- États : `PROJECTED` → `PENDING` → `REALIZED` / `CANCELLED`
- Double vue **Liste** (regroupée par jour) & **Calendrier** interactif avec code couleur de solde
- Recherche globale multi-mois + filtres avancés + export PDF mensuel
- Modèles récurrents (Hebdo, Mensuel, Trimestriel, Annuel, Personnalisé) avec édition/annulation groupée
- Corbeille avec restauration (30 jours)

</td>
<td width="50%">

### 💳 Comptes & Catégories
- 6 types : Courant, Épargne, Investissement, Prêt, Espèces, Autre
- Calcul de solde exact (dépenses, revenus, virements entrants/sortants) + rapprochement en 1 clic
- Clôture douce (historique conservé) et logos bancaires

### 🧳 Projets, Objectifs & Projections
- Enveloppes de projets avec statut de paiement réel par dépense + simulation **What-If**
- Objectifs d'épargne avec suivi automatique des versements réalisés
- Projections long terme jusqu'à **5 ans** avec alertes de découvert

### 👥 Mode Couple & Notifications
- Invitation par email, fusion et dissolution intelligente de foyers
- 3 portefeuilles : Personnel, Partenaire, Commun
- Maintenance quotidienne automatique + notifications in-app

</td>
</tr>
</table>

---

## 🔐 Sécurité

Mimo Finance applique une approche **défense en profondeur** adaptée aux données bancaires :

| Couche | Protection en place |
|--------|---------------------|
| **Accès bancaire DSP2** | **100 % lecture seule** via Enable Banking (RSA-4096 / JWT RS256). Aucun mot de passe bancaire stocké dans Mimo. |
| **Chiffrement au repos** | `bank_connections.session_id` chiffré en PostgreSQL via **Fernet** (AES-128-CBC + HMAC-SHA256, préfixe `enc:v1:`, rétrocompatible). |
| **Authentification** | Mots de passe hashés en **bcrypt (12 rounds)**, JWT HS256 court, `refresh_token` en cookie `HttpOnly + Secure`, `access_token` en `sessionStorage`, révocation instantanée via blacklist Redis. |
| **Anti brute-force** | Rate limiting global (`100 req/min/IP`) **et** rate limiting strict dédié sur `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/verify-reset-code`, `/auth/reset-password` (**10 tentatives / 15 min** en prod via Redis). |
| **Contrôle d'accès** | Flag `ALLOW_PUBLIC_REGISTRATION=false` pour fermer les inscriptions publiques en prod (HTTP `403`), isolation stricte par `household_id`, vérifications en temps constant (`secrets.compare_digest`) sur les tokens cron / jobs / admin. |
| **API & Headers** | `/docs`, `/redoc`, `/openapi.json` désactivés en production ; headers HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP, `Referrer-Policy`, CORS strict sans `*`. |
| **Secrets & Infra** | Secrets injectés via **GCP Secret Manager** (`jwt-secret`, `admin-token`, `db-password`, `enable-banking-private-key-b64`, `cron-sync-secret`), VPC privé Cloud SQL/Redis, aucun `.env` ni `.pem` versionné. |

---

## 🏗️ Architecture

```
Utilisateurs (Desktop / Mobile)
        │ HTTPS
        ▼
┌────────────────────────────────────────────────────────────────────┐
│                Google Cloud Platform (europe-west1)                │
│                                                                    │
│  ┌──────────────────────┐   BFF /api/v1   ┌─────────────────────┐ │
│  │  mimo-frontend       │ ──────────────► │  mimo-backend       │ │
│  │  Next.js 15 (SSR/App)│                 │  FastAPI + Gunicorn │ │
│  └──────────────────────┘                 └──────┬──────────┬───┘ │
│                                                  │          │     │
│        ┌─────────────────────────────────────────┘          │     │
│        ▼ (VPC Privé)                                        ▼     │
│  ┌──────────────┐   ┌──────────────┐            ┌───────────────┐ │
│  │  Cloud SQL   │   │    Redis     │            │ Enable Banking│ │
│  │ PostgreSQL 15│   │  Memorystore │            │  API (DSP2)   │ │
│  └──────────────┘   └──────────────┘            └───────────────┘ │
│                                                                    │
│  Services GCP : Secret Manager · Cloud Scheduler (6h + daily) ·   │
│                 Cloud Storage (Uploads/Backups) · Artifact Registry│
└────────────────────────────────────────────────────────────────────┘
```

### Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript 5, Tailwind CSS, TanStack Query, Zustand, Recharts, Vitest |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy 2.0 (async), Pydantic v2, Alembic, `cryptography` (Fernet), Pytest |
| **Données** | PostgreSQL 15, Redis 7 |
| **Open Banking** | Enable Banking API (DSP2 / ISO 20022), mode `mock` offline pour dev & CI |
| **Infrastructure** | Google Cloud Run, Cloud SQL, Memorystore, Secret Manager, Cloud Scheduler, Terraform |

---

## 🚀 Installation Locale (100 % Docker)

### Prérequis
- Docker Desktop 24.0+ & Git

### Démarrage rapide

```bash
# 1. Cloner le projet
git clone https://github.com/Linerror99/Mimo-core.git
cd Mimo-core

# 2. Configurer l'environnement
cp .env.example .env

# 3. Démarrer la stack complète (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d

# 4. Vérifier les services
docker compose ps
```

### URLs locales

| Service | URL |
|---------|-----|
| **Frontend (Next.js)** | http://localhost:3000 |
| **Backend API (FastAPI)** | http://localhost:8000 |
| **API Docs (Swagger — dev uniquement)** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

---

## 🧪 Tests & Qualité (Docker)

```bash
# Tests unitaires backend (pytest)
docker exec mimo-backend pytest tests/ -v

# Tests ciblés Open Banking & Sécurité
docker exec mimo-backend pytest tests/test_banking.py tests/test_enable_banking_provider.py tests/test_security.py tests/test_security_hardening.py -v

# Vérification TypeScript + Tests unitaires frontend (Vitest) + Lint
docker exec mimo-frontend sh -c "npx tsc --noEmit && npx vitest run && npm run lint"
```

---

## ☁️ Déploiement GCP

Le déploiement production s'effectue directement via les scripts Bash (le workflow GitHub Actions `.github/workflows/deploy-production.yml` est en déclenchement manuel `workflow_dispatch` uniquement) :

```bash
# 1. Déployer backend + frontend sur Cloud Run (build linux/amd64 + smoke tests)
./deploy.sh all

# Ou cibler un seul service :
./deploy.sh backend
./deploy.sh frontend

# 2. Configurer Open Banking (secrets via Secret Manager) + Cloud Scheduler 6h + fermer les inscriptions publiques
ENABLE_BANKING_APP_ID=<uuid-enable-banking> ./scripts/setup-banking-cloudrun.sh
```

> Les migrations Alembic (`alembic upgrade head`) s'exécutent automatiquement au démarrage du conteneur backend (`backend/Dockerfile.prod`).

---

## 📁 Structure du Projet

```
Mimo-core/
├── backend/
│   ├── app/
│   │   ├── api/                  # Routes REST (auth, accounts, transactions, jobs, ...)
│   │   │   └── v1/               # banking.py, projects.py, goals.py, exports.py, admin.py
│   │   ├── core/                 # security.py (CORS, headers, rate-limit), crypto.py (Fernet), logger.py
│   │   ├── models/               # Modèles SQLAlchemy (Account, Transaction, BankConnection, ...)
│   │   ├── schemas/              # Schémas Pydantic v2
│   │   └── services/             # Logique métier + services/banking/ (enable_banking, sync_service, mock)
│   ├── alembic/                  # Migrations PostgreSQL
│   └── tests/                    # Suite Pytest (auth, comptes, timeline, banking, sécurité)
├── frontend/
│   ├── src/
│   │   ├── app/                  # Pages App Router (dashboard, timeline, accounts, projects, goals, terms, privacy...)
│   │   ├── components/           # Composants UI & features
│   │   ├── services/             # Clients API typés
│   │   └── stores/               # Stores Zustand
│   └── tests/unit/               # Suite Vitest + Testing Library
├── scripts/                      # Scripts Bash (dev.sh, setup-banking-cloudrun.sh, ...)
├── terraform/                    # Infrastructure as Code GCP
├── docs/                         # Documentation technique & variables d'environnement
├── deploy.sh                     # Script de déploiement direct Cloud Run
└── docker-compose.yml            # Stack locale Docker
```

---

## 📚 Documentation complémentaire

- [Variables d'environnement & Secrets](docs/ENVIRONMENT-VARIABLES.md)
- [Architecture détaillée](docs/ARCHITECTURE.md)
- [Guide de déploiement](docs/DEPLOYMENT.md)
- [Spécifications fonctionnelles](docs/SPECIFICATIONS.md)

---

## 📝 Licence

Projet sous licence MIT. Voir [LICENSE](LICENSE).
