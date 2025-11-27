# 🚀 Sprint 0 - Guide de Démarrage Rapide

## ✅ Ce qui a été fait

### Backend FastAPI
- ✅ Structure de base (app/, api/, config.py, database.py)
- ✅ Configuration PostgreSQL + Redis (async)
- ✅ Health check endpoints (`/health`, `/health/detailed`)
- ✅ CORS configuré pour le frontend
- ✅ JWT settings prêts

### Frontend React
- ✅ API client Axios avec intercepteurs JWT
- ✅ Variables d'environnement configurées
- ✅ Types TypeScript pour import.meta.env
- ✅ Axios ajouté aux dépendances

### Infrastructure
- ✅ Docker Compose (4 services : Postgres, Redis, Backend, Frontend)
- ✅ Scripts de setup (setup.sh / setup.bat)
- ✅ Fichiers .env créés
- ✅ Documentation README.md

---

## 🎯 Prochaine étape : Lancer l'application

### Option 1 : Docker (Recommandé)

```bash
# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Vérifier le health check
curl http://localhost:8000/health/detailed
```

### Option 2 : Script automatique

**Windows :**
```bash
setup.bat
```

**Mac/Linux :**
```bash
chmod +x setup.sh
./setup.sh
```

---

## 🌐 URLs d'accès

Une fois démarré, tu auras accès à :

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health/detailed |

---

## 🧪 Tester que tout fonctionne

### 1. Backend Health Check
```bash
curl http://localhost:8000/health/detailed
```

Résultat attendu :
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### 2. Frontend
- Ouvre http://localhost:5000
- Tu devrais voir ton interface Spark

### 3. API Docs
- Ouvre http://localhost:8000/docs
- Tu verras Swagger UI avec l'endpoint `/health`

---

## 📝 Commandes utiles

```bash
# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Rebuild complet
docker-compose up -d --build

# Voir les logs d'un service
docker-compose logs -f backend
docker-compose logs -f frontend

# Accéder à un container
docker-compose exec backend bash
docker-compose exec postgres psql -U duoflow -d duoflow
```

---

## 🐛 Problèmes courants

### Docker ne démarre pas
- Vérifie que Docker Desktop est lancé
- Vérifie que les ports 5173, 8000, 5432, 6379 sont libres

### Backend ne se connecte pas à la DB
- Attends 10-15 secondes que Postgres démarre
- Regarde les logs : `docker-compose logs postgres`

### Frontend ne trouve pas l'API
- Vérifie que `frontend/.env` contient `VITE_API_URL=http://localhost:8000`
- Redémarre : `docker-compose restart frontend`

---

## ✅ Sprint 0 Terminé !

Tu as maintenant :
- ✅ Un backend FastAPI fonctionnel
- ✅ Un frontend React avec Vite
- ✅ Une base de données Postgres
- ✅ Un cache Redis
- ✅ Tout orchestré avec Docker

**Prochaine étape : Sprint 1 - Authentication ! 🔐**

---

## 📞 Besoin d'aide ?

Si quelque chose ne marche pas :
1. Vérifie les logs : `docker-compose logs -f`
2. Vérifie les fichiers .env
3. Rebuild : `docker-compose up -d --build`

**Tout est prêt pour coder ! 🔥**
