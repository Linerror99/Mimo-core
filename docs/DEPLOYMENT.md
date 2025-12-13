# 🚀 Guide de Déploiement - Mimo Finance

## 📋 Table des Matières

- [Prérequis](#prérequis)
- [Installation Initiale](#installation-initiale)
- [Scripts de Gestion](#scripts-de-gestion)
- [Configuration](#configuration)
- [Déploiement Production](#déploiement-production)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prérequis

### Logiciels Requis

| Logiciel | Version Minimum | Recommandé |
|----------|----------------|------------|
| **Docker** | 24.0+ | 26.0+ |
| **Docker Compose** | 2.20+ | 2.30+ |
| **PostgreSQL** | 15+ | 15.8 |
| **Redis** | 7+ | 7.4 |
| **Python** | 3.12+ | 3.12 |
| **Node.js** | 20+ | 20 LTS |

### Vérification Système

```bash
# Vérifier Docker
docker --version
docker compose version

# Vérifier PostgreSQL (si installé localement)
psql --version

# Vérifier Python
python --version

# Vérifier Node.js
node --version
npm --version
```

---

## 📦 Installation Initiale

### 1. Cloner le Projet

```bash
git clone https://github.com/Linerror99/Mimo-core.git
cd Mimo-core
```

### 2. Configuration Environnement

#### Créer le fichier `.env`

```bash
# Copier le template
cp .env.example .env

# Générer JWT secret
openssl rand -hex 32
```

#### Variables Essentielles

```env
# === ENVIRONNEMENT ===
ENVIRONMENT=production
DEBUG=false

# === BASE DE DONNÉES ===
DB_HOST=postgres
DB_PORT=5432
DB_NAME=duoflow
DB_USER=duoflow_user
DB_PASSWORD=VOTRE_PASSWORD_SECURISE  # ⚠️ Changer impérativement

# === REDIS ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# === JWT ===
JWT_SECRET_KEY=VOTRE_JWT_SECRET_32_CHARS  # ⚠️ Utiliser openssl rand -hex 32
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_MINUTES=10080

# === SÉCURITÉ ===
BCRYPT_ROUNDS=12  # Production: 12-14, Dev: 4

# === UPLOADS ===
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE=5242880  # 5MB

# === BACKEND ===
API_HOST=0.0.0.0
API_PORT=8000
WORKERS=4

# === FRONTEND ===
VITE_API_URL=https://votre-domaine.com/api
```

### 3. Démarrage Rapide

#### Option A : Docker Compose (Recommandé)

```bash
# Démarrer tous les services
docker compose up -d

# Vérifier le statut
docker compose ps

# Voir les logs
docker compose logs -f
```

#### Option B : Installation Manuelle

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend (terminal séparé)
cd frontend
npm install
npm run dev
```

### 4. Initialisation Base de Données

```bash
# Utiliser le script automatique
bash scripts/init-db.sh

# Ou manuellement
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed-test-data.py
```

### 5. Vérification Installation

```bash
# Health check automatique
bash scripts/health-check.sh

# Test manuel
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

**Résultat attendu :**
```
✅ Docker daemon: Running
✅ PostgreSQL: Running
✅ Redis: Running  
✅ Backend API: Running
✅ Frontend: Running
```

---

## 🛠️ Scripts de Gestion

### `init-db.sh` - Initialisation Base de Données

**Usage :**
```bash
bash scripts/init-db.sh
```

**Actions :**
1. Vérifie la connexion PostgreSQL
2. Exécute les migrations Alembic
3. Demande confirmation pour seed data
4. Génère données de test (optionnel)

**Exemple :**
```
🔍 Checking PostgreSQL connection...
✅ PostgreSQL is ready

🚀 Running database migrations...
✅ Migrations completed

📊 Do you want to seed test data? (y/N): y
✅ Test data seeded successfully
```

---

### `reset-db.sh` - Reset Complet

**⚠️ DANGER : Supprime TOUTES les données**

**Usage :**
```bash
bash scripts/reset-db.sh
```

**Actions :**
1. Demande confirmation (taper "YES" en majuscules)
2. Propose backup automatique
3. Supprime toutes les tables
4. Recrée le schéma
5. Execute migrations
6. Seed données de test

**Exemple :**
```
⚠️  WARNING: This will DELETE ALL DATA in the database!
Type 'YES' (in uppercase) to confirm: YES

💾 Do you want to create a backup first? (Y/n): y
✅ Backup created: backups/mimo_backup_20251213_143022.sql

🗑️  Dropping all tables...
✅ Database reset successfully
```

---

### `backup-db.sh` - Sauvegarde

**Usage :**
```bash
# Backup avec nom automatique (timestamp)
bash scripts/backup-db.sh

# Backup avec nom personnalisé
bash scripts/backup-db.sh "pre-migration"
```

**Format :**
```
backups/
├── mimo_backup_20251213_143022.sql
├── pre-migration_20251213_143500.sql
└── production_20251213_150000.sql
```

**Rétention :** 30 jours (configurable)

**Exemple :**
```
💾 Starting PostgreSQL backup...
✅ Backup completed successfully
📁 Backup location: backups/mimo_backup_20251213_143022.sql
📊 Backup size: 45 MB
```

---

### `restore-db.sh` - Restauration

**⚠️ ATTENTION : Écrase la base actuelle**

**Usage :**
```bash
bash scripts/restore-db.sh backups/mimo_backup_20251213_143022.sql
```

**Actions :**
1. Demande confirmation (taper "YES")
2. Crée backup de sécurité automatique
3. Drop la base actuelle
4. Recrée la base
5. Restore le backup
6. Affiche instructions rollback

**Exemple :**
```
⚠️  WARNING: This will REPLACE the current database!
Type 'YES' (in uppercase) to confirm: YES

💾 Creating safety backup...
✅ Safety backup: backups/pre-restore_20251213_143800.sql

🔄 Restoring database...
✅ Database restored successfully

📝 If something went wrong, rollback with:
   bash scripts/restore-db.sh backups/pre-restore_20251213_143800.sql
```

---

### `seed-test-data.py` - Génération Données de Test

**Usage :**
```bash
docker compose exec backend python scripts/seed-test-data.py
```

**Génère :**
- 100 utilisateurs (password: `password123`)
- 50 foyers (INDIVIDUAL + COUPLE)
- 200+ comptes bancaires
- 1000+ transactions (3 mois historique)
- 15 catégories
- 50 objectifs
- 30 modèles de transactions récurrentes

**Localisation :** Français (noms, adresses, montants)

**Exemple :**
```
🌱 Starting test data seeding...

👥 Creating 100 users...
████████████████████ 100/100

🏠 Creating 50 households...
████████████████████ 50/50

💰 Creating accounts...
✅ 234 accounts created

💸 Creating 1000 transactions...
████████████████████ 1000/1000

✅ Test data seeded successfully
📧 All users password: password123
```

---

### `health-check.sh` - Diagnostic Système

**Usage :**
```bash
bash scripts/health-check.sh
```

**Vérifie :**
- Docker daemon
- PostgreSQL (connexion + taille DB)
- Redis (connexion + mémoire)
- Backend API (endpoints + logs)
- Frontend (build + assets)

**Affiche :**
- Statut chaque service (✅/❌)
- Statistiques (users, transactions, DB size)
- Logs d'erreurs récents
- Instructions troubleshooting si échec

**Exemple :**
```
🏥 Mimo Finance - Health Check
================================

✅ Docker daemon: Running
✅ PostgreSQL: Running
✅ Redis: Running
✅ Backend API: Running (8000)
✅ Frontend: Running (5173)

📊 Database Statistics:
   - Size: 127 MB
   - Users: 234
   - Transactions: 3,451
   - Last backup: 2 hours ago

📊 Redis Statistics:
   - Keys: 45
   - Memory: 12.3 MB
   - Uptime: 3 days

🎉 All systems operational!
```

---

## ⚙️ Configuration

### Environnements

#### Development
```env
ENVIRONMENT=development
DEBUG=true
BCRYPT_ROUNDS=4
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Staging
```env
ENVIRONMENT=staging
DEBUG=false
BCRYPT_ROUNDS=10
LOG_LEVEL=INFO
CORS_ORIGINS=https://staging.mimocompleto.com
```

#### Production
```env
ENVIRONMENT=production
DEBUG=false
BCRYPT_ROUNDS=12
LOG_LEVEL=WARNING
CORS_ORIGINS=https://mimocompleto.com
```

### Rate Limiting

```env
# Par IP
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=10

# Auth endpoints (plus strict)
AUTH_RATE_LIMIT_PER_MINUTE=5
AUTH_RATE_LIMIT_BURST=2
```

### Logs

```env
LOG_DIR=/app/logs
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_MAX_SIZE=10MB
LOG_BACKUP_COUNT=5
```

### Uploads

```env
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE=5242880  # 5MB
ALLOWED_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.webp
```

---

## 🚀 Déploiement Production

### Docker Compose Production

**Fichier : `docker-compose.prod.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - ENVIRONMENT=production
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL}
    restart: unless-stopped
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

volumes:
  postgres_data:
  redis_data:
```

### Déploiement Initial

```bash
# 1. Pull dernière version
git pull origin main

# 2. Build images
docker compose -f docker-compose.prod.yml build

# 3. Démarrer services
docker compose -f docker-compose.prod.yml up -d

# 4. Initialiser DB
bash scripts/init-db.sh

# 5. Health check
bash scripts/health-check.sh

# 6. Backup initial
bash scripts/backup-db.sh "initial-production"
```

### Mise à Jour Application

```bash
# 1. Backup DB
bash scripts/backup-db.sh "pre-update-$(date +%Y%m%d)"

# 2. Pull nouvelles modifications
git pull origin main

# 3. Rebuild images
docker compose -f docker-compose.prod.yml build

# 4. Migrations DB
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 5. Restart services (zero downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker compose -f docker-compose.prod.yml up -d --no-deps --build frontend

# 6. Health check
bash scripts/health-check.sh
```

---

## 🔄 Maintenance

### Backups Automatiques

**Cron Job (Linux) :**

```bash
# Editer crontab
crontab -e

# Backup quotidien 3h du matin
0 3 * * * cd /path/to/Mimo-core && bash scripts/backup-db.sh "daily-auto"

# Cleanup anciens backups (30 jours)
0 4 * * * find /path/to/Mimo-core/backups -name "*.sql" -mtime +30 -delete
```

**Task Scheduler (Windows) :**

```powershell
# PowerShell Admin
$action = New-ScheduledTaskAction -Execute "bash" -Argument "scripts/backup-db.sh daily-auto" -WorkingDirectory "C:\path\to\Mimo-core"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Mimo-Finance-Backup" -Description "Daily database backup"
```

### Logs Rotation

**Fichier : `/etc/logrotate.d/mimo-finance`**

```bash
/path/to/Mimo-core/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker compose -f /path/to/Mimo-core/docker-compose.prod.yml exec backend kill -USR1 1
    endscript
}
```

### Monitoring

**Script : `scripts/monitor.sh`**

```bash
#!/bin/bash
# Monitoring + alertes

# Check health
if ! bash scripts/health-check.sh > /dev/null; then
    # Envoyer alerte (email, Slack, etc.)
    echo "❌ Health check failed" | mail -s "Mimo Finance Alert" admin@domain.com
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️ Disk usage: ${DISK_USAGE}%" | mail -s "Disk Space Alert" admin@domain.com
fi

# Check DB size
DB_SIZE=$(docker compose exec -T postgres psql -U duoflow -d duoflow -t -c "SELECT pg_size_pretty(pg_database_size('duoflow'));" | xargs)
echo "📊 Database size: $DB_SIZE"
```

---

## 🔍 Troubleshooting

### Problème : PostgreSQL ne démarre pas

**Symptômes :**
```
Error: could not connect to database
```

**Solutions :**

1. **Vérifier logs :**
```bash
docker compose logs postgres
```

2. **Vérifier permissions :**
```bash
sudo chown -R 999:999 postgres_data/
```

3. **Reset volume (⚠️ perte données) :**
```bash
docker compose down -v
docker compose up -d
```

---

### Problème : Migrations échouent

**Symptômes :**
```
alembic.util.exc.CommandError: Can't locate revision
```

**Solutions :**

1. **Vérifier état actuel :**
```bash
docker compose exec backend alembic current
```

2. **Downgrade puis upgrade :**
```bash
docker compose exec backend alembic downgrade -1
docker compose exec backend alembic upgrade head
```

3. **Stamp version :**
```bash
docker compose exec backend alembic stamp head
```

---

### Problème : Out of Memory

**Symptômes :**
```
docker: Error response from daemon: OCI runtime create failed
```

**Solutions :**

1. **Augmenter limites Docker :**
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G  # Au lieu de 2G
```

2. **Optimiser Redis :**
```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

3. **Activer swap :**
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

### Problème : Frontend 502 Bad Gateway

**Symptômes :**
```
nginx: 502 Bad Gateway
```

**Solutions :**

1. **Vérifier backend :**
```bash
curl http://localhost:8000/health
```

2. **Vérifier nginx config :**
```nginx
# nginx.conf
upstream backend {
    server backend:8000;
    keepalive 32;
}
```

3. **Augmenter timeouts :**
```nginx
proxy_connect_timeout 300s;
proxy_read_timeout 300s;
```

---

### Problème : Uploads échouent

**Symptômes :**
```
413 Payload Too Large
```

**Solutions :**

1. **Augmenter limite nginx :**
```nginx
client_max_body_size 10M;
```

2. **Vérifier variable env :**
```env
MAX_UPLOAD_SIZE=10485760  # 10MB
```

3. **Vérifier permissions :**
```bash
docker compose exec backend ls -la /app/uploads
chmod 777 uploads/  # Temporaire debug
```

---

## 📞 Support

### Logs Utiles

```bash
# Backend logs
docker compose logs -f backend

# Postgres logs
docker compose logs -f postgres

# Redis logs
docker compose logs -f redis

# Tous les logs
docker compose logs -f

# Dernières 100 lignes
docker compose logs --tail=100
```

### Commandes Debug

```bash
# Entrer dans container backend
docker compose exec backend bash

# Entrer dans PostgreSQL
docker compose exec postgres psql -U duoflow -d duoflow

# Entrer dans Redis
docker compose exec redis redis-cli

# Inspecter réseau
docker network inspect mimo-core_default

# Vérifier ressources
docker stats
```

### Contact

- **GitHub Issues :** https://github.com/Linerror99/Mimo-core/issues
- **Documentation :** https://github.com/Linerror99/Mimo-core/tree/main/docs
- **Email Support :** support@mimocompleto.com

---

## 📚 Ressources

- [Architecture](./ARCHITECTURE.md)
- [CI/CD Setup](./CI-CD-SETUP.md)
- [Backend Documentation](./BACKEND.md)
- [Frontend Documentation](./FRONTEND.md)
- [Sprint Planning](./SPRINT-PLANNING.md)

---

**Dernière mise à jour :** 13 décembre 2025  
**Version :** 1.0.0  
**Auteur :** Mimo Finance Team
