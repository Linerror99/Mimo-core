# 🔄 Database Reset & Seed Script

## 📝 Description

Script pour **reset complètement la base de données** et la peupler avec 2 utilisateurs de test.

**Utilise ce script quand** :
- ✅ La BDD est corrompue après des tests
- ✅ Tu veux repartir d'un état propre
- ✅ Les migrations Alembic ont foiré
- ✅ Tu veux tester le flow d'invitation rapidement

---

## 🚀 Usage

### Commande

```bash
# Depuis la racine du projet
docker compose exec backend python scripts/reset_and_seed.py
```

### Ce que fait le script

1. **⚠️ Avertissement** : 3 secondes pour annuler (Ctrl+C)
2. **🗑️ Drop schema** : Supprime TOUT (tables, données, contraintes)
3. **🔧 Alembic migrations** : Recrée toutes les tables
4. **🌱 Seed** : Peuple avec 2 users + comptes + transactions

---

## 👥 Utilisateurs de Test

### User 1 : "Moi Toi"

```
Email:     moi.toi@test.com
Password:  password123
Household: INDIVIDUAL
```

**Données créées** :
- 🏦 **1 Compte** : Compte Courant N26 (1000€ initial)
- 🏷️ **3 Catégories** :
  - Salaire (INCOME)
  - Alimentation (EXPENSE)
  - Transport (EXPENSE)
- 💸 **5 Transactions** :
  - +3000€ : Salaire Novembre (REALIZED)
  - -50.00€ : Courses Carrefour (REALIZED)
  - -80.99€ : Essence Total (REALIZED)
  - +300€ : Prime fin d'année (PROJECTED - futur)
  - -35.50€ : Restaurant (REALIZED)

**Balance finale** : ~3233.51€

---

### User 2 : "Il Elle Nous Vous"

```
Email:     il.elle@test.com
Password:  password123
Household: INDIVIDUAL
```

**Données créées** :
- 🏦 **1 Compte** : Compte Épargne (500€ initial)
- 🏷️ **2 Catégories** :
  - Salaire (INCOME)
  - Loisirs (EXPENSE)
- 💸 **3 Transactions** :
  - +2000€ : Salaire (REALIZED)
  - -200€ : Cinéma (REALIZED)
  - -129.99€ : Abonnement Netflix (REALIZED)

**Balance finale** : ~2170.01€
3. Invite il.elle@test.com
---

## 🧪 Tester le Flow Invitation / Fusion

### Étape 1 : Connexion User 1

```bash
# Frontend : http://localhost:3000/login
Email: moi.toi@test.com
Password: password123
```

### Étape 2 : Envoyer Invitation

1. Va dans **Settings → Invitations**
2. Entre l'email : `il.elle@test.com`
3. Clique **Envoyer**
4. ✅ Invitation créée avec status PENDING

### Étape 3 : Connexion User 2

```bash
# Déconnecte-toi
# Reconnecte-toi avec :
Email: il.elle@test.com
Password: password123
```

### Étape 4 : Accepter Invitation

1. Va dans **Settings → Invitations**
2. Onglet **"Invitations reçues"**
3. Tu vois l'invitation de "Moi Toi"
4. Clique **Accepter**
5. ✅ Fusion automatique en COUPLE

### Étape 5 : Vérifier le Résultat

1. Dashboard affiche maintenant **3 wallets** :
   - 💰 Portefeuille "Moi Toi"
   - 💰 Portefeuille "Il Elle Nous Vous"
   - 💰 Portefeuille Commun (partagé)

2. Timeline affiche toutes les transactions fusionnées

3. Les 2 comptes bancaires sont visibles

---

## ⚠️ Avertissements

### ⛔ Ce script est DESTRUCTIF

```
❌ Supprime TOUTES les données
❌ Impossible de revenir en arrière
❌ Utilise UNIQUEMENT en développement
```

Le script contient un sleep de 3 secondes et un avertissement visible, mais fais attention.

---

## 🐛 Troubleshooting

### Erreur : "Alembic migration failed"
```bash
docker compose exec backend alembic upgrade head
```

### Erreur : "Database locked"
```bash
docker compose restart db
# Attendre 5 secondes puis relancer
```

### Erreur : "Password hashing failed"
```bash
docker compose exec backend pip install bcrypt==4.0.1
```

---

**Fait avec ❤️ pour DuoFlow Finance**
- 100+ transactions
- Récurrences sur 12 mois

### `export_backup.py` (à venir)
Sauvegarder les données avant un reset :
- Export PostgreSQL dump
- Export JSON des données
- Stockage dans `backups/`

### `migrate_data.py` (à venir)
Migration de données entre versions :
- Transformer ancien format
- Réécrire les IDs
- Valider l'intégrité

---

## 📝 Notes

- Le script utilise `asyncio` pour correspondre au code backend
- Les IDs sont fixés pour faciliter les tests
- Les dates sont relatives à `date.today()` pour éviter les données obsolètes
- Le délai de 3 secondes avant exécution permet d'annuler (Ctrl+C)

---

**Bon testing! 🚀**
