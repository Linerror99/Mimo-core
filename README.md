# 🚀 Mimo Finance

[![CI Pipeline](https://github.com/Linerror99/Mimo-core/actions/workflows/ci.yml/badge.svg)](https://github.com/Linerror99/Mimo-core/actions/workflows/ci.yml)
[![SonarCloud](https://github.com/Linerror99/Mimo-core/actions/workflows/sonar.yml/badge.svg)](https://github.com/Linerror99/Mimo-core/actions/workflows/sonar.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Linerror99_Mimo-core&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Linerror99_Mimo-core)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Linerror99_Mimo-core&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Linerror99_Mimo-core)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 💰 Application moderne de gestion financière collaborative pour individus et couples

---

## 📋 Vue d'Ensemble

**Mimo Finance** est une application complète de gestion financière qui permet aux utilisateurs individuels et aux couples de suivre leurs finances avec une timeline unifiée (passé → présent → futur).

### ✨ Fonctionnalités Principales

- 🔐 **Authentification sécurisée** (JWT + bcrypt)
- 👥 **Mode Couple** avec invitations et 3 portefeuilles tracés
- 💳 **Comptes multiples** (bancaires, cash, épargne)
- 💸 **Transactions** avec états (PROJECTED → PENDING → REALIZED)
- 🔄 **Transactions récurrentes** automatiques
- 📊 **Catégories personnalisables** et statistiques
- 🎯 **Objectifs financiers** avec suivi de progression
- 🔔 **Notifications** in-app temps réel
- 📄 **Reçus PDF** uploadables
- 🗑️ **Corbeille** avec restauration
- 📈 **Dashboard** avec graphiques et KPIs
- 🌓 **Mode sombre** responsive mobile/desktop

---

## 🛠️ Stack Technique

```
Frontend       React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
Backend        FastAPI + Python 3.12 + SQLAlchemy 2.0 (async)
Database       PostgreSQL 15 + Redis 7
Infrastructure Docker Compose + Nginx
CI/CD          GitHub Actions + SonarCloud
Testing        Pytest (247 tests, 75% coverage) + Locust (load tests)
Linting        Ruff + ESLint + Mypy + TypeScript
```

---

## ⚡ Quick Start (3 commandes)

### Prérequis
- Docker Desktop 24.0+
- Git

### Installation

```bash
# 1. Cloner le projet
git clone https://github.com/Linerror99/Mimo-core.git
cd Mimo-core

# 2. Copier et configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (JWT_SECRET_KEY, DB_PASSWORD, etc.)

# 3. Démarrer les services
docker compose up -d

# 4. Initialiser la base de données
bash scripts/init-db.sh
```

**✅ C'est tout ! L'application est prête.**

---

## 🌐 URLs d'Accès

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Interface utilisateur React |
| **Backend API** | http://localhost:8000 | API REST FastAPI |
| **API Docs** | http://localhost:8000/docs | Documentation Swagger interactive |
| **Health Check** | http://localhost:8000/health | Statut système |

---

## 📁 Structure Projet

```
Mimo-core/
├── backend/                 # Backend FastAPI
│   ├── app/
│   │   ├── api/v1/         # Endpoints REST
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   ├── schemas/        # Pydantic validation
│   │   └── core/           # Config, security, DB
│   ├── tests/              # Tests unitaires (247 tests)
│   ├── scripts/            # Scripts gestion (init, backup, restore)
│   └── alembic/            # Migrations DB
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages Next.js
│   │   ├── services/       # API calls
│   │   ├── stores/         # Zustand state
│   │   └── hooks/          # Custom hooks
│   └── public/             # Assets statiques
├── .github/workflows/      # CI/CD GitHub Actions
├── docs/                   # Documentation complète
│   ├── ARCHITECTURE.md     # Architecture système
│   ├── DEPLOYMENT.md       # Guide déploiement
│   ├── CI-CD-SETUP.md      # Setup CI/CD
│   └── SPRINT-PLANNING.md  # Planning sprints
└── docker-compose.yml      # Orchestration services
```

---

## 🔧 Commandes Développement

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs en temps réel
docker compose logs -f

# Arrêter les services
docker compose down

# Rebuild après modifications
docker compose up -d --build

# Health check système
bash scripts/health-check.sh

# Backup base de données
bash scripts/backup-db.sh

# Reset complet DB (⚠️ danger)
bash scripts/reset-db.sh

# Générer données de test
docker compose exec backend python scripts/seed-test-data.py

# Lancer les tests backend
docker compose exec backend pytest tests/ -v --cov=app

# Voir les logs backend
docker compose logs -f backend

# Entrer dans le container backend
docker compose exec backend bash
```

---

## 🧪 Tests & Qualité

### Coverage Tests

```bash
# Backend tests (247 tests, 75% coverage)
docker compose exec backend pytest tests/ -v --cov=app --cov-report=html

# Voir rapport HTML
open backend/htmlcov/index.html
```

### Linting & Formatting

```bash
# Backend (Ruff)
docker compose exec backend ruff check app/ tests/
docker compose exec backend ruff format app/ tests/

# Frontend (ESLint)
cd frontend && npm run lint
cd frontend && npm run lint:fix
```

### Load Tests

```bash
# Tests de charge (Locust)
cd backend/tests
locust -f locustfile.py --host=http://localhost:8000

# Résultats: 806 req/s, p95 < 35ms, 95.5% success rate
```

---

## 📊 CI/CD Pipeline

### Workflows GitHub Actions

- **ci.yml** (7 jobs, ~10min)
  - ✅ Backend lint (Ruff)
  - ✅ Backend tests (Pytest 247 tests, 75% coverage)
  - ✅ Frontend lint (ESLint)
  - ✅ Build Docker images
  - ✅ Integration tests (docker-compose)
  - ✅ CI summary

- **sonar.yml** (~5min)
  - ✅ SonarCloud analysis
  - ✅ Coverage reports
  - ✅ Quality Gate check

### Badges Status

![CI Pipeline](https://github.com/Linerror99/Mimo-core/actions/workflows/ci.yml/badge.svg)
![SonarCloud](https://github.com/Linerror99/Mimo-core/actions/workflows/sonar.yml/badge.svg)
![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=Linerror99_Mimo-core&metric=alert_status)
![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Linerror99_Mimo-core&metric=coverage)

---

## 🗄️ Scripts Gestion Base de Données

```bash
# Initialiser DB (migrations + seed optionnel)
bash scripts/init-db.sh

# Backup avec nom personnalisé
bash scripts/backup-db.sh "pre-migration"

# Restaurer un backup
bash scripts/restore-db.sh backups/mimo_backup_20251213_143022.sql

# Reset complet (⚠️ DANGER: supprime TOUT)
bash scripts/reset-db.sh

# Health check complet
bash scripts/health-check.sh
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture système complète, diagrammes, flow |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Guide déploiement, scripts, troubleshooting |
| [CI-CD-SETUP.md](docs/CI-CD-SETUP.md) | Setup CI/CD, GitHub Actions, SonarCloud |
| [SPRINT-PLANNING.md](docs/SPRINT-PLANNING.md) | Planning complet 8 sprints |
| [SPECIFICATIONS.md](docs/SPECIFICATIONS.md) | Spécifications fonctionnelles |
| [API Docs](http://localhost:8000/docs) | Documentation Swagger interactive |

---

## 🔐 Sécurité

- ✅ **JWT Authentication** (access 30min, refresh 7j)
- ✅ **Bcrypt hashing** (12 rounds production)
- ✅ **Rate limiting** (60/min général, 5/min auth)
- ✅ **CORS configuré** (origins whitelisted)
- ✅ **Security headers** (CSP, HSTS, X-Frame-Options)
- ✅ **SQL injection protection** (SQLAlchemy parameterized queries)
- ✅ **XSS protection** (Pydantic validation + sanitization)
- ✅ **Secrets management** (environment variables)

---

## 🚀 Performance

### Optimisations Backend
- ✅ SQLAlchemy async queries
- ✅ N+1 prevention (selectinload)
- ✅ Redis caching (sessions, hot data)
- ✅ Connection pooling (PostgreSQL)
- ✅ Bcrypt rounds optimisés (4 dev, 12 prod)

### Optimisations Frontend
- ✅ Code splitting (dynamic imports)
- ✅ React.memo (prevent re-renders)
- ✅ TanStack Query (cache + deduplication)
- ✅ Image optimization
- ✅ Vite build optimizations

### Résultats Load Tests
- **Throughput:** 806 requêtes/60s (13.4 req/s)
- **Success rate:** 95.5%
- **Latency p50:** 14ms
- **Latency p95:** 35ms
- **Latency p99:** 87ms

---

## 🛣️ Roadmap

### Sprint 8 (Actuel) ✅ 95% Complete
- ✅ Sécurité (logs, CORS, headers)
- ✅ Performance (load tests 75% coverage)
- ✅ Scripts déploiement (7 scripts)
- ✅ CI/CD complet (GitHub Actions + SonarCloud)
- 🚧 Documentation finale (en cours)

### Sprint 9 (Prochain) - Infrastructure GCP
- [ ] Terraform modules (12 resources)
- [ ] Cloud SQL + Memorystore
- [ ] Cloud Run deployment
- [ ] Cloud Scheduler (cron jobs)
- [ ] Monitoring + Alerting

### Sprint 10 - Production Release
- [ ] Déploiement production
- [ ] Tests utilisateurs
- [ ] Communication (LinkedIn, etc.)

---

## 👥 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

---

## 📄 License

MIT License - voir [LICENSE](LICENSE)

---

## 📞 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/Linerror99/Mimo-core/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Linerror99/Mimo-core/discussions)
- **Email:** support@mimocompleto.com

---

**Développé avec ❤️ par l'équipe Mimo Finance**

# Rebuild
docker-compose up -d --build
```

---

## 📚 Documentation

- **[Specifications](docs/SPECIFICATIONS.md)** - Complete feature specs
- **[Sprint Planning](docs/SPRINT-PLANNING.md)** - Development roadmap
- **[Tech Stack](docs/STACK-TECHNIQUE.md)** - Architecture details

---

## 🎯 Current Status

**Sprint 0** ✅ Complete
- Infrastructure setup
- Docker orchestration
- Health checks

**Sprint 1** 🚧 In Progress
- Authentication (JWT)
- User management
- Profile settings

---

## 📄 License

MIT License

---

**Happy Coding! 🚀**