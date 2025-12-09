# DuoFlow Finance - Sprint Planning (Feature-Driven)

## 📅 Stratégie de Développement

### **Approche Feature-Driven**

```
PRINCIPE : Chaque sprint = 1 fonctionnalité complète (Front + Back + Tests E2E)

Pour chaque fonctionnalité :
├─ Backend : API + Services + Tests unitaires
├─ Frontend : UI + Composants + Intégration
├─ Tests E2E : Playwright (user stories)
└─ CI : Lint + Tests unitaires + Tests E2E

PHASES DU PROJET :
├─ PHASE 1 : Développement Features (Sprints 0-8) - 17 semaines
│   └─ Tout en local (Docker Compose)
├─ PHASE 2 : Infrastructure & Staging (Sprint 9) - 2 semaines
│   └─ Terraform + déploiement GCP staging
└─ PHASE 3 : Production (Sprint 10) - 1 semaine
    └─ Release production + monitoring
```

---

## 📊 Timeline Globale

| Phase | Sprints | Durée | Focus |
|-------|---------|-------|-------|
| **Dev Features** | Sprint 0-8 | 17 semaines | Features complètes (Front+Back+E2E) |
| **Staging** | Sprint 9 | 2 semaines | Terraform + Déploiement |
| **Production** | Sprint 10 | 1 semaine | Release |

**Total : 20 semaines (~5 mois)**

---

## 🏗️ SPRINT 0 : Setup Environnement (1 semaine)

### **Objectif**
Environnement de développement local + CI + Playwright opérationnels

### **Livrables**
✅ Backend FastAPI + PostgreSQL + Redis (Docker Compose)  
✅ Frontend Next.js  
✅ CI GitHub Actions (lint + tests unitaires)  
✅ Playwright configuré (tests E2E de base)  
✅ Documentation README

### **Tâches Backend**
- [ ] Initialiser projet Python (structure dossiers complète)
- [ ] Installer dépendances (FastAPI, SQLAlchemy, Redis, pytest, etc.)
- [ ] Docker Compose (PostgreSQL 15 + Redis 7)
- [ ] Configuration `. env. example` (DATABASE_URL, REDIS_URL, JWT_SECRET)
- [ ] FastAPI base (endpoints `/health`, `/docs`)
- [ ] Connection PostgreSQL + Redis testée
- [ ] Tests unitaires de base (pytest)

### **Tâches Frontend**
- [ ] Créer projet Next.js 15 (App Router + TypeScript + Tailwind)
- [ ] Installer dépendances (TanStack Query, Zustand, Zod, React Hook Form)
- [ ] Installer Shadcn/ui (Button, Card, Input, Dialog, Toast)
- [ ] Configuration `. env.local. example` (NEXT_PUBLIC_API_URL)
- [ ] Page `/` avec "Hello DuoFlow"
- [ ] Configuration Axios (base URL backend)

### **Tâches Playwright**
- [ ] Installer Playwright (`npm init playwright@latest`)
- [ ] Configuration `playwright.config.ts` :
  - Base URL : `http://localhost:3000`
  - Browsers : Chromium, Firefox, WebKit
  - Screenshot on failure
  - Video on failure
- [ ] Premier test E2E : "Homepage loads"
- [ ] Scripts npm : `npm run test:e2e`, `npm run test:e2e:ui`

### **Tâches CI/CD**
- [ ] Workflow `ci. yml` (branch `develop`) :
  - Backend : lint (ruff, black) + type check (mypy) + tests (pytest)
  - Frontend : lint + type check + build
  - Playwright : tests E2E (après build)
- [ ] Services Docker dans CI (PostgreSQL + Redis)

---

## 🔐 SPRINT 1 : Feature Authentification (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
Système d'authentification complet (inscription, connexion, profil)

### **User Stories**
- ✅ **US-1.1** : Créer un compte individuel (prénom, nom, email, password)
- ✅ **US-6.1** : Se déconnecter
- ✅ **US-6.2** : Modifier ses informations personnelles
- ✅ **US-6.2b** : Changer son mot de passe

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- ✅ Modèles SQLAlchemy : `User`, `Household`, `HouseholdMembership`
- ✅ Migration Alembic initiale (fa5047995e9d)
- ✅ Seeds données de test

**Services**
- ✅ `auth_service.py` :
  - Hash/verify password (bcrypt 4.0.1)
  - Create/verify JWT tokens (access 15min, refresh 7j)
  - Register user (créer user + household INDIVIDUAL)
  - Login (retourner tokens)
  - Logout (blacklist token Redis)
  - Refresh token
- ✅ `user_service.py` :
  - Get user profile
  - Update user info
  - Update password

**Endpoints API**
- ✅ `POST /api/v1/auth/register`
- ✅ `POST /api/v1/auth/login`
- ✅ `POST /api/v1/auth/logout`
- ✅ `POST /api/v1/auth/refresh`
- ✅ `GET /api/v1/users/me`
- ✅ `PATCH /api/v1/users/me`
- ✅ `PATCH /api/v1/users/me/password`

**Tests Unitaires Backend**
- ✅ Tests `auth_service` (hash, verify, tokens)
- ✅ Tests endpoints auth (register, login, logout)
- ✅ Tests sécurité (email unique, password strength)
- ✅ Tests blacklist Redis
- ✅ Coverage: **17/17 tests GREEN** (100%)

### **Tâches Frontend (Jour 6-10)**

**Schemas Zod**
- ✅ `registerSchema`, `loginSchema`, `profileSchema`, `passwordSchema`

**Pages & Layouts**
- ✅ Layout principal avec Sidebar (desktop) et BottomNav (mobile)
- ✅ Page `/login`
- ✅ Page `/register` (champs prénom + nom)
- ✅ Page `/dashboard` (affichage user data)
- ✅ Page `/settings-profile`
- ✅ ProtectedRoute component

**Composants**
- ✅ `<LoginForm>` (React Hook Form + Zod)
- ✅ `<RegisterForm>`
- ✅ `<Layout>` avec Sidebar/BottomNav (bouton Plus → Déconnexion/Profil)
- ✅ `<ProfileForm>`
- ✅ `<PasswordForm>`

**State & API**
- ✅ Store Zustand `authStore` (user, tokens, login, logout, register, updateProfile, changePassword)
- ✅ API calls avec fetch (base URL: http://localhost:8000)
- ✅ ProtectedRoute avec redirection vers `/login`

**Validation & UX**
- ✅ Messages d'erreur FR
- ✅ Toast notifications (Sonner)
- ✅ Loading states
- ✅ Validation Zod

### **Tests Manuels Validés** ✅

**Tests User Stories**
- ✅ **US-1.1** : Inscription complète → auto-login → dashboard
- ✅ **US-6.1** : Déconnexion via bouton "Plus" → redirection `/login`
- ✅ **US-6.2** : Modification profil → affichage nom mis à jour
- ✅ **US-6.2b** : Changement mot de passe → ancien mot de passe ne fonctionne plus
- ✅ **Login** : Connexion avec email/password → dashboard
- ✅ **Protection routes** : Accès `/dashboard` sans auth → redirection `/login`

**Notes**
- ⏸️ Tests E2E Playwright : **Reportés en fin de projet**
- ✅ Tests unitaires backend : **17/17 GREEN**
- ✅ Validation manuelle : **100% fonctionnel**

### **Livrables Sprint 1**
✅ Feature auth complète (Front + Back)  
✅ Tests unitaires backend 100% (17/17)  
✅ Validation manuelle complète (6 scénarios)  
✅ CORS configuré (allow_origins=["*"])  
✅ Fix bcrypt compatibility (downgrade 4.0.1)

---

## 🏦 SPRINT 2 : Feature Comptes & Catégories (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
CRUD complets pour comptes bancaires et catégories avec structure arborescente

### **User Stories**
- ✅ **US-6.3a** : Créer un compte bancaire (6 types disponibles)
- ✅ **US-6.3b** : Modifier un compte bancaire
- ✅ **US-6.3c** : Supprimer un compte bancaire
- ✅ **US-CAT-1** : Créer une catégorie (revenus/dépenses)
- ✅ **US-CAT-2** : Modifier une catégorie
- ✅ **US-CAT-3** : Supprimer une catégorie

### **Tâches Backend (Jour 1-5)** ✅ **COMPLÉTÉ**

**Base de Données**
- ✅ Modèles : `Account` (6 types: CHECKING, SAVINGS, INVESTMENT, LOAN, CASH, OTHER)
- ✅ Modèles : `Category` (structure arborescente avec parent_id)
- ✅ Migration Alembic (aaf64e976741)
- ✅ Relations Household → accounts, categories (cascade delete)

**Services**
- ✅ `account_service.py` (CRUD + calculate_balance + household isolation)
- ✅ `category_service.py` (CRUD + get_tree + subcategories)

**Endpoints API**
- ✅ CRUD `/api/v1/accounts` (POST, GET, GET/:id, PATCH, DELETE)
- ✅ CRUD `/api/v1/categories` (POST, GET, GET/:id, PATCH, DELETE)
- ✅ GET `/api/v1/categories/tree` (structure hiérarchique)

**Tests Unitaires**
- ✅ Tests CRUD comptes (9 tests)
- ✅ Tests CRUD catégories (11 tests)
- ✅ Test isolation household
- ✅ Test création sous-catégories
- ✅ **39/39 tests GREEN** (Coverage >90%)

### **Tâches Frontend (Jour 6-10)** ✅ **COMPLÉTÉ**

**Pages**
- ✅ Page `/accounts` (liste + grille cartes avec soldes)
- ✅ Page `/categories` (liste hiérarchique avec filtres)

**Composants**
- ✅ AccountsPage avec modal création/édition
- ✅ CategoriesPage avec structure arborescente
- ✅ Modals avec validation formulaires
- ✅ Color picker pour catégories (10 couleurs)
- ✅ Icon picker pour catégories (16 icônes)

**Services API TypeScript**
- ✅ `accountService.ts` (CRUD complet)
- ✅ `categoryService.ts` (CRUD + tree structure)

**Types TypeScript**
- ✅ Types `Account`, `AccountType`, `AccountCreate`, `AccountUpdate`
- ✅ Types `Category`, `CategoryType`, `CategoryCreate`, `CategoryUpdate`
- ✅ Enums et labels traduits en français

**Styles**
- ✅ `Accounts.css` (cartes responsive, animations, ~300 lignes)
- ✅ `Categories.css` (arborescence, color/icon pickers, ~300 lignes)
- ✅ Variables CSS globales (--card-bg, --text-primary, etc.)
- ✅ Système boutons (.btn, .btn-primary, .btn-secondary, .btn-danger)

### **Bugs Corrigés** ✅

**Authentication & Persistence**
- ✅ **Bug localStorage** : Tokens sauvegardés dans Zustand mais pas dans localStorage
  - Fix: Ajout `localStorage.setItem()` dans login/register
  - Fix: Ajout `localStorage.removeItem()` dans logout
- ✅ **Bug session refresh** : Utilisateur déconnecté à chaque rechargement de page
  - Fix: Modification `checkAuth()` pour lire localStorage en priorité
  - Fix: Ajout état `isChecking` dans `ProtectedRoute` pour éviter redirection prématurée
  - Fix: Synchronisation localStorage ↔ Zustand state au démarrage

**Display & Business Logic**
- ✅ **Bug calculateTotalBalance** : `toFixed is not a function`
  - Cause: API retourne `initial_balance` en string (Decimal serialization)
  - Fix: Ajout `Number()` conversion dans calculs et affichage
- ✅ **Session duration** : Sessions trop courtes (15 minutes)
  - Fix: `ACCESS_TOKEN_EXPIRE_MINUTES` passé de 15 à 60 minutes
- ✅ **Business rule** : Solde initial modifiable en édition (incorrect)
  - Clarification: `initial_balance` = snapshot historique (immutable)
  - Fix UI: Champ "Solde initial" uniquement en création
  - Fix UI: Champ "Solde actuel" (read-only) en édition
  - Backend déjà correct: `AccountUpdate` sans `initial_balance`

**Docker & Development**
- ⚠️ **Vite HMR** : Hot Module Replacement ne fonctionne pas toujours
  - Cause: Docker volume sync issues
  - Workaround: Redémarrer container frontend (`docker-compose restart frontend`)

### **Tests Manuels Validés** ✅

**Comptes (Accounts)**
- ✅ Création compte avec 6 types disponibles
- ✅ Affichage liste comptes avec soldes formatés
- ✅ Calcul total correct (somme tous les comptes)
- ✅ Modification nom/type compte (balance non modifiable ✓)
- ✅ Suppression compte avec confirmation
- ✅ Formulaires conditionnels (create vs edit)

**Catégories (Categories)**
- ✅ Création catégories revenus/dépenses
- ✅ Création sous-catégories (structure arborescente)
- ✅ Color picker (10 couleurs)
- ✅ Icon picker (16 icônes)
- ✅ Filtres ALL/INCOME/EXPENSE
- ✅ Modification catégorie
- ✅ Suppression catégorie

**Authentication**
- ✅ Session persiste après rechargement page
- ✅ Token valide 60 minutes
- ✅ Redirection correcte (protected routes)
- ✅ Déconnexion nettoie localStorage

### **Livrables Sprint 2** ✅

✅ Feature comptes & catégories complète (Backend + Frontend)  
✅ Tests unitaires backend : **39/39 GREEN (100%)**  
✅ Interface utilisateur responsive et intuitive  
✅ Isolation données par household  
✅ Structure arborescente catégories fonctionnelle  
✅ Tous les bugs critiques corrigés  
✅ Session persistence fonctionnelle  
✅ Business rules correctement implémentées  
⏸️ Tests E2E Playwright (reportés fin de projet)

### **Résumé Technique Sprint 2**

**Backend:**
- 2 nouveaux modèles (Account, Category)
- 1 migration (aaf64e976741)
- 2 services (AccountService, CategoryService)
- 2 routers API (accounts.py, categories.py)
- 20 nouveaux tests (9 accounts + 11 categories)
- Relations cascade et isolation household
- JWT config: 60 min access token, 7 days refresh token

**Frontend:**
- 2 nouvelles pages (AccountsPage, CategoriesPage)
- 2 services API (accountService, categoryService)
- 6 types TypeScript complets
- 2 fichiers CSS (~600 lignes total)
- Formulaires avec validation
- Pickers interactifs (couleur, icône)
- Fix persistence: authStore + localStorage sync
- Fix ProtectedRoute: async auth check avec loading state

**Statistiques:**
- Backend: +800 lignes Python
- Frontend: +1200 lignes TypeScript/CSS
- Tests: 39 tests (17 Sprint 1 + 20 Sprint 2)
- Migration: 1 nouvelle migration Alembic
- Bugs corrigés: 5 majeurs (auth, display, business logic)
- Durée: 2 semaines

**Prochaines Étapes:**
- Sprint 3: Transactions (CRUD + timeline + corbeille)
- Playwright E2E tests (fin de projet)

---

## 💸 SPRINT 3 : Feature Transactions Ponctuelles (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
Transactions ponctuelles + timeline + corbeille + soft delete

### **User Stories**
- ✅ **US-3.1a** : Ajouter transaction ponctuelle passée
- ✅ **US-3.1b** : Ajouter transaction ponctuelle future
- ✅ **US-3.1c** : Modifier transaction
- ✅ **US-3.2** : Supprimer transaction (soft delete)
- ✅ **US-7.1** : Voir corbeille
- ✅ **US-7.2** : Restaurer transaction depuis corbeille
- ✅ **US-TIMELINE-1** : Voir timeline mensuelle

### **Tâches Backend (Jour 1-5)** ✅ **COMPLÉTÉ**

**Base de Données**
- ✅ Modèle `Transaction` (complet avec états)
- ✅ Enums : `TransactionState`, `TransactionType`, `OwnerType`
- ✅ Migration Alembic (a0c1229894fe)
- ✅ Relations: Transaction → Account, Category, User (FK RESTRICT)

**Services**
- ✅ `transaction_service.py` (CRUD + soft delete + restore)
- ✅ `account_service.py` (calculate_balance, close_account)

**Endpoints API**
- ✅ CRUD `/api/v1/transactions`
- ✅ `GET /api/v1/transactions/trash`
- ✅ `PATCH /api/v1/transactions/:id/restore`
- ✅ `DELETE /api/v1/transactions/:id/permanent`
- ✅ All account endpoints return `current_balance`

**Tests Unitaires**
- ✅ Tests états selon date (passée=REALIZED, future=PROJECTED)
- ✅ Tests soft delete + restore
- ✅ **69/69 tests GREEN** (Coverage 100%)

### **Tâches Frontend (Jour 6-10)** ✅ **COMPLÉTÉ**

**Pages**
- ✅ Page `/timeline` (vue mensuelle avec CRUD complet)
- ✅ Page `/trash` (liste transactions supprimées)
- ✅ AccountsPage (ajout toggle comptes fermés)

**Composants**
- ✅ `<TimelineHeader>`, `<MonthSelector>`, `<TransactionList>`, `<TransactionItem>`
- ✅ `<AddTransactionModal>`, `<EditTransactionModal>`, `<DeleteTransactionDialog>`
- ✅ `<TrashList>`, `<TrashItem>`
- ✅ Toggle "Afficher les comptes fermés" avec checkbox

**Services TypeScript**
- ✅ `transactionService.ts` (CRUD + trash + restore)
- ✅ `accountService.ts` (getAccounts avec includeInactive)

**Styles**
- ✅ `Timeline.css` (~400 lignes)
- ✅ `Trash.css` (~200 lignes)
- ✅ `Accounts.css` (ajout .closed-label, .toggle-inactive)

### **Bugs Corrigés** ✅

**Bug 1: Solde du mois en valeur absolue**
- ✅ Cause: `calculateTotalsByType()` utilisait `Math.abs()` sur les dépenses
- ✅ Fix: Supprimé Math.abs() pour conserver montants négatifs (somme algébrique)
- ✅ Fix UI: Supprimé Math.abs() dans affichage TimelinePage
- ✅ Résultat: Revenus (+) + Dépenses (-) = Solde correct

**Bug 2: Solde compte bancaire non mis à jour**
- ✅ Cause: API retournait uniquement `initial_balance` (statique)
- ✅ Fix: Implémenté `calculate_balance()` → `initial_balance + SUM(transactions)`
- ✅ Fix: Tous les endpoints `/accounts` retournent `current_balance`
- ✅ Fix Frontend: Ajout champ `current_balance` dans types + affichage
- ✅ Résultat: Solde dynamique reflétant toutes les transactions

**Bug 3: Erreur suppression compte avec transactions**
- ✅ Cause initiale: FK CASCADE → PostgreSQL IntegrityError
- ✅ Solution architecturale: Soft delete au lieu de hard delete
- ✅ Migration 20aec2232f0d: Ajout `closed_at` column (timestamp)
- ✅ Migration 8e5424c970e7: FK constraints CASCADE → RESTRICT
- ✅ Service: `close_account()` → set `is_active=false` + `closed_at=NOW()`
- ✅ API: DELETE endpoint fait soft delete (préserve historique)
- ✅ Frontend: Badge "Fermé le DD/MM/YYYY", button "Fermer" au lieu de "Supprimer"
- ✅ UX: Toggle checkbox pour afficher/masquer comptes fermés (default: visible)
- ✅ Résultat: Transactions préservées, historique intact, conformité business

### **Enhancements Sprint 3** ✅

**Soft Delete System (Accounts)**
- ✅ Database: `closed_at` timestamp (NULL = active, DATE = closed)
- ✅ Constraints: RESTRICT prevents accidental cascade deletion
- ✅ Business Logic: Users can close bank accounts without losing transaction history
- ✅ UI: Clear distinction (gray cards, badges, conditional buttons)
- ✅ Visibility Control: User toggle to show/hide closed accounts

**Dynamic Balance Calculation**
- ✅ Real-time calculation: `initial_balance + SUM(non-deleted transactions)`
- ✅ Consistent across all account endpoints
- ✅ Frontend displays accurate current balance

**Algebraic Balance Display**
- ✅ Timeline month balance: proper algebraic sum (income + expenses)
- ✅ Expense amounts preserved as negative values
- ✅ Correct financial calculations throughout app

### **Tests Manuels Validés** ✅

**Transactions (User Stories)**
- ✅ **US-3.1a**: Ajouter transaction passée → état REALIZED
- ✅ **US-3.1b**: Ajouter transaction future → état PROJECTED
- ✅ **US-3.1c**: Modifier transaction (montant, nom, catégorie, compte)
- ✅ **US-3.2**: Supprimer transaction → soft delete vers corbeille
- ✅ **US-7.1**: Voir corbeille avec liste transactions supprimées
- ✅ **US-7.2**: Restaurer transaction depuis corbeille
- ✅ **US-TIMELINE-1**: Navigation timeline (mois précédent/suivant)

**Bug Fixes**
- ✅ Bug 1: Balance calculation (algebraic sum) → validated
- ✅ Bug 2: Dynamic account balance → validated
- ✅ Bug 3: Soft delete accounts → validated with toggle

**Soft Delete UX**
- ✅ Close account → badge "Fermé le [date]" appears
- ✅ Closed account has no action buttons (shows "Compte fermé")
- ✅ Toggle checkbox shows/hides closed accounts
- ✅ Transactions from closed account visible in Timeline
- ✅ Confirmation dialog explains history preservation

### **Livrables Sprint 3** ✅

✅ Feature transactions ponctuelles complète (Front + Back)  
✅ Timeline interactive avec CRUD  
✅ Corbeille fonctionnelle (soft delete + restore)  
✅ Tests unitaires backend: **69/69 GREEN (100%)**  
✅ Soft delete system for accounts (database + API + UI)  
✅ 2 migrations Alembic (closed_at + FK constraints)  
✅ 3 bugs critiques corrigés (balance, account balance, deletion)  
✅ Validation manuelle complète (10 scénarios)  
⏸️ Tests E2E Playwright (reportés fin de projet)

### **Résumé Technique Sprint 3**

**Backend:**
- 1 nouveau modèle (Transaction)
- 3 enums (TransactionState, TransactionType, OwnerType)
- 3 migrations (a0c1229894fe, 20aec2232f0d, 8e5424c970e7)
- 2 services (TransactionService, calculate_balance)
- 1 router API (transactions.py)
- 30 nouveaux tests (39 Sprint 1+2 + 30 Sprint 3 = 69 total)
- Soft delete pattern: closed_at + is_active
- FK constraints: CASCADE → RESTRICT (data integrity)

**Frontend:**
- 2 nouvelles pages (TimelinePage, TrashPage)
- 1 page modifiée (AccountsPage avec toggle)
- 1 service API (transactionService.ts)
- 8 types TypeScript (Transaction, TransactionCreate, etc.)
- 2 fichiers CSS (~600 lignes total)
- Formulaires avec validation
- Toggle checkbox pour comptes fermés
- Badges et styling pour soft delete

**Bug Fixes:**
- Bug 1: calculateTotalsByType() + TimelinePage display
- Bug 2: calculate_balance() + API endpoints + frontend types
- Bug 3: Migrations + close_account() + UI refactor (350+ lines)

**Statistiques:**
- Backend: +1200 lignes Python
- Frontend: +1500 lignes TypeScript/CSS
- Tests: 69 tests (17 Sprint 1 + 20 Sprint 2 + 32 Sprint 3)
- Migrations: 3 nouvelles (1 transactions + 2 soft delete)
- Bugs corrigés: 3 critiques (architecture, business logic, calculations)
- Durée: 2 semaines + 1 jour bug fixes

**Prochaines Étapes:**
- Sprint 4: Récurrences & Projections
- Playwright E2E tests (fin de projet)

---

## 🔁 SPRINT 4 : Feature Récurrences & Projections (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
Transactions récurrentes + projections 12 mois avec génération immédiate

### **User Stories**
- ✅ **US-3.1d** : Créer transaction récurrente (génère 12 mois immédiatement)
- ✅ **US-3.3a** : Modifier récurrence sur période
- ✅ **US-3.3b** : Annuler/Supprimer récurrence (3 options : unique, période, toutes)
- ✅ **US-5.1** : Voir graphiques projection 12 mois
- ✅ **US-5.2** : Voir détail mois projeté

### **Architecture Simplifiée**
**Principe** : Pas de jobs de matérialisation, création immédiate des transactions
- Template créé → 12 mois de Transaction générées instantanément
- Transactions liées via `recurring_template_id` (FK CASCADE)
- Suppression intelligente : unique, période, ou toutes occurrences

### **Tâches Backend (Jour 1-5)** ✅ **COMPLÉTÉ**

**Base de Données**
- ✅ Modèle `RecurringTemplate` (name, amount, frequency, start_date, end_date)
- ✅ Enum `Frequency` (WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM)
- ✅ Migration `8efa0691944c` : Add RecurringTemplate model
- ✅ Migration `acf8a934b57a` : Add recurring_template_id FK à Transaction (CASCADE)

**Services**
- ✅ `recurring_template_service.py` :
  - create_template() : Crée template + génère 12 mois de transactions
  - _generate_transactions() : Boucle sur get_next_occurrence()
  - delete_template() : Supprime template + transactions (CASCADE)
- ✅ `projection_service.py` :
  - generate_projections() : Query transactions réelles (pas de calcul virtuel)
  - calculate_monthly_projection() : initial_balance + sum(past_transactions) + current_month
- ✅ **Supprimé** : recurrence_materializer.py (obsolète)

**Logique Récurrence**
- ✅ Helper `get_next_occurrence()` (handle toutes fréquences)
- ✅ Génération synchrone dans create_template()

**Endpoints API**
- ✅ CRUD `/api/v1/recurring-templates`
- ✅ `POST /api/v1/recurring-templates/:id/bulk-cancel` (suppression période)
- ✅ `POST /api/v1/recurring-templates/:id/bulk-update` (modification période)
- ✅ `GET /api/v1/projections/monthly/:year/:month` (projections par mois)
- ✅ `GET /api/v1/accounts/balance/total` (solde total household)

**Tests Unitaires**
- ✅ Tests génération transactions (12 mois)
- ✅ Tests get_next_occurrence() (toutes fréquences)
- ✅ Tests bulk operations (cancel, update)
- ✅ **93/93 tests GREEN** (Coverage 100%)

### **Tâches Frontend (Jour 6-10)** ✅ **COMPLÉTÉ**

**Pages**
- ✅ Page `/projections` (LineChart + BarChart avec Recharts)
- ✅ Page `/recurring` (CRUD templates avec gestion complète)
- ✅ Modification TimelinePage (badge "Récurrent", modal suppression)

**Composants**
- ✅ `<ProjectionPage>` : LineChart balance + BarChart income/expense + table 12 mois
- ✅ `<RecurringPage>` : Liste templates + modal CRUD
- ✅ `<DeleteRecurringModal>` : 3 options (unique, période, toutes)
- ✅ Modification `<AddTransactionModal>` : Toggle Ponctuelle/Récurrente

**Services TypeScript**
- ✅ `recurringTemplateService.ts` (CRUD + bulkCancel + bulkUpdate)
- ✅ `projectionService.ts` (getProjections)
- ✅ `accountService.ts` (getTotalBalance)

**Hooks & Types**
- ✅ Types `RecurringTemplate`, `Frequency`, `Projection`
- ✅ Type `Transaction.recurring_template_id` (détection récurrentes)

### **Bugs Corrigés** ✅

**Bug 1: Balance calculation manquante**
- ✅ Cause : Projections ne prenaient pas en compte initial_balance
- ✅ Fix : calculate_monthly_projection() inclut Account.initial_balance + sum(all past transactions)

**Bug 2: Timeline affichage montants**
- ✅ Problème 1 : "Solde du mois" au lieu de "Transactions"
- ✅ Fix : Changé label + affiche somme algébrique (totals.balance)
- ✅ Problème 2 : Dépenses affichées en positif (rouge mais +)
- ✅ Fix : formatAmount(Math.abs(transaction.amount)) + CSS gère couleur

**Bug 3: Badge récurrent incorrect**
- ✅ Problème : Affichait fréquence (MONTHLY) au lieu de "Récurrent"
- ✅ Fix : Badge "Récurrent" basé sur recurring_template_id

**Bug 4: Montants récurrents en positif en DB**
- ✅ Cause : Frontend envoyait adjustedAmount (négatif) mais schéma backend exige positif (gt=0)
- ✅ Fix Backend : _generate_transactions() applique signe selon type :
  ```python
  transaction_amount = template.amount if type == INCOME else -abs(template.amount)
  ```
- ✅ Fix Frontend : Envoie toujours Math.abs(formData.amount)

**Bug 5: Modal suppression ne s'affiche pas**
- ✅ Cause : recurring_template_id manquant dans type Transaction
- ✅ Fix : Ajout champ recurring_template_id dans types/transaction.ts
- ✅ Condition : if (transaction.recurring_template_id) → showDeleteModal

**Bug 6: Erreur 422 création récurrence**
- ✅ Cause : Schema Pydantic exige amount > 0, mais frontend envoyait négatif
- ✅ Fix : Frontend envoie positif, backend applique signe

**Bug 7: AttributeError get_accounts_by_household**
- ✅ Fix : Changé vers list_accounts() (méthode correcte)

**Bug 8: TypeScript compilation error**
- ✅ Fix : Type annotation getNext12Months() result array

### **Tests Manuels Validés** ✅

**Récurrences (RecurringPage)**
- ✅ Création template mensuel "Loyer 1500€"
- ✅ Vérification : 12 Transaction records créés en DB
- ✅ Timeline affiche toutes occurrences avec badge "Récurrent"
- ✅ Badge rouge pour dépenses (montants en positif)
- ✅ Suppression unique : Modal 3 options s'affiche
  - ✅ Option 1 : Supprimer cette occurrence uniquement
  - ✅ Option 2 : Supprimer toutes occurrences (template + transactions)
  - ✅ Option 3 : Supprimer sur période (sélection dates)

**Projections (ProjectionPage)**
- ✅ Affichage solde actuel total dans header
- ✅ LineChart : Évolution balance sur 12 mois
- ✅ BarChart : Income vs Expense comparaison
- ✅ Table : 12 lignes avec détails expandables
- ✅ Balance calculation : initial_balance + transactions = correct

**Timeline**
- ✅ Label "Transactions" au lieu de "Solde du mois"
- ✅ Somme algébrique correcte (revenus - dépenses)
- ✅ Dépenses affichées 250,00€ (positif) en rouge
- ✅ Badge "Récurrent" sur transactions générées

**Database**
- ✅ Fresh reset (docker-compose down -v)
- ✅ 7 tables créées (users, households, accounts, categories, transactions, recurring_templates, alembic_version)
- ✅ FK recurring_template_id avec CASCADE

### **Livrables Sprint 4** ✅

✅ Feature récurrences complète (Backend + Frontend)  
✅ Architecture simplifiée (génération immédiate, pas de jobs)  
✅ Projections 12 mois avec graphiques interactifs  
✅ Suppression intelligente (3 options)  
✅ Balance calculation incluant initial_balance  
✅ Tests unitaires : **93/93 GREEN (100%)**  
✅ Interface responsive avec Recharts  
✅ 8 bugs critiques corrigés  
⏸️ Tests E2E Playwright (reportés fin de projet)

### **Résumé Technique Sprint 4**

**Backend:**
- 2 nouveaux modèles (RecurringTemplate, Frequency enum)
- 2 migrations (8efa0691944c, acf8a934b57a)
- 2 services (RecurringTemplateService, ProjectionService)
- 3 routers modifiés (recurring_templates.py, transactions.py, accounts.py)
- 24 nouveaux tests (69 Sprint 1-3 + 24 Sprint 4 = 93 total)
- Architecture : Suppression recurrence_materializer.py (simplification)
- Logique : Génération synchrone 12 mois dans create_template()
- FK CASCADE : recurring_template_id → Transaction (suppression propagée)

**Frontend:**
- 2 nouvelles pages (ProjectionPage, RecurringPage)
- 1 page modifiée (TimelinePage avec DeleteRecurringModal)
- 3 services API (recurringTemplateService, projectionService, getTotalBalance)
- 12 types TypeScript (RecurringTemplate, Frequency, Projection, etc.)
- 3 fichiers CSS (~900 lignes total)
- Bibliothèque : Recharts (LineChart, BarChart)
- Modals : DeleteRecurringModal (3 options radio)
- Types : Ajout recurring_template_id dans Transaction

**Statistiques:**
- Backend: +1500 lignes Python
- Frontend: +2000 lignes TypeScript/CSS
- Tests: 93 tests (17+20+32+24)
- Migrations: 2 nouvelles (recurring_template, FK)
- Bugs corrigés: 8 critiques
- Fichiers supprimés: 1 (recurrence_materializer.py)
- Durée: 2 semaines

**Concepts Clés Implémentés:**
1. **Génération immédiate** : create_template() → _generate_transactions(12 mois)
2. **Balance réelle** : initial_balance + sum(transactions) au lieu de calculs virtuels
3. **Suppression groupée** : 3 stratégies (unique, période, toutes)
4. **Liaison FK** : recurring_template_id avec CASCADE delete
5. **Montants avec signe** : Backend applique négatif pour EXPENSE, stockage positif dans template
6. **Détection récurrentes** : recurring_template_id !== null → badge + modal

**Prochaines Étapes:**
- Sprint 5: Validation Automatique + Notifications + Jobs quotidiens
- Playwright E2E tests (fin de projet)

---

## ⏰ SPRINT 5 : Feature Validation Automatique (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
Système automatique validation transactions + notifications + job quotidien

### **User Stories**
- ✅ **US-4.1** : Recevoir notification transactions à valider
- ✅ **US-4.2a** : Valider transaction
- ✅ **US-4.2b** : Modifier montant et valider
- ✅ **US-4.2c** : Reporter transaction
- ✅ **US-4.2d** : Supprimer transaction depuis validation

### **Tâches Backend (Jour 1-5)** ✅ **COMPLÉTÉ**

**Base de Données**
- ✅ Modèle `Notification` (user_id, type, message, related_transaction_id, is_read)
- ✅ Enum `NotificationType` (validation_needed, info, alert)
- ✅ Ajout `TransactionState.PENDING` (transactions du jour en attente de validation)
- ✅ Migration `cc3d20f5ba8f` : Add state column + notifications table

**Services**
- ✅ `notification_service.py` :
  - create_notification()
  - get_by_user(unread_only=False)
  - mark_as_read(), mark_all_as_read()
  - delete_notification()
  - count_unread()
  - create_validation_notification() (helper)
- ✅ `transaction_service.py` (enrichi) :
  - list_pending_transactions() (filter state=PENDING)
  - validate_transaction() (PENDING → REALIZED, optional new_amount)
  - postpone_transaction() (change date + recalculate state)
- ✅ `daily_maintenance_job.py` :
  - **Partie 1** : mark_transactions_pending_today() (PROJECTED → PENDING si date=today)
  - **Partie 2** : create_notifications_for_pending() (1 notif par transaction × membres foyer)
  - **Partie 3** : cleanup_old_deleted_transactions() (hard delete si deleted_at > 30 jours)
  - Optimizations: selectinload(household.members) pour éviter N+1 queries

**Job Quotidien**
- ✅ Endpoint `POST /api/v1/jobs/daily-maintenance`
- ✅ Retourne stats JSON (transactions_marked_pending, notifications_created, transactions_cleaned)
- ⏸️ Configuration cron (sera ajouté en production GCP)

**Endpoints API**
- ✅ `GET /api/v1/notifications` (query param: unread_only, limit)
- ✅ `PATCH /api/v1/notifications/:id/read`
- ✅ `POST /api/v1/notifications/mark-all-read`
- ✅ `GET /api/v1/notifications/unread/count`
- ✅ `DELETE /api/v1/notifications/:id`
- ✅ `GET /api/v1/transactions/pending`
- ✅ `PATCH /api/v1/transactions/:id/validate` (query param: new_amount)
- ✅ `PATCH /api/v1/transactions/:id/postpone` (query param: new_date)
- ✅ `POST /api/v1/jobs/daily-maintenance`

**Tests Unitaires**
- ✅ Tests `notification_service.py` (8 tests: CRUD, unread count, validation helper)
- ✅ Tests `daily_maintenance_job.py` (6 tests: transitions, notifications, cleanup, edge cases)
- ✅ Tests `transaction_service_validation.py` (4 tests: list_pending, validate, validate+amount, postpone)
- ✅ Regression fixes (6 tests mis à jour pour PENDING behavior)
- ✅ **111/111 tests GREEN** (Coverage 100%)

### **Tâches Frontend (Jour 6-10)** ✅ **COMPLÉTÉ**

**Composants**
- ✅ `<NotificationBell>` (navbar, badge count, dropdown avec polling 30s)
  - Badge rouge avec compteur notifications non lues
  - Dropdown liste notifications (message + date + point rouge si unread)
  - Bouton "Tout marquer comme lu"
  - Click notification → ouvre ValidationModal
- ✅ `<ValidationModal>` (dialog avec 4 actions pour transaction PENDING)
  - Affichage: description, montant éditable, date prévue, date picker reporter
  - Actions: Valider (vert), Reporter (orange), Supprimer (rouge), Annuler (gris)
  - Intégration avec notificationService + transactionService
  - Gestion loading states + error handling
- ✅ Modification `<Layout>` (intégration NotificationBell dans Sidebar)
- ✅ Modification `<Dashboard>` (section "Transactions à valider" avec style ambré)

**Services TypeScript**
- ✅ `notificationService.ts` :
  - getAll(unreadOnly) → returns NotificationListResponse { notifications[], unread_count, total }
  - markAsRead(id), markAllAsRead()
  - getUnreadCount(), delete(id)
- ✅ `transactionService.ts` (enrichi) :
  - listPending() → Transaction[]
  - validate(id, newAmount?)
  - postpone(id, newDate)

**Types**
- ✅ `notification.ts` (Notification, NotificationType, NotificationListResponse)
- ✅ `transaction.ts` (ajout TransactionState.PENDING + labels + colors)

**Hooks & State**
- ✅ State local NotificationBell (notifications[], unreadCount, polling useEffect)
- ✅ State local Dashboard (pendingTransactions[], selectedTransaction)
- ✅ ValidationModal géré par Layout et Dashboard

### **Bugs Corrigés** ✅

**Bug 1: Route `/pending` retournait 404**
- ✅ Cause: Route définie après `/{transaction_id}` → FastAPI matchait "pending" comme un ID
- ✅ Fix: Déplacé route `/pending` avant `/{transaction_id}` dans transactions.py
- ✅ Résultat: Endpoint accessible

**Bug 2: API notifications retournait objet au lieu d'array**
- ✅ Cause: Backend retourne `NotificationListResponse { notifications[], unread_count, total }`
- ✅ Fix Frontend: Service mis à jour pour extraire `data.notifications` et `data.unread_count`
- ✅ Résultat: NotificationBell affiche correctement la liste

**Bug 3: Database corrompue (tables manquantes)**
- ✅ Cause: Seule table `alembic_version` existait (corruption state)
- ✅ Fix: `DROP SCHEMA public CASCADE; CREATE SCHEMA public; alembic upgrade head`
- ✅ Résultat: 8 tables créées (users, households, accounts, categories, transactions, recurring_templates, notifications)

### **Tests Manuels Validés** ✅

**Cycle Complet E2E**
- ✅ Inscription + connexion
- ✅ Création transaction date=aujourd'hui → state=PENDING (backend)
- ✅ Modification manuelle transaction PENDING → PROJECTED (date future) → PENDING (date aujourd'hui)
- ✅ Exécution job quotidien → 1 transaction PROJECTED→PENDING + 1 notification créée
- ✅ Badge notification "1" visible dans cloche
- ✅ Dropdown notifications affiche "Transaction à valider: Bouffe"
- ✅ Section Dashboard "Transactions à valider" affiche transaction avec bouton Valider
- ✅ Click "Valider" → ValidationModal ouvre avec données transaction
- ✅ Modification montant + validation → transaction passe REALIZED
- ✅ Reporter transaction → nouvelle date + recalcul state
- ✅ Supprimer depuis modal → soft delete

**User Stories**
- ✅ **US-4.1** : Notification apparaît après job quotidien (badge + dropdown)
- ✅ **US-4.2a** : Validation transaction → PENDING → REALIZED
- ✅ **US-4.2b** : Modification montant puis validation → montant mis à jour
- ✅ **US-4.2c** : Reporter à date future → state=PROJECTED
- ✅ **US-4.2d** : Suppression depuis ValidationModal → deleted_at set

### **Livrables Sprint 5** ✅

✅ Feature validation automatique complète (Front + Back)  
✅ Job quotidien fonctionnel (`POST /api/v1/jobs/daily-maintenance`)  
✅ Système notifications in-app (polling 30s)  
✅ Tests unitaires backend: **111/111 GREEN (100%)**  
✅ 18 nouveaux tests Sprint 5 (8 notifications + 6 job + 4 validation)  
✅ Validation manuelle E2E complète (10 scénarios)  
✅ 3 bugs critiques corrigés (routing, API response, database)  
⏸️ Tests E2E Playwright (reportés fin de projet)  
⏸️ Cron job configuration (sera ajouté en prod GCP)

### **Résumé Technique Sprint 5**

**Backend:**
- 1 nouveau modèle (Notification)
- 1 enum (NotificationType: validation_needed, info, alert)
- 1 état transaction (TransactionState.PENDING)
- 1 migration (cc3d20f5ba8f)
- 3 services (NotificationService, enrichissement TransactionService, DailyMaintenanceJob)
- 2 routers API (notifications.py, jobs.py)
- 18 nouveaux tests (93 Sprint 4 + 18 Sprint 5 = 111 total)
- 1 job quotidien (3 parties: transitions, notifications, cleanup)
- Optimisation N+1 queries (selectinload)

**Frontend:**
- 2 nouveaux composants (NotificationBell, ValidationModal)
- 2 pages modifiées (Layout avec bell, Dashboard avec pending section)
- 2 services API (notificationService, enrichissement transactionService)
- 3 types TypeScript (Notification, NotificationType, NotificationListResponse)
- Polling automatique (30s pour notifications)
- Gestion état local (notifications, pendingTransactions)
- UI/UX: Badge, dropdown, modal avec 4 actions, section Dashboard ambré

**Bug Fixes:**
- Bug 1: Route order FastAPI (pending vs {id})
- Bug 2: API response structure (NotificationListResponse)
- Bug 3: Database corruption (DROP/CREATE schema)

**Statistiques:**
- Backend: +1000 lignes Python
- Frontend: +800 lignes TypeScript/TSX
- Tests: 111 tests (17+20+32+24+18)
- Migration: 1 nouvelle (state + notifications)
- Bugs corrigés: 3 critiques
- Durée: 2 semaines

**Architecture Clés:**
1. **State Machine Transaction** : PROJECTED → PENDING (date=today) → REALIZED (validation)
2. **Job Quotidien** : 3 phases (transitions, notifications multi-users, cleanup 30j)
3. **Notifications Multi-Users** : 1 notification par transaction × membres du foyer
4. **Polling Frontend** : useEffect interval 30s pour rafraîchir notifications
5. **ValidationModal Réutilisable** : Utilisable depuis NotificationBell ET Dashboard
6. **Route Ordering** : Routes spécifiques (/pending, /trash) AVANT routes paramétrées (/{id})

**Prochaines Étapes:**
- Sprint 6: Mode Couple (invitations, fusion foyers, 3 portefeuilles)
- Playwright E2E tests (fin de projet)
- Cron job GCP (Cloud Scheduler + Cloud Run)

---

## 👥 SPRINT 6 : Feature Mode Couple (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
Invitation + fusion foyers + portefeuilles tracés + dissolution

### **User Stories**
- ✅ **US-1.2a** : Inviter nouveau user (via email)
- ✅ **US-1.2b** : Inviter user existant (notification in-app)
- ✅ **US-1.2c** : Accepter invitation
- ✅ **US-1.3** : Dissoudre foyer
- ✅ **US-1.4** : Consulter foyer archivé (backend)
- ✅ **US-2.1** : Voir 3 portefeuilles (si couple)
- ⏸️ **US-2.2** : Attribuer transaction (reporté Sprint 7)

### **Tâches Backend (Jour 1-6)** ✅

**Base de Données**
- ✅ Modèles : `Invitation`, `NotificationType.HOUSEHOLD_DISSOLVED`
- ✅ Ajout champs `owner_type`, `owner_user_id`, `original_owner_user_id` dans Account/Transaction
- ✅ Migration Alembic (5 migrations totales)

**Services**
- ✅ `invitation_service.py` (create, verify, accept, reject)
- ✅ `household_service.py` (merge, dissolve, calculate_wallets)
- ✅ Correction bug wallet calculation (Phase 9)

**Logique Fusion/Dissolution**
- ✅ Fusion : créer COUPLE, migrer données (comptes avec original_owner_user_id)
- ✅ Dissolution : archiver COUPLE, créer 2 INDIVIDUAL, redistribuer comptes/transactions
- ✅ Redistribution intelligente : PERSONAL migré, SHARED REALIZED archivé, SHARED PROJECTED supprimé
- ✅ Calcul wallets finaux avant dissolution (initial_balance nouveaux foyers)

**Endpoints API**
- ✅ CRUD `/api/v1/invitations`
- ✅ `POST /api/v1/households/:id/dissolve`
- ✅ `GET /api/v1/households/archived`
- ✅ `GET /api/v1/households/me` (household + membres)
- ✅ `GET /api/v1/wallets` (3 portefeuilles si couple)

**Tests Unitaires**
- ✅ Tests dissolution complète (4 tests : success, not_couple, not_member, not_active)
- ✅ Tests fusion + wallets (validés en production)
- ✅ Tests invitations CRUD
- ✅ Coverage >80%

### **Tâches Frontend (Jour 7-11)** ✅

**Pages**
- ✅ Page `/settings/household` (complète avec dissolution)
- ⏸️ Page `/archived` (reporté)
- ⏸️ Page `/join?code=XXX` (reporté)

**Composants**
- ✅ `<WalletCards>` (3 cartes si couple)
- ✅ `<InvitePartnerButton>`, `<InvitationModal>`, `<InvitationList>`
- ✅ `<DissolveHouseholdButton>`, `<DissolveConfirmDialog>` avec loading state
- ✅ `<AcceptInvitationDialog>`, `<RejectInvitationButton>`
- ⏸️ Modification `<AddTransactionModal>` (champ Attribution - reporté)
- ⏸️ Modification `<TransactionItem>` (logo attribution - reporté)

**Services**
- ✅ `householdService.ts` (dissolveHousehold, getCurrentHousehold, getArchivedHouseholds)
- ✅ `invitationService.ts` (create, accept, reject, cancel)

**Hooks**
- ✅ Intégration API réelle (plus de données mockées)
- ✅ Gestion états loading/error avec toast notifications
- ✅ Affichage dynamique membres avec initiales

### **Bugs Corrigés** ✅

**Phase 9: Bug wallet calculation critique**
- ✅ Problème: Wallets après fusion ne comptaient pas initial_balance des comptes
- ✅ Solution: Ajout `original_owner_user_id` dans Account
- ✅ Migration: Colonne + mise à jour données existantes
- ✅ Service: `calculate_wallets()` inclut initial_balance par owner
- ✅ Service: `merge_households()` préserve original_owner_user_id
- ✅ Validation production: 3233.51€ et 2170.01€ (attendu ✅)
- ✅ Tests: 11 tests (8 wallet + 3 régression)

**Bugs dissolution**
- ✅ Fix: `await self.db.delete()` → `self.db.delete()` (pas async)
- ✅ Fix: Migration enum `HOUSEHOLD_DISSOLVED` manquante
- ✅ Fix: `household_id` dans notifications de dissolution

### **Migrations Alembic** ✅

1. ✅ `a0ce9c541234` - Add invitation model
2. ✅ `b1df0d652345` - Add owner_type and owner_user_id to transactions
3. ✅ `c2ef1e763456` - Add original_owner_user_id to accounts (Phase 9)
4. ✅ `0a7adba857ab` - Update existing accounts with original_owner_user_id
5. ✅ `41b674e8ec28` - Add HOUSEHOLD_DISSOLVED to notificationtype enum

### **Tests Manuels Validés** ✅

**Invitations**
- ✅ User 1 invite User 2 (email existant)
- ✅ User 2 reçoit notification in-app
- ✅ User 2 accepte → Fusion automatique
- ✅ Household COUPLE créé avec nom "User1 & User2"
- ✅ Wallets affichés correctement (3 portefeuilles)

**Dissolution**
- ✅ Bouton "Dissoudre le foyer" accessible
- ✅ Dialog de confirmation avec avertissement
- ✅ Dissolution réussie → 2 nouveaux foyers INDIVIDUAL
- ✅ Household COUPLE archivé
- ✅ Comptes redistribués par original_owner_user_id
- ✅ Transactions PERSONAL migrées
- ✅ Transactions SHARED REALIZED conservées dans archivé
- ✅ Transactions SHARED PROJECTED supprimées
- ✅ Notifications envoyées aux 2 membres
- ✅ Toast success avec balance initiale affichée

### **Livrables Sprint 6** ✅

✅ Feature mode couple complète (Front + Back)
✅ Système d'invitations (création, acceptation, rejet, annulation)
✅ Fusion automatique foyers → COUPLE
✅ Dissolution foyers → 2 INDIVIDUAL (redistribution intelligente)
✅ Consultation foyers archivés (backend endpoint)
✅ 3 portefeuilles (Mon, Partenaire, Commun)
✅ Calcul wallets avec initial_balance (bug critique résolu)
✅ Tests unitaires backend: 4 tests dissolution + tests wallet
✅ 5 migrations Alembic
✅ Validation manuelle complète (invitations + dissolution)
✅ Seed script à jour avec original_owner_user_id
⏸️ Tests E2E Playwright (reportés fin de projet)
⏸️ Attribution transactions (modal + display - reporté Sprint 7)

### **Résumé Technique Sprint 6**

**Backend:**
- 1 nouveau modèle (Invitation)
- 2 nouveaux services (InvitationService, dissolution dans HouseholdService)
- 5 migrations Alembic
- 3 nouveaux endpoints (/invitations, /households/:id/dissolve, /households/me)
- Tests unitaires: 4 tests dissolution + tests invitations
- Bug fix critique: wallet calculation avec original_owner_user_id

**Frontend:**
- 1 service (householdService.ts)
- 1 service existant modifié (invitationService.ts)
- 2 composants majeurs (SettingsHousehold, InvitationList)
- Intégration API complète (dissolution + household/me)
- UX: Loading states, error handling, toast notifications

**Décisions Techniques:**
- Soft delete transactions SHARED PROJECTED lors dissolution
- Conservation transactions SHARED REALIZED dans household archivé (historique)
- Migration transactions PERSONAL vers nouveau household du propriétaire
- Calcul wallet final AVANT dissolution pour initial_balance précis
- Enum PostgreSQL géré via migrations Alembic

---

## 📁 SPRINT 7 : Feature Avatars + Objectifs + Export PDF (2 semaines) ✅ **TERMINÉ**

### **Fonctionnalité**
Upload avatars + objectifs épargne + export PDF

### **User Stories**
- ✅ **US-AVATAR-1** : Upload photo de profil
- ✅ **US-AVATAR-2** : Supprimer photo de profil
- ✅ **US-GOAL-1** : Créer objectif d'épargne (personnel + foyer)
- ✅ **US-GOAL-2** : Voir progression objectif
- ✅ **US-GOAL-3** : Modifier/supprimer objectif
- ✅ **US-GOAL-4** : Ajouter contribution à objectif
- ✅ **US-8.1** : Exporter rapport mensuel PDF
- ✅ **US-7.3** : Annuler transaction via API (état CANCELLED)

### **Tâches Backend (Jour 1-5)** ✅

**Base de Données**
- ✅ Modèle `Goal` (personnel/foyer)
- ✅ Champ `avatar_url` dans User
- ✅ Migration Alembic

**Services**
- ✅ `storage_service.py` (upload/delete fichiers local `/uploads/`)
- ✅ `pdf_service.py` (générer rapport mensuel avec ReportLab)
- ✅ `goal_service.py` (CRUD + calculate_progress + validations)

**Endpoints API**
- ✅ `POST /api/v1/users/me/avatar` (multipart)
- ✅ `DELETE /api/v1/users/me/avatar`
- ✅ CRUD `/api/v1/goals` (GET, POST, PUT, DELETE)
- ✅ `PATCH /api/v1/goals/:id/contribution` (ajouter contribution)
- ✅ `POST /api/v1/exports/pdf?year=YYYY&month=MM`
- ✅ `PATCH /api/v1/transactions/:id/cancel`

**Tests Unitaires**
- ✅ Tests upload/delete avatar (4 tests)
- ✅ Tests génération PDF (9 tests service + 11 tests API)
- ✅ Tests CRUD objectifs (13 tests service + 6 tests API)
- ✅ Tests cancel transaction (3 tests API)
- ✅ **206 tests backend passent** (Coverage >80%)

### **Tâches Frontend (Jour 6-10)** ✅

**Pages**
- ✅ Page `/goals` (liste objectifs personnels + foyer)
- ✅ Modification `/settings/profile` (upload avatar)

**Composants**
- ✅ `<AvatarUpload>`, `<AvatarDisplay>` (Settings)
- ✅ `<GoalCard>`, `<GoalList>`, `<AddGoalModal>`, `<GoalProgress>`
- ✅ `<ContributionModal>` (ajouter contribution)
- ✅ `<ExportButton>` (Timeline - export PDF mois courant)

**Hooks**
- ✅ `useUploadAvatar`, `useDeleteAvatar`
- ✅ `useGoals`, `useCreateGoal`, `useUpdateGoal`, `useDeleteGoal`
- ✅ `useExportPDF` (avec loading + error states)

**Services**
- ✅ `avatarService.ts` (upload/delete)
- ✅ `goalService.ts` (CRUD goals)
- ✅ `exportService.ts` (export PDF + download)

### **Tests E2E Playwright (Jour 11-14)** ⏸️

- ⏸️ **E2E-US-AVATAR-1** : Upload avatar (reporté Sprint 8)
- ⏸️ **E2E-US-AVATAR-2** : Supprimer avatar (reporté Sprint 8)
- ⏸️ **E2E-US-GOAL-1** : Créer objectif (reporté Sprint 8)
- ⏸️ **E2E-US-GOAL-2** : Vérifier progression objectif (reporté Sprint 8)
- ⏸️ **E2E-US-8.1** : Exporter PDF (reporté Sprint 8)

### **Livrables Sprint 7** ✅
✅ Feature avatars complète (upload/delete)  
✅ Feature objectifs complète (CRUD + contribution + progression)  
✅ Export PDF fonctionnel (Timeline - bouton intégré)  
✅ API cancel transaction disponible  
✅ **206 tests unitaires backend** (100% passent)  
✅ Tests manuels validés (avatars, objectifs, PDF)  
⏸️ Tests E2E Playwright (reportés Sprint 8)

### **Notes Techniques**
- **PDF** : ReportLab génère rapports avec résumé financier, catégories, transactions
- **Goals** : Validation couple (min 2 membres) pour objectifs foyer
- **Avatar** : Upload local dans `/uploads/avatars/` (migration S3 en Sprint 9)
- **Frontend** : Gestion états loading, erreurs, toasts pour toutes les features

---

## 🎨 SPRINT 8 : Polish & Documentation (2 semaines)

### **Objectif**
Finalisation application avant infrastructure

### **Tâches Backend (Jour 1-4)**

**Optimisations**
- [ ] Audit queries SQL (index)
- [ ] Optimisation cache Redis (TTL)
- [ ] Logs structurés JSON
- [ ] Rate limiting (100 req/min)
- [ ] CORS sécurisé

**Tests**
- [ ] Coverage >85%
- [ ] Tests de charge (Locust : 100 users)
- [ ] Tests sécurité (SQL injection, XSS, CSRF)

**Documentation**
- [ ] README backend complet
- [ ] Swagger descriptions détaillées
- [ ] Guide contribution

### **Tâches Frontend (Jour 5-8)**

**Polish UI/UX**
- [ ] Audit accessibilité (a11y)
- [ ] Animations Framer Motion (transitions pages, listes)
- [ ] Skeleton loaders
- [ ] Messages erreur UX
- [ ] Empty states avec CTA

**Optimisations**
- [ ] Lighthouse audit (score >90)
- [ ] Bundle size optimization
- [ ] Image optimization

**Documentation**
- [ ] README frontend complet
- [ ] Guide utilisateur (wiki)
- [ ] Vidéo démo (5-10min)

### **Tests E2E Playwright (Jour 9-12)**

**Scénarios Complets**
- [ ] **E2E-Scénario-1** : Parcours complet nouveau user
  ```typescript
  test('Full user journey', async ({ page }) => {
    // 1. Inscription
    await page.goto('/register');
    // ...  formulaire
    
    // 2. Ajouter compte bancaire
    await page.goto('/accounts');
    // ... 
    
    // 3.  Ajouter transaction ponctuelle
    await page.goto('/timeline');
    // ... 
    
    // 4.  Créer récurrence
    // ...
    
    // 5. Voir projection
    await page.goto('/projection');
    await expect(page.locator('text=Déc 2025')).toBeVisible();
  });
  ```
- [ ] **E2E-Scénario-2** : Parcours couple complet
- [ ] **E2E-Scénario-3** : Validation quotidienne
- [ ] **E2E-Scénario-4** : Dissolution foyer

**Tests Multi-browsers**
- [ ] Tous tests E2E sur Chromium, Firefox, WebKit

### **Tâches DevOps (Jour 13-14)**

**Documentation Infra**
- [ ] README Terraform
- [ ] Diagramme architecture
- [ ] Runbook déploiement

**Scripts Utilitaires**
- [ ] Script backup DB local
- [ ] Script seed données test
- [ ] Script reset DB

### **Livrables Sprint 8**
✅ Application stable et performante  
✅ Tests E2E scénarios complets (4 scénarios)  
✅ Coverage backend >85%  
✅ Lighthouse >90  
✅ Documentation complète  
✅ Prêt pour infrastructure

---

## 🚀 SPRINT 9 : Infrastructure & Staging (2 semaines)

### **Objectif**
Créer infrastructure GCP + déploiement staging

### **Tâches (Jour 1-10)**

**Setup GCP & Terraform**
- [ ] Créer projet GCP
- [ ] Activer APIs
- [ ] Setup Terraform backend (GCS)
- [ ] Créer 12 modules Terraform (VPC, Cloud SQL, Redis, Cloud Run, etc.)
- [ ] `terraform apply`

**CI/CD Déploiement**
- [ ] Workload Identity Federation
- [ ] Workflows deploy (backend + frontend) sur branch `staging`
- [ ] Build + Push Artifact Registry
- [ ] Deploy Cloud Run
- [ ] Run migrations

**Tests Staging (Jour 11-14)**
- [ ] Smoke tests (endpoints)
- [ ] Tests fonctionnels (inscription, transaction, etc.)
- [ ] Job Cloud Scheduler (trigger manuel)
- [ ] Monitoring opérationnel

### **Livrables Sprint 9**
✅ Infrastructure GCP complète  
✅ CI/CD staging opérationnel  
✅ Tous services déployés  
✅ Tests staging passants

---

## 🎉 SPRINT 10 : Release Production (1 semaine)

### **Objectif**
Déployer en production (branch `main`)

### **Tâches (Jour 1-4)**

**Pré-Release**
- [ ] Audit sécurité final
- [ ] Tests de charge staging
- [ ] Vérifier backups
- [ ] Plan de rollback
- [ ] Changelog v1.0.0

**Release (Jour 4)**
- [ ] PR `staging` → `main`
- [ ] Merge → déploiement auto
- [ ] Smoke tests production
- [ ] Surveillance 48h

**Post-Release (Jour 5-7)**
- [ ] Tests utilisateurs
- [ ] Documentation finale
- [ ] Vidéo démo
- [ ] Communication (LinkedIn, etc.)

### **Livrables Sprint 10**
✅ Application en production  
✅ Monitoring opérationnel  
✅ Documentation complète  
✅ **PROJET TERMINÉ ! ** 🎉

---

## 📊 Récapitulatif Final

| Sprint | Focus Feature | Backend | Frontend | Tests E2E | Durée |
|--------|---------------|---------|----------|-----------|-------|
| **0** | Setup | FastAPI + Docker | Next.js | Playwright setup | 1 sem |
| **1** | Authentification | Auth + JWT | Login/Register | 4 US | 2 sem |
| **2** | Comptes & Catégories | CRUD | Pages + Modals | 6 US | 2 sem |
| **3** | Transactions | CRUD + Timeline | Timeline + Corbeille | 7 US | 2 sem |
| **4** | Récurrences | Templates + Projections | Projection + Graph | 5 US | 2 sem |
| **5** | Validation Auto | Job + Notifications | Notifs + Validation | 5 US | 2 sem |
| **6** | Mode Couple | Fusion + Dissolution | 3 Portefeuilles | 7 US | 2 sem |
| **7** | Fichiers & Objectifs | Upload + PDF | Goals + Export | 6 US | 2 sem |
| **8** | Polish | Optimisations | A11y + UX | Scénarios complets | 2 sem |
| **9** | Infrastructure | Terraform | - | Tests staging | 2 sem |
| **10** | Production | Release | - | Tests prod | 1 sem |

**Total : 20 semaines (~5 mois)**

---

## ✅ Avantages Approche Feature-Driven

**✅ Développement Intégré**
- Front et Back développés ensemble (cohérence)
- Intégration continue dès le début

**✅ Tests E2E Par Feature**
- Chaque user story testée automatiquement
- Tests répétitifs automatisés (Playwright)
- Régression détectée immédiatement

**✅ Feedback Rapide**
- Feature complète testable à chaque sprint
- Demo possible en fin de sprint

**✅ CI Complète**
- Lint + Tests unitaires + Tests E2E
- Confiance dans le code (refactoring sûr)

---

## 🎯 Prêt à Démarrer ! 

**Prochaines étapes :**
1. ✅ Créer repos GitHub
2. ✅ Créer branches (`develop`, `staging`, `main`)
3. ✅ Lancer Sprint 0

**Bonne chance !  ** 🚀