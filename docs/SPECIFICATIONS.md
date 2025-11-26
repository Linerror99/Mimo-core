# DuoFlow Finance - Spécifications Techniques V1

## 📋 Table des Matières

1. [Vue d'ensemble du projet](#vue-densemble-du-projet)
2. [Concept & Vision](#concept--vision)
3. [User Stories par EPIC](#user-stories-par-epic)
4. [Modèle de Données](#modèle-de-données)
5. [Wireframes](#wireframes)
6.  [Job Quotidien](#job-quotidien)
7. [Flux de Données Détaillés](#flux-de-données-détaillés)

---

## 🎯 Vue d'ensemble du projet

**Nom du projet** : DuoFlow Finance  
**Version** : 1.0 (MVP)  
**Type** : Application web de gestion financière personnelle et en couple  
**Objectif** : Remplacer la gestion par Excel avec une timeline unifiée passé/présent/futur

### Problème résolu
- Perte d'historique avec les feuilles Excel destructives
- Impossibilité d'analyser les tendances de dépenses
- Difficulté à projeter les finances futures
- Gestion complexe des finances en couple

### Fonctionnalités clés
✅ Timeline financière continue (passé → futur)  
✅ Transactions avec états (Réalisé, En attente, Projeté, Annulé, Corbeille)  
✅ Gestion individuelle OU en couple (fusionnable)  
✅ Portefeuilles tracés même en couple  
✅ Projections automatiques des dépenses récurrentes  
✅ Validation quotidienne automatique  
✅ Export PDF des rapports  

---

## 💡 Concept & Vision

### Principe Central

**Mode par défaut : Compte Individuel**
```
Utilisateur → Compte Personnel → Finances Perso
```

**Mode optionnel : Compte Foyer (Couple)**
```
User 1 + User 2 → Fusion → Foyer Commun
├─ Portefeuille User 1 (tracé)
├─ Portefeuille User 2 (tracé)
└─ Portefeuille Commun (dépenses partagées)
```

**Dissolution possible**
```
Foyer → Archivage (lecture seule) → Retour comptes individuels
```

### Différence avec les autres apps
- **Pas seulement un tracker** : outil de prévision cashflow
- **Timeline unifiée** : passé et futur dans la même vue
- **Portefeuilles tracés en couple** : on sait qui a dépensé quoi
- **Aucune suppression destructive** : tout est tracé

---

## 📖 User Stories par EPIC

### EPIC 1 : Gestion des Comptes (Individuel vs Foyer)

#### US-1.1 : Créer un compte individuel
```
En tant que nouvel utilisateur,
Je veux créer mon compte personnel,
Afin de gérer mes finances seul.
```

**Critères d'acceptation :**
- [ ] Je m'inscris avec prénom, nom, email, mot de passe
- [ ] Mon compte est créé en mode INDIVIDUEL par défaut
- [ ] Je suis redirigé vers le dashboard personnel

**Flux de données :**
```
POST /api/auth/register
{
  first_name: "Alex",
  last_name: "Dupont",
  email: "alex@example.com",
  password: "***"
}

→ Backend crée :
  - User (id, first_name, last_name, email, password_hash)
  - Household (type: INDIVIDUAL, owner_id, status: ACTIVE)
  
→ Response :
{
  user: { id, first_name, display_name: "Alex" },
  household: { id, type: "INDIVIDUAL", status: "ACTIVE" },
  token: "jwt_token"
}
```

---

#### US-1.2 : Inviter quelqu'un pour créer un foyer

**Cas A : Inviter un utilisateur sans compte**
```
En tant qu'utilisateur avec un compte individuel,
Je veux inviter quelqu'un par email qui n'a pas de compte,
Afin qu'il puisse créer son compte et rejoindre mon foyer.
```

**Critères d'acceptation :**
- [ ] J'entre l'email de la personne
- [ ] Un code d'invitation unique est généré (ex: DUO-XKJH-9823)
- [ ] Un email est envoyé avec lien d'inscription
- [ ] La personne crée son compte via ce lien
- [ ] Nos comptes fusionnent automatiquement après inscription

**Flux de données :**
```
POST /api/invitations
{
  inviter_user_id: "u1",
  email: "marie@example.com"
}

→ Backend :
  - Vérifie email n'existe pas
  - Crée Invitation (code: "DUO-XKJH-9823", type: NEW_USER)
  - Envoie email avec lien: app.duoflow.com/register? code=DUO-XKJH-9823

→ Marie s'inscrit via le lien :

POST /api/auth/register-from-invitation
{
  invitation_code: "DUO-XKJH-9823",
  first_name: "Marie",
  last_name: "Martin",
  password: "***"
}

→ Backend :
  - Crée User Marie
  - Crée Household temporaire pour Marie
  - FUSION : Crée nouveau Household COUPLE
  - Migre comptes + transactions de Alex et Marie vers foyer commun
  - Archive anciens households (status: MERGED_INTO_COUPLE)
```

---

**Cas B : Inviter un utilisateur existant**
```
En tant qu'utilisateur avec un compte individuel,
Je veux inviter quelqu'un qui a déjà un compte DuoFlow,
Afin qu'il reçoive une notification et accepte la fusion.
```

**Critères d'acceptation :**
- [ ] J'entre l'email d'un utilisateur existant
- [ ] Il reçoit une notification in-app (pas d'email)
- [ ] Il peut accepter ou refuser depuis l'app
- [ ] Si accepté, fusion automatique des comptes

**Flux de données :**
```
POST /api/invitations
{
  inviter_user_id: "u1",
  email: "sarah@example.com" (existe déjà)
}

→ Backend :
  - Trouve User Sarah (u2)
  - Crée Invitation (type: EXISTING_USER, invitee_user_id: u2)
  - Crée Notification pour Sarah :
    {
      type: "HOUSEHOLD_INVITATION",
      title: "Invitation à créer un foyer",
      message: "Alex vous invite à gérer vos finances ensemble"
    }

→ Sarah accepte :

POST /api/invitations/inv2/accept
{ accepter_user_id: "u2" }

→ Backend :
  - FUSION identique au cas A
  - Crée Household COUPLE
  - Migre toutes les données
  - Archive anciens households
```

---

#### US-1.3 : Dissoudre un foyer et revenir en mode individuel
```
En tant que membre d'un foyer,
Je veux dissoudre le couple et reprendre mon compte individuel,
Afin de gérer à nouveau mes finances seul.
```

**Critères d'acceptation :**
- [ ] N'importe quel membre peut initier la dissolution
- [ ] Le foyer actuel passe en statut ARCHIVÉ
- [ ] Chaque membre récupère un nouveau compte individuel
- [ ] L'historique du foyer reste consultable en lecture seule
- [ ] Les transactions futures communes sont annulées

**Flux de données :**
```
POST /api/households/h3/dissolve
{ initiated_by: "u1" }

→ Backend :
  1. Archiver Household h3 (status: ARCHIVED)
  
  2. Créer 2 nouveaux households individuels :
     - h4 pour Alex (type: INDIVIDUAL)
     - h5 pour Sarah (type: INDIVIDUAL)
  
  3.  RÉPARTITION :
     Comptes bancaires :
       - Comptes de Alex → h4
       - Comptes de Sarah → h5
     
     Transactions RÉALISÉES (passé) :
       - owner_type = PERSONAL & owner_id = u1 → h4
       - owner_type = PERSONAL & owner_id = u2 → h5
       - owner_type = SHARED → Restent dans h3 (archivé)
     
     Transactions PROJETÉES (futur) :
       - owner_type = PERSONAL → Copiées vers h4 ou h5
       - owner_type = SHARED → state = CANCELLED
  
  4. Calculer soldes initiaux :
     - Alex h4 : solde personnel + 50% portefeuille commun
     - Sarah h5 : solde personnel + 50% portefeuille commun

→ Response :
{
  archived_household: { id: "h3", status: "ARCHIVED" },
  new_households: [
    { id: "h4", owner: "Alex", initial_balance: 1250. 00 },
    { id: "h5", owner: "Sarah", initial_balance: 2200.00 }
  ]
}
```

---

#### US-1.4 : Consulter un foyer archivé
```
En tant qu'ancien membre d'un foyer dissous,
Je veux consulter l'historique de ce foyer,
Afin de revoir nos anciennes finances communes.
```

**Critères d'acceptation :**
- [ ] Je peux accéder à la liste de mes foyers archivés
- [ ] Je peux naviguer dans l'historique (lecture seule)
- [ ] Aucune modification n'est possible
- [ ] Aucune mise à jour automatique ne se fait
- [ ] Je peux exporter un PDF de l'historique

**Flux de données :**
```
GET /api/households/archived? user_id=u1

→ Response :
{
  archived_households: [
    {
      id: "h3",
      type: "COUPLE",
      status: "ARCHIVED",
      members: ["Alex", "Sarah"],
      period: { start: "2025-01-01", end: "2025-11-26" },
      archived_at: "2025-11-26T10:00:00Z",
      archived_by: "Alex"
    }
  ]
}

→ Consultation d'un foyer archivé :

GET /api/households/h3? read_only=true

→ Response :
{
  household: { id: "h3", status: "ARCHIVED", ...  },
  accounts: [... ],
  transactions: [...], (toutes RÉALISÉES uniquement)
  stats: {
    total_income: 50000,
    total_expenses: 42000,
    period_months: 10
  },
  read_only: true
}
```

---

### EPIC 2 : Portefeuilles Individuels dans le Foyer

#### US-2.1 : Voir les 3 vues de portefeuilles
```
En tant que membre d'un foyer,
Je veux voir mon portefeuille, celui de mon partenaire, et le portefeuille commun,
Afin de comprendre la répartition de nos finances.
```

**Critères d'acceptation :**
- [ ] Je peux basculer entre 3 vues : Mon Portefeuille, Son Portefeuille, Notre Portefeuille
- [ ] Chaque vue affiche le solde correspondant
- [ ] Les transactions sont filtrées selon l'attribution

**Flux de données :**
```
GET /api/dashboard? household_id=h3&user_id=u1

→ Backend calcule :
  Portefeuille Alex :
    = Comptes de Alex + Transactions (owner_id = u1) + Part transactions SHARED
    = 1500€ personnel + 100€ part commune = 1600€
  
  Portefeuille Sarah :
    = Comptes de Sarah + Transactions (owner_id = u2) + Part transactions SHARED
    = 1000€ personnel + 100€ part commune = 1100€
  
  Portefeuille Commun :
    = Transactions (owner_type = SHARED)
    = 200€ (split 50/50 = 100€ chacun)
  
  Solde Total Foyer :
    = 1600€ + 1100€ = 2700€

→ Response :
{
  household: { id: "h3", type: "COUPLE", total_balance: 2700.00 },
  wallets: {
    alex: {
      balance: 1600.00,
      personal_balance: 1500.00,
      shared_contribution: 100.00
    },
    sarah: {
      balance: 1100.00,
      personal_balance: 1000.00,
      shared_contribution: 100.00
    },
    shared: {
      balance: 200.00,
      split_per_person: 100.00
    }
  }
}
```

---

#### US-2.2 : Ajouter une transaction et l'attribuer
```
En tant que membre d'un foyer,
Je veux ajouter une transaction en précisant à qui elle est attribuée,
Afin de tracer correctement les portefeuilles.
```

**Critères d'acceptation :**
- [ ] Je dois choisir l'attribution : Moi, Partenaire, ou Commun
- [ ] Si Commun, le split est automatique (50/50 par défaut)
- [ ] Les soldes des portefeuilles sont mis à jour en conséquence

**Cas A : Dépense personnelle**
```
POST /api/transactions
{
  household_id: "h3",
  account_id: "acc1",
  type: "EXPENSE",
  frequency_type: "ONE_TIME",
  amount: -50. 00,
  category_id: "cat_transport",
  date: "2025-11-26",
  name: "Essence",
  owner_type: "PERSONAL",
  owner_id: "u1"
}

→ Backend :
  - Crée Transaction (state: REALIZED car date = aujourd'hui)
  - Recalcule portefeuille Alex : 1600€ - 50€ = 1550€
  - Portefeuilles Sarah et Commun inchangés
```

**Cas B : Dépense commune**
```
POST /api/transactions
{
  household_id: "h3",
  account_id: "acc1",
  type: "EXPENSE",
  amount: -1200.00,
  date: "2025-12-01",
  name: "Loyer mensuel",
  owner_type: "SHARED",
  split_rule: {
    type: "EQUAL",
    alex: 0.5,
    sarah: 0. 5
  }
}

→ Backend :
  - Crée Transaction principale (id: tx_loyer)
  - Crée 2 TransactionSplits :
    { transaction_id: tx_loyer, user_id: u1, amount: -600, percentage: 50 }
    { transaction_id: tx_loyer, user_id: u2, amount: -600, percentage: 50 }
  - Recalcule :
    Alex : 1550€ - 600€ = 950€
    Sarah : 1100€ - 600€ = 500€
```

---

### EPIC 3 : Gestion des Transactions

#### US-3.1 : Ajouter une transaction (ponctuelle ou récurrente)
```
En tant qu'utilisateur,
Je veux ajouter une transaction (revenu ou dépense),
En précisant si elle est ponctuelle ou récurrente. 
```

**Critères d'acceptation :**
- [ ] Je choisis le type : Revenu ou Dépense
- [ ] Je choisis la fréquence : Ponctuelle ou Récurrente
- [ ] Pour ponctuelle : nom, montant, catégorie, date
- [ ] Pour récurrente : + fréquence, date de début, date de fin (optionnelle)
- [ ] Si date passée → état = RÉALISÉ
- [ ] Si date future → état = PROJETÉ

**Transaction ponctuelle passée :**
```
POST /api/transactions
{
  household_id: "h4",
  account_id: "acc2",
  type: "EXPENSE",
  frequency_type: "ONE_TIME",
  amount: -45.00,
  category_id: "cat2",
  date: "2025-11-25", (hier)
  name: "Courses Carrefour"
}

→ Backend :
  - Crée Transaction (state: REALIZED car date < aujourd'hui)
  - Recalcule solde
```

**Transaction récurrente :**
```
POST /api/recurring-templates
{
  household_id: "h4",
  account_id: "acc1",
  type: "EXPENSE",
  name: "Loyer mensuel",
  amount: -1500.00,
  category_id: "cat10",
  frequency: "MONTHLY",
  day_of_month: 1,
  start_date: "2025-12-01",
  end_date: null,
  projection_horizon_months: 24
}

→ Backend :
  - Crée RecurringTemplate (id: rt1)
  - Génère 24 transactions PROJETÉES (Déc 2025 → Nov 2027)
    Pour chaque occurrence :
      state = date < today ?  "REALIZED" : "PROJECTED"
```

---

#### US-3. 2 : Supprimer une transaction de façon précise
```
En tant qu'utilisateur,
Je veux supprimer une transaction spécifique,
Afin de corriger une erreur. 
```

**Critères d'acceptation :**
- [ ] Je peux supprimer une transaction ponctuelle (soft delete)
- [ ] La transaction passe en état TRASHED (pas de vraie suppression)
- [ ] Le solde est recalculé automatiquement

**Flux de données :**
```
DELETE /api/transactions/tx1

→ Backend :
  - Met à jour Transaction :
    state: "REALIZED" → "TRASHED"
    trashed_at: NOW()
    trashed_by: "u2"
  - Recalcule solde (ignore transactions TRASHED)
```

---

#### US-3.3 : Supprimer ou modifier une transaction récurrente sur une période
```
En tant qu'utilisateur,
Je veux modifier ou supprimer une série de transactions récurrentes,
Sur une période précise (ex: annuler Netflix de mars à juin).
```

**Critères d'acceptation :**
- [ ] Je peux sélectionner une plage de dates
- [ ] Je peux modifier le montant sur cette période
- [ ] Je peux annuler les occurrences sur cette période
- [ ] Le template parent reste intact

**Annuler sur période :**
```
POST /api/recurring-templates/rt5/bulk-cancel
{
  start_date: "2026-03-01",
  end_date: "2026-06-30"
}

→ Backend :
  - Trouve toutes transactions de rt5 entre ces dates
  - Pour chaque : state → "CANCELLED"
  - Retourne { cancelled_count: 4 }
```

**Modifier sur période :**
```
POST /api/recurring-templates/rt1/bulk-update
{
  start_date: "2026-01-01",
  end_date: null,
  new_amount: -1550.00
}

→ Backend :
  - Trouve toutes transactions futures de rt1 (>= 2026-01-01)
  - Met à jour amount : -1500 → -1550
  - Retourne { updated_count: 20 }
```

---

### EPIC 4 : Process Automatique de Validation

#### US-4.1 : Recevoir une notification pour valider une transaction du jour
```
En tant qu'utilisateur,
Je veux être notifié quand une transaction récurrente arrive à échéance,
Afin de la valider ou la modifier avant qu'elle soit comptabilisée.
```

**Critères d'acceptation :**
- [ ] Un job quotidien détecte les transactions du jour
- [ ] Je reçois une notification in-app
- [ ] Je peux valider, modifier, reporter, ou supprimer

**Flux automatique :**
```
Job quotidien à 06:00 :

1. Trouve transactions où date = TODAY et state = PROJECTED
2. Change état PROJECTED → PENDING
3. Crée notifications pour tous les membres du foyer

Notification créée :
{
  user_id: "u1",
  type: "TRANSACTION_VALIDATION",
  title: "2 transactions à valider aujourd'hui",
  data: {
    transactions: [
      { id: "tx_loyer", amount: -1200, name: "Loyer" },
      { id: "tx_netflix", amount: -80, name: "Netflix" }
    ]
  },
  action_required: true
}
```

---

#### US-4.2 : Valider une transaction avec options
```
En tant qu'utilisateur,
Je veux pouvoir valider, modifier, reporter OU supprimer une transaction en attente,
Afin d'avoir un contrôle total sur mes finances. 
```

**Options :**
1. ✅ Valider → state = REALIZED
2. ✏️ Modifier montant puis valider
3. 📅 Reporter à une autre date
4. 🗑️ Supprimer → state = TRASHED

**Valider :**
```
PATCH /api/transactions/tx_loyer/validate
{ validated_by: "u1", confirmed_amount: -1200. 00 }

→ Backend :
  state: "PENDING" → "REALIZED"
  confirmed_at: NOW()
  Recalcule soldes
```

**Modifier :**
```
PATCH /api/transactions/tx_netflix/validate
{ validated_by: "u1", confirmed_amount: -90.00 } (modifié)

→ Backend :
  amount: -80 → -90
  state: "PENDING" → "REALIZED"
  modified: true
  template_id reste intact (seule cette occurrence change)
```

**Reporter :**
```
PATCH /api/transactions/tx_loyer/postpone
{ new_date: "2025-12-05" }

→ Backend :
  date: "2025-12-01" → "2025-12-05"
  state: "PENDING" → "PROJECTED"
  Génère nouvelle notification pour le 5
```

**Supprimer :**
```
DELETE /api/transactions/tx_loyer
{ action: "TRASH" }

→ Backend :
  state: "PENDING" → "TRASHED"
  trashed_at: NOW()
  Transaction n'impacte plus les soldes
```

---

### EPIC 5 : Dashboard & Projection

#### US-5.1 : Voir la projection mensuelle de solde
```
En tant qu'utilisateur,
Je veux voir mon solde projeté à la fin de chaque mois futur,
Afin d'anticiper les problèmes de trésorerie.
```

**Critères d'acceptation :**
- [ ] Timeline de 6-12 mois futurs
- [ ] Pour chaque mois : solde projeté en fin de mois
- [ ] Détail cliquable
- [ ] Mois en déficit marqués visuellement (rouge)

**Flux de données :**
```
GET /api/dashboard/projection?household_id=h4&months=12

→ Backend :
  1. Calcule solde actuel (transactions RÉALISÉES)
  2. Pour chaque mois futur :
     - Trouve transactions PROJECTED + PENDING du mois
     - Calcule solde fin mois = solde début + Σ(transactions)
     - Détecte déficit (< 0)

→ Response :
{
  current_balance: 2448.00,
  projections: [
    {
      month: "2025-12",
      balance_start: 2448.00,
      balance_end: 1950.00,
      income: 2500.00,
      expenses: -2998.00,
      status: "OK"
    },
    {
      month: "2026-03",
      balance_start: 1200.00,
      balance_end: -250.00,
      income: 2500.00,
      expenses: -3950.00,
      status: "DEFICIT"
    },
    ... 
  ]
}
```

---

#### US-5.2 : Voir le détail d'un mois projeté
```
En tant qu'utilisateur,
Je veux cliquer sur un mois futur pour voir toutes les transactions prévues,
Afin de comprendre pourquoi mon solde évoluera ainsi.
```

**Flux de données :**
```
GET /api/transactions? household_id=h4&month=2026-03&states=PROJECTED,PENDING

→ Response :
{
  month: "2026-03",
  balance_start: 1200.00,
  balance_end: -250.00,
  transactions: [
    { date: "2026-03-01", amount: -1550, name: "Loyer", state: "PROJECTED" },
    { date: "2026-03-10", amount: -800, name: "Assurance", state: "PROJECTED" },
    { date: "2026-03-15", amount: -600, name: "Courses", state: "PROJECTED" },
    { date: "2026-03-20", amount: -1000, name: "Réparation voiture", state: "PROJECTED" },
    { date: "2026-03-25", amount: +2500, name: "Salaire", state: "PROJECTED" }
  ]
}
```

---

### EPIC 6 : Gestion du Compte Utilisateur

#### US-6.1 : Se déconnecter
```
En tant qu'utilisateur connecté,
Je veux me déconnecter de l'application,
Afin de sécuriser mon accès. 
```

**Critères d'acceptation :**
- [ ] Bouton "Déconnexion" dans le menu
- [ ] Token JWT invalidé
- [ ] Redirection vers page de connexion
- [ ] Cache local effacé

**Flux de données :**
```
POST /api/auth/logout
{ token: "jwt_token" }

→ Backend :
  - Ajoute token à blacklist (Redis)
    redis. set(`blacklist:${token}`, true, { ex: 86400 })
  
→ Frontend :
  - Supprime token du localStorage
  - Clear stores (Zustand)
  - Redirect /login
```

---

#### US-6.2 : Modifier mes informations personnelles
```
En tant qu'utilisateur,
Je veux modifier mon nom, prénom, email, et mot de passe,
Afin de garder mes informations à jour. 
```

**Critères d'acceptation :**
- [ ] Page "Paramètres du compte"
- [ ] Modification : prénom, nom, email, mot de passe
- [ ] Sauvegarde immédiate
- [ ] Email de confirmation si changement d'email

**Modifier infos :**
```
PATCH /api/users/u1
{
  first_name: "Alexandre",
  last_name: "Dupont",
  email: "alex@example.com"
}

→ Backend :
  UPDATE users SET first_name = 'Alexandre', updated_at = NOW()
  WHERE id = 'u1'
```

**Modifier mot de passe :**
```
PATCH /api/users/u1/password
{
  current_password: "***",
  new_password: "***"
}

→ Backend :
  1. Vérifie current_password correct
  2. Hash nouveau mot de passe
  3. Met à jour password_hash
  4. Invalide tous tokens (force reconnexion)
```

---

#### US-6.3 : Gérer mes comptes bancaires
```
En tant qu'utilisateur,
Je veux ajouter, modifier, ou supprimer mes comptes bancaires,
Afin de garder mes sources d'argent à jour.
```

**Critères d'acceptation :**
- [ ] Liste de tous mes comptes
- [ ] Ajouter nouveau compte (nom, type, solde initial)
- [ ] Modifier infos compte existant
- [ ] Supprimer compte (si aucune transaction liée)

**Ajouter :**
```
POST /api/accounts
{
  user_id: "u1",
  household_id: "h4",
  name: "N26 Courant",
  type: "CHECKING",
  institution: "N26",
  initial_balance: 500.00
}

→ Backend :
  - Crée Account
  - Retourne { account }
```

**Supprimer :**
```
DELETE /api/accounts/acc2

→ Backend :
  1. Vérifie pas de transactions PROJECTED liées
  2. Supprime transactions liées
  3. Supprime compte
  4. Recalcule solde total
```

---

### EPIC 7 : Corbeille (Soft Delete)

#### US-7. 1 : Supprimer une transaction vers la corbeille
```
En tant qu'utilisateur,
Je veux supprimer une transaction sans la perdre définitivement,
Afin de pouvoir la restaurer si nécessaire.
```

**Critères d'acceptation :**
- [ ] Suppression → corbeille (état TRASHED)
- [ ] Invisible dans timeline
- [ ] Accessible dans corbeille
- [ ] Restauration ou suppression définitive possibles

**Flux :**
```
DELETE /api/transactions/tx_essence
{ action: "TRASH" }

→ Backend :
  state: "REALIZED" → "TRASHED"
  trashed_at: NOW()
  trashed_by: "u1"
  Recalcule soldes (ignore TRASHED)
```

---

#### US-7.2 : Restaurer depuis la corbeille
```
GET /api/transactions/trash? household_id=h3

→ Response : Liste transactions TRASHED

PATCH /api/transactions/tx_essence/restore

→ Backend :
  state: "TRASHED" → "REALIZED"
  trashed_at: null
  Recalcule soldes
```

---

#### US-7.3 : Annuler une transaction (différent de supprimer)
```
En tant qu'utilisateur,
Je veux marquer une transaction comme annulée,
Afin de garder trace qu'elle était prévue mais ne s'est pas produite.
```

**Différence :**
- **TRASHED** : invisible (dans corbeille)
- **CANCELLED** : visible mais barrée

**Flux :**
```
PATCH /api/transactions/tx_netflix/cancel
{ reason: "Abonnement résilié" }

→ Backend :
  state: "PROJECTED" → "CANCELLED"
  cancelled_at: NOW()
  cancellation_reason: "Abonnement résilié"
  
Timeline affiche :
✗ -80€ Netflix (Annulé)
  Raison: Abonnement résilié
```

---

### EPIC 8 : Export PDF

#### US-8.1 : Exporter un rapport mensuel en PDF
```
En tant qu'utilisateur,
Je veux exporter un rapport PDF de mes finances du mois,
Afin de l'archiver ou le partager. 
```

**Critères d'acceptation :**
- [ ] Génération PDF pour un mois donné
- [ ] Contenu : transactions, solde début/fin, dépenses par catégorie
- [ ] Téléchargement automatique

**Flux :**
```
POST /api/exports/pdf
{
  household_id: "h3",
  month: "2025-11",
  include_projections: false
}

→ Backend :
  1. Récupère données du mois
  2. Génère PDF (PDFKit/Puppeteer)
  3.  Stocke temporairement
  4. Retourne URL de téléchargement

→ Response :
{
  download_url: "/api/exports/download/abc123",
  filename: "DuoFlow_Novembre_2025.pdf",
  expires_at: "2025-11-26T12:00:00Z"
}
```

---

## 🗄️ Modèle de Données

### Table: users
```sql
users {
  id: UUID PRIMARY KEY
  
  first_name: STRING (prénom)
  last_name: STRING (nom)
  display_name: STRING (= first_name par défaut)
  
  email: STRING UNIQUE
  password_hash: STRING
  
  household_id: UUID → households. id
  
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Table: households
```sql
households {
  id: UUID PRIMARY KEY
  type: ENUM('INDIVIDUAL', 'COUPLE')
  status: ENUM('ACTIVE', 'ARCHIVED', 'MERGED_INTO_COUPLE')
  
  owner_id: UUID → users.id
  partner_id: UUID → users.id (nullable)
  
  created_at: TIMESTAMP
  archived_at: TIMESTAMP (nullable)
  archived_by: UUID → users.id (nullable)
  
  created_from: UUID[] (IDs anciens households si fusion)
  created_from_archived: UUID (si créé après dissolution)
}
```

### Table: household_memberships
```sql
household_memberships {
  id: UUID PRIMARY KEY
  user_id: UUID → users.id
  household_id: UUID → households.id
  
  joined_at: TIMESTAMP
  left_at: TIMESTAMP (nullable)
  
  role: ENUM('OWNER', 'PARTNER')
}
```

### Table: accounts
```sql
accounts {
  id: UUID PRIMARY KEY
  household_id: UUID → households.id
  user_id: UUID → users.id
  
  name: STRING (ex: "Boursorama Courant")
  type: ENUM('CHECKING', 'SAVINGS', 'CREDIT_CARD')
  institution: STRING (ex: "Boursorama")
  
  initial_balance: DECIMAL
  current_balance: DECIMAL (calculé)
  
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Table: transactions
```sql
transactions {
  id: UUID PRIMARY KEY
  household_id: UUID → households.id
  account_id: UUID → accounts.id
  
  type: ENUM('INCOME', 'EXPENSE')
  frequency_type: ENUM('ONE_TIME', 'RECURRING')
  
  name: STRING
  description: TEXT (nullable)
  amount: DECIMAL
  date: DATE
  
  state: ENUM('REALIZED', 'PENDING', 'PROJECTED', 'CANCELLED', 'TRASHED')
  
  owner_type: ENUM('PERSONAL', 'SHARED')
  owner_id: UUID → users.id (nullable si SHARED)
  
  category_id: UUID → categories.id
  template_id: UUID → recurring_templates.id (nullable)
  
  created_by: UUID → users.id
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  
  confirmed_at: TIMESTAMP (nullable)
  confirmed_by: UUID → users. id (nullable)
  modified: BOOLEAN
  
  cancelled_at: TIMESTAMP (nullable)
  cancelled_by: UUID → users.id (nullable)
  cancellation_reason: TEXT (nullable)
  
  trashed_at: TIMESTAMP (nullable)
  trashed_by: UUID → users.id (nullable)
  trashed_reason: TEXT (nullable)
}
```

### Table: transaction_splits
```sql
transaction_splits {
  id: UUID PRIMARY KEY
  transaction_id: UUID → transactions.id
  user_id: UUID → users.id
  
  amount: DECIMAL
  percentage: DECIMAL (ex: 50. 00 pour 50%)
  
  created_at: TIMESTAMP
}
```

### Table: recurring_templates
```sql
recurring_templates {
  id: UUID PRIMARY KEY
  household_id: UUID → households.id
  account_id: UUID → accounts.id
  
  name: STRING
  type: ENUM('INCOME', 'EXPENSE')
  amount: DECIMAL
  category_id: UUID → categories.id
  
  frequency: ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')
  day_of_week: INT (nullable, 1-7)
  day_of_month: INT (nullable, 1-31)
  custom_interval_days: INT (nullable)
  
  start_date: DATE (OBLIGATOIRE)
  end_date: DATE (nullable)
  
  owner_type: ENUM('PERSONAL', 'SHARED')
  owner_id: UUID → users. id (nullable)
  
  projection_horizon_months: INT (défaut: 24)
  last_generated_until: DATE
  
  active: BOOLEAN
  created_by: UUID → users.id
  created_at: TIMESTAMP
}
```

### Table: categories
```sql
categories {
  id: UUID PRIMARY KEY
  household_id: UUID → households.id
  
  name: STRING
  parent_id: UUID → categories.id (nullable)
  type: ENUM('EXPENSE', 'INCOME')
  
  color: STRING
  icon: STRING
  
  monthly_budget: DECIMAL (nullable)
  
  created_at: TIMESTAMP
}
```

### Table: invitations
```sql
invitations {
  id: UUID PRIMARY KEY
  
  inviter_id: UUID → users.id
  invitee_email: STRING
  invitee_user_id: UUID → users.id (nullable)
  
  type: ENUM('NEW_USER', 'EXISTING_USER')
  status: ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')
  
  invitation_code: STRING (ex: "DUO-XKJH-9823")
  token: UUID
  
  created_at: TIMESTAMP
  expires_at: TIMESTAMP
  accepted_at: TIMESTAMP (nullable)
}
```

### Table: notifications
```sql
notifications {
  id: UUID PRIMARY KEY
  user_id: UUID → users.id
  
  type: ENUM('HOUSEHOLD_INVITATION', 'TRANSACTION_VALIDATION', 'ALERT', 'SYSTEM')
  
  title: STRING
  message: TEXT
  data: JSONB
  
  action_required: BOOLEAN
  read: BOOLEAN
  dismissed: BOOLEAN
  
  created_at: TIMESTAMP
  read_at: TIMESTAMP (nullable)
}
```

### Table: goals
```sql
goals {
  id: UUID PRIMARY KEY
  household_id: UUID → households.id
  
  name: STRING
  target_amount: DECIMAL
  current_amount: DECIMAL (calculé)
  target_date: DATE
  
  created_by: UUID → users.id
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Table: alerts
```sql
alerts {
  id: UUID PRIMARY KEY
  household_id: UUID → households.id
  
  type: ENUM('NEGATIVE_BALANCE', 'BUDGET_EXCEEDED', 'GOAL_DEADLINE')
  severity: ENUM('INFO', 'WARNING', 'ALERT')
  
  title: STRING
  message: TEXT
  data: JSONB
  
  dismissed: BOOLEAN
  created_at: TIMESTAMP
}
```

---

## 🎨 Wireframes

### 1. Dashboard Principal (Mode Couple)
```
┌──────────────────────────────────────────────────────┐
│ [🏠 DuoFlow]   Notre Foyer Alex & Sarah  [@Alex 👤] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  💰 Solde Total Foyer: 3 450€                        │
│                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐  │
│  │ 👤 Alex     │ │ 👤 Sarah    │ │ 🏠 Commun    │  │
│  │ 1 600€      │ │ 2 500€      │ │ 200€         │  │
│  │ ──────────  │ │ ──────────  │ │ ────────     │  │
│  │ Personnel:  │ │ Personnel:  │ │ 100€ chacun  │  │
│  │ 1 500€      │ │ 2 400€      │ │              │  │
│  │ Commun:     │ │ Commun:     │ │              │  │
│  │ 100€        │ │ 100€        │ │              │  │
│  └─────────────┘ └─────────────┘ └──────────────┘  │
│                                                      │
│  ⏰ Transactions à valider (2)                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🏠 -1200€  Loyer (600€ chacun)  [Valider ✓]   │ │
│  │ 👤 -80€  Netflix (Alex)          [Valider ✓]   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  📊 Projection 6 Mois                                │
│  [Graphique ligne...]                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2. Timeline avec Attribution
```
┌────────────────────────────────────────────────┐
│ 📅 Décembre 2025         Solde fin: 2 250€    │
├────────────────────────────────────────────────┤
│                                                │
│ ⏱ 1er Déc                                      │
│ ┌────────────────────────────────────────────┐ │
│ │ 🏠 -1200€  Loyer mensuel                   │ │
│ │ Commun • 600€ Alex + 600€ Sarah            │ │
│ │ [✓ Valider] [✎ Modifier] [🗑️ Supprimer]   │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ ✓ 5 Déc                                        │
│ ┌────────────────────────────────────────────┐ │
│ │ 👤 -45€  Courses Carrefour                 │ │
│ │ [Alex] Personnel                           │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ ✗ 15 Déc                                       │
│ ┌────────────────────────────────────────────┐ │
│ │ 👤 -80€  Netflix (Annulé)                  │ │
│ │ [Alex] Raison: Abonnement résilié          │ │
│ └────────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### 3.  Modal Ajout Transaction (Foyer)
```
┌────────────────────────────────────────────┐
│  ✨ Nouvelle Transaction                   │
├────────────────────────────────────────────┤
│                                            │
│  Type:                                     │
│  (•) Dépense  ( ) Revenu                   │
│                                            │
│  Attribution: *                            │
│  (•) Moi (Alex)                            │
│  ( ) Partenaire (Sarah)                    │
│  ( ) Commun (50% chacun)                   │
│                                            │
│  Fréquence:                                │
│  (•) Ponctuelle  ( ) Récurrente            │
│                                            │
│  Nom: *                                    │
│  [Courses Carrefour_____________]          │
│                                            │
│  Montant: *                                │
│  [45. 00__________ €]                       │
│                                            │
│  Catégorie: *                              │
│  [Alimentation ▼]                          │
│                                            │
│  Compte: *                                 │
│  [Boursorama Courant ▼]                    │
│                                            │
│  Date: *                                   │
│  [26/11/2025 📅]                           │
│                                            │
│  [Annuler]              [Ajouter ✓]       │
└────────────────────────────────────────────┘
```

### 4.  Page Projection
```
┌────────────────────────────────────────────────────┐
│ ← DuoFlow          Projection Future    [@Alex 👤]│
├────────────────────────────────────────────────────┤
│                                                    │
│ 📊 Projection sur 12 mois                          │
│                                                    │
│  Mois       Revenus  Dépenses  Solde              │
│  ─────────────────────────────────────────────────│
│  Déc 2025   +2500€   -2998€    1950€  ✅         │
│  Jan 2026   +2500€   -2850€    1600€  ✅         │
│  Fév 2026   +2500€   -2100€    2000€  ✅         │
│  Mar 2026   +2500€   -3950€    -250€  ⚠️         │
│                                                    │
│  [Voir détails Mars]                               │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 5. Corbeille
```
┌────────────────────────────────────────────────┐
│ ← DuoFlow          🗑️ Corbeille    [@Alex 👤] │
├────────────────────────────────────────────────┤
│                                                │
│ ⚠️ Les éléments sont conservés 30 jours        │
│                                                │
│ ┌────────────────────────────────────────────┐ │
│ │ 👤 -50€  Essence Total                     │ │
│ │ [Alex] 26/11/2025                          │ │
│ │ Supprimé le 26/11 à 14:30 par Alex         │ │
│ │                                            │ │
│ │ [↺ Restaurer]  [🗑️ Supprimer définitivement]│ │
│ └────────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### 6. Page Paramètres Compte
```
┌────────────────────────────────────────┐
│ ⚙️ Paramètres du Compte                │
├────────────────────────────────────────┤
│                                        │
│ Informations personnelles              │
│                                        │
│ Prénom: *                              │
│ [Alex___________________]              │
│                                        │
│ Nom: *                                 │
│ [Dupont_________________]              │
│                                        │
│ Email: *                               │
│ [alex@example.com_______]              │
│                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                        │
│ Changer le mot de passe                │
│                                        │
│ Mot de passe actuel:                   │
│ [___________________] 👁️              │
│                                        │
│ Nouveau mot de passe:                  │
│ [___________________] 👁️              │
│                                        │
│ [Annuler]         [Enregistrer ✓]     │
└────────────────────────────────────────┘
```

---

## 🔄 Job Quotidien

### DailyMaintenanceJob

**Heure d'exécution** : 06:00 (Europe/Paris)  
**Déclencheur** : Google Cloud Scheduler

**Tâches effectuées :**

1. **Validation des transactions du jour**
   - Trouve toutes transactions où `date = TODAY` et `state = PROJECTED`
   - Change état `PROJECTED` → `PENDING`
   - Crée notifications pour tous membres des foyers concernés

2. **Génération des projections manquantes**
   - Pour chaque `RecurringTemplate` actif
   - Vérifie si projections manquent (horizon 24 mois)
   - Génère nouvelles transactions `PROJECTED`

3. **Nettoyage de la corbeille**
   - Trouve transactions `TRASHED` depuis plus de 30 jours
   - Suppression définitive (DELETE)

**Code pseudocode :**
```javascript
async function dailyMaintenanceJob() {
  // 1. Transitions PROJECTED → PENDING
  const today = new Date();
  const transactions = await db.transactions.findMany({
    where: { date: today, state: 'PROJECTED' }
  });
  
  for (const tx of transactions) {
    await db.transactions.update({
      where: { id: tx.id },
      data: { state: 'PENDING' }
    });
  }
  
  // Créer notifications groupées par household
  // ... 
  
  // 2. Génération projections
  const templates = await db.recurringTemplates.findMany({
    where: { active: true }
  });
  
  for (const template of templates) {
    const targetDate = addMonths(today, template.projection_horizon_months);
    if (template.last_generated_until < targetDate) {
      await generateProjections(template, template.last_generated_until, targetDate);
    }
  }
  
  // 3. Nettoyage corbeille
  const thirtyDaysAgo = subDays(today, 30);
  await db.transactions.deleteMany({
    where: {
      state: 'TRASHED',
      trashed_at: { lt: thirtyDaysAgo }
    }
  });
  
  return { success: true };
}
```

**Configuration Cloud Scheduler :**
```bash
gcloud scheduler jobs create http daily-maintenance \
  --schedule="0 6 * * *" \
  --time-zone="Europe/Paris" \
  --uri="https://your-backend. run.app/api/jobs/daily-maintenance" \
  --http-method=POST \
  --oidc-service-account-email="scheduler@project. iam.gserviceaccount. com"
```

---

## 🔐 Sécurité & Validation

### Règles de validation

**Inscription :**
- `first_name` : min 2 caractères, requis
- `last_name` : min 2 caractères, requis
- `email` : format valide, unique
- `password` : min 8 caractères, 1 majuscule, 1 chiffre

**Transactions :**
- `name` : requis, min 3 caractères
- `amount` : requis, ≠ 0
- `date` : format valide
- `category_id` : doit exister
- `account_id` : doit appartenir au household

**Invitations :**
- Expire après 7 jours
- Code unique (12 caractères alphanumériques)
- 1 invitation active max par couple d'utilisateurs

### Permissions

**Household INDIVIDUAL :**
- User peut tout voir/modifier dans son household

**Household COUPLE :**
- Les 2 membres peuvent tout voir
- Les 2 membres peuvent créer/modifier/supprimer transactions
- N'importe quel membre peut dissoudre le foyer

**Household ARCHIVED :**
- Lecture seule pour anciens membres
- Aucune modification possible
- Export PDF autorisé

---

## 📊 Calculs Clés

### Solde Actuel
```javascript
function calculateCurrentBalance(household_id) {
  const accounts = getAccounts(household_id);
  const transactions = getTransactions(household_id, {
    states: ['REALIZED'],
    upTo: today
  });
  
  return sum(accounts.map(a => a.initial_balance)) + 
         sum(transactions.map(t => t.amount));
}
```

### Solde Projeté
```javascript
function calculateProjectedBalance(household_id, targetDate) {
  const currentBalance = calculateCurrentBalance(household_id);
  const futureTransactions = getTransactions(household_id, {
    states: ['PROJECTED', 'PENDING'],
    from: today,
    to: targetDate
  });
  
  return currentBalance + sum(futureTransactions.map(t => t.amount));
}
```

### Split de Transaction Commune
```javascript
function splitTransaction(transaction, users) {
  const splitRule = transaction.split_rule || { type: 'EQUAL' };
  
  if (splitRule.type === 'EQUAL') {
    const amountPerUser = transaction.amount / users.length;
    return users.map(user => ({
      user_id: user.id,
      amount: amountPerUser,
      percentage: 100 / users.length
    }));
  }
  
  // Support pour splits custom (ex: 70/30)
  // ... 
}
```

---

## 🎨 États des Transactions

| État | Description | Visible Timeline | Impacte Solde | Modifiable |
|------|-------------|------------------|---------------|------------|
| **REALIZED** | Transaction passée confirmée | ✅ Oui | ✅ Oui | ✅ Oui |
| **PENDING** | En attente de validation (jour J) | ✅ Oui | ❌ Non | ✅ Oui |
| **PROJECTED** | Projection future | ✅ Oui | ⚠️ Solde projeté | ✅ Oui |
| **CANCELLED** | Annulée (visible barrée) | ✅ Oui (barrée) | ❌ Non | ❌ Non |
| **TRASHED** | Dans la corbeille | ❌ Non | ❌ Non | ✅ Restaurable |

---

## 📈 Métriques & KPIs

**À calculer pour le dashboard :**
- Solde actuel total
- Solde projeté 1/3/6/12 mois
- Dépenses du mois en cours
- Revenus du mois en cours
- % budget consommé par catégorie
- Nombre de transactions en attente
- Nombre d'alertes actives
- Progression objectifs d'épargne

---

## ✅ Validation Finale

**Version** : 1.0  
**Date** : 26 Novembre 2025  
**Statut** : Spécifications validées ✅  

**Prochaines étapes :**
1. Stack technique & architecture
2. CI/CD & déploiement
3. Planning des sprints
4. Développement

---

**Fin du document de spécifications**