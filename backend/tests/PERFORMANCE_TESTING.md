# 🚀 Performance & Load Testing Guide

Ce guide explique comment exécuter les tests de charge et analyser la couverture de code.

## 📊 Test Coverage (Couverture de Code)

### Objectif : >85% de couverture

### Lancer l'analyse de couverture

```bash
# Méthode 1 : Script automatique
docker compose exec backend bash scripts/coverage.sh

# Méthode 2 : Commande directe
docker compose exec backend pytest --cov=app --cov-report=html --cov-report=term-missing tests/
```

### Voir le rapport HTML

```bash
# Le rapport est généré dans backend/htmlcov/
# Ouvre htmlcov/index.html dans ton navigateur
```

### Interpréter les résultats

- **Vert** : Code testé (bien !)
- **Rouge** : Code non testé (ajouter des tests)
- **Jaune** : Branches partiellement testées

---

## ⚡ Load Testing avec Locust

### Objectif : 100 utilisateurs simultanés

### 1. Installer Locust (déjà dans requirements.txt)

```bash
docker compose exec backend pip install locust
```

### 2. Lancer Locust

```bash
docker compose exec backend locust -f tests/locustfile.py --host=http://localhost:8000
```

### 3. Ouvrir l'interface Web

Ouvre ton navigateur : http://localhost:8089

### 4. Configurer le test

Dans l'interface Locust :
- **Number of users** : `100` (utilisateurs simultanés)
- **Spawn rate** : `10` (10 nouveaux users/seconde)
- **Host** : `http://localhost:8000` (pré-rempli)

Clique sur **Start swarming**

### 5. Analyser les résultats

**Métriques clés :**
- **RPS (Requests Per Second)** : Débit du serveur
- **Response Time (ms)** :
  - p50 : 50% des requêtes < X ms
  - p95 : 95% des requêtes < X ms
  - p99 : 99% des requêtes < X ms
- **Failures** : Taux d'erreur (doit être < 1%)

**Objectifs de performance :**
- ✅ Response time p95 < 500ms
- ✅ Response time p99 < 1000ms
- ✅ Failure rate < 1%
- ✅ RPS > 50 (pour 100 users)

---

## 🎯 Endpoints testés par Locust

| Endpoint | Poids | Description |
|----------|-------|-------------|
| `POST /auth/register` | 1x | Inscription (une fois par user) |
| `POST /auth/login` | 1x | Connexion (une fois par user) |
| `GET /users/me` | 1x | Profil utilisateur |
| `GET /accounts` | 3x | Liste comptes (fréquent) |
| `GET /transactions` | 5x | Liste transactions (très fréquent) |
| `POST /transactions` | 2x | Créer transaction |
| `GET /categories` | 2x | Liste catégories |
| `GET /goals` | 2x | Liste objectifs |
| `GET /wallets/balance` | 1x | Calcul solde (lourd) |
| `GET /transactions/pending` | 1x | Transactions en attente |

**Total** : ~18 requêtes par cycle utilisateur

---

## 🔍 Identifier les Bottlenecks

### 1. Backend Logs

```bash
# Voir les logs en temps réel pendant le test
docker compose logs -f backend
```

Cherche :
- ⚠️ Requêtes SQL lentes (> 100ms)
- ⚠️ Erreurs 500
- ⚠️ Timeouts

### 2. Database Performance

```bash
# Vérifier les connexions PostgreSQL
docker compose exec postgres psql -U duoflow -d duoflow -c "SELECT count(*) FROM pg_stat_activity;"

# Requêtes lentes
docker compose exec postgres psql -U duoflow -d duoflow -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### 3. Redis Cache

```bash
# Stats Redis
docker compose exec redis redis-cli INFO stats
```

---

## 🛠️ Optimisations Communes

### Si Response Time trop élevé (> 500ms)

1. **Ajouter des index SQL**
   ```sql
   CREATE INDEX idx_transactions_date ON transactions(transaction_date);
   CREATE INDEX idx_transactions_household ON transactions(household_id);
   ```

2. **Activer le cache Redis**
   - Mettre en cache les listes de catégories
   - Mettre en cache les calculs de wallet balance

3. **Optimiser les requêtes SQL**
   - Utiliser `select_related()` pour éviter N+1 queries
   - Ajouter `LIMIT` sur les grandes listes

### Si Failure Rate élevé (> 1%)

1. **Augmenter les workers Uvicorn**
   ```yaml
   # docker-compose.yml
   command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

2. **Augmenter les connexions PostgreSQL**
   ```python
   # app/database.py
   engine = create_async_engine(
       DATABASE_URL,
       pool_size=20,  # 10 → 20
       max_overflow=40  # 20 → 40
   )
   ```

3. **Augmenter le rate limiting**
   ```python
   # app/core/security.py
   MAX_REQUESTS_PER_MINUTE = 1000 if is_development else 200
   ```

---

## 📈 Benchmarks Attendus

Avec la configuration actuelle (Docker Desktop, 4 CPU, 8GB RAM) :

| Métrique | Objectif | Bon | Excellent |
|----------|----------|-----|-----------|
| RPS | > 50 | 80-100 | > 150 |
| Response Time p50 | < 200ms | < 100ms | < 50ms |
| Response Time p95 | < 500ms | < 300ms | < 150ms |
| Response Time p99 | < 1000ms | < 600ms | < 300ms |
| Failure Rate | < 1% | < 0.5% | 0% |
| Coverage | > 85% | > 90% | > 95% |

---

## 🎓 Tips

1. **Warm-up** : Lance un test avec 10 users pendant 1 min avant le test complet
2. **Reset DB** : Entre chaque test, reset la DB pour avoir des données propres
3. **Monitor Resources** : Utilise `docker stats` pour voir CPU/RAM pendant le test
4. **Progressive Load** : Commence avec 10 users, puis 50, puis 100

---

## 🚨 Troubleshooting

### "Too many connections" (PostgreSQL)

```bash
# Augmenter max_connections dans postgres
docker compose exec postgres psql -U duoflow -c "ALTER SYSTEM SET max_connections = 200;"
docker compose restart postgres
```

### "Rate limit exceeded" (429)

C'est normal ! Ton rate limiting fonctionne.
- En dev : 1000 req/min
- En prod : 100 req/min

Augmente la limite en dev si besoin.

### "Workers exited" (Uvicorn)

Augmente la RAM allouée à Docker :
- Docker Desktop → Settings → Resources → Memory : 8GB minimum

---

Bon test ! 🚀
