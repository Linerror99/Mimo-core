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

## 🔁 SPRINT 4 : Feature Récurrences & Projections (2 semaines)

### **Fonctionnalité**
Transactions récurrentes + projections 12 mois

### **User Stories**
- **US-3.1d** : Créer transaction récurrente
- **US-3.3a** : Modifier récurrence sur période
- **US-3.3b** : Annuler récurrence sur période
- **US-5.1** : Voir tableau projection 12 mois
- **US-5.2** : Voir détail mois projeté

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- [ ] Modèle `RecurringTemplate`
- [ ] Enum `Frequency`
- [ ] Migration Alembic

**Services**
- [ ] `recurring_template_service.py` (CRUD + bulk operations)
- [ ] `projection_service.py` (generate_projections, calculate_monthly_projection)

**Logique Récurrence**
- [ ] Helper `get_next_occurrence()` (WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM)

**Endpoints API**
- [ ] CRUD `/api/v1/recurring-templates`
- [ ] `POST /api/v1/recurring-templates/:id/bulk-cancel`
- [ ] `POST /api/v1/recurring-templates/:id/bulk-update`
- [ ] `GET /api/v1/dashboard/projection? months=12`

**Tests Unitaires**
- [ ] Tests génération projections (toutes fréquences)
- [ ] Tests `get_next_occurrence()` (edge cases)
- [ ] Tests bulk operations
- [ ] Coverage >80%

### **Tâches Frontend (Jour 6-10)**

**Pages**
- [ ] Page `/projection` (tableau + graphique)
- [ ] Page `/recurring`

**Composants**
- [ ] `<ProjectionTable>`, `<ProjectionChart>` (Recharts), `<MonthDetailModal>`
- [ ] `<RecurringTemplateList>`, `<RecurringTemplateCard>`
- [ ] `<AddRecurringModal>`, `<BulkEditModal>`
- [ ] Modification `<AddTransactionModal>` (toggle Ponctuelle/Récurrente)

**Hooks**
- [ ] `useRecurringTemplates`, `useCreateRecurringTemplate`, `useProjection`
- [ ] `useBulkCancelOccurrences`, `useBulkUpdateOccurrences`

### **Tests E2E Playwright (Jour 11-14)**

- [ ] **E2E-US-3.1d** : Créer récurrence mensuelle
  ```typescript
  test('US-3.1d: Create monthly recurring transaction', async ({ page }) => {
    await loginAsTestUser(page);
    await page. goto('/timeline');
    await page.click('text=Ajouter une transaction');
    await page.click('input[value="recurring"]'); // Toggle récurrente
    await page.fill('[name="name"]', 'Loyer mensuel');
    await page.fill('[name="amount"]', '1500');
    await page.selectOption('[name="frequency"]', 'MONTHLY');
    await page.fill('[name="day_of_month"]', '1');
    await page.fill('[name="start_date"]', '2025-12-01');
    await page. click('button:has-text("Ajouter")');
    // Vérifier template créé
    await page.goto('/recurring');
    await expect(page.locator('text=Loyer mensuel')).toBeVisible();
    // Vérifier projections générées (aller en projection)
    await page.goto('/projection');
    await expect(page.locator('text=Déc 2025')).toContainText('-1500');
  });
  ```
- [ ] **E2E-US-3.3a** : Modifier montant récurrence sur période
- [ ] **E2E-US-3.3b** : Annuler occurrences sur période
- [ ] **E2E-US-5.1** : Voir tableau projection (12 mois visibles)
- [ ] **E2E-US-5.2** : Cliquer sur mois → voir détail transactions

### **Livrables Sprint 4**
✅ Feature récurrences complète  
✅ Projections 12 mois  
✅ Graphique visualisation  
✅ Tests unitaires >80%  
✅ Tests E2E (5 user stories)  
✅ CI passante

---

## ⏰ SPRINT 5 : Feature Validation Automatique (2 semaines)

### **Fonctionnalité**
Système automatique validation transactions + notifications

### **User Stories**
- **US-4.1** : Recevoir notification transactions à valider
- **US-4. 2a** : Valider transaction
- **US-4.2b** : Modifier montant et valider
- **US-4. 2c** : Reporter transaction
- **US-4.2d** : Supprimer transaction depuis validation

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- [ ] Modèle `Notification`
- [ ] Migration Alembic

**Services**
- [ ] `notification_service.py` (create, get, mark_read, dismiss)
- [ ] `daily_maintenance_job.py` :
  - Partie 1 : PROJECTED → PENDING (date = today)
  - Partie 2 : Génération projections manquantes
  - Partie 3 : Nettoyage corbeille (>30j)

**Job Quotidien**
- [ ] Script `run_daily_job.py`
- [ ] Configuration cron local (06:00)

**Endpoints API**
- [ ] CRUD `/api/v1/notifications`
- [ ] `PATCH /api/v1/transactions/:id/validate`
- [ ] `PATCH /api/v1/transactions/:id/postpone`
- [ ] `POST /api/v1/jobs/daily-maintenance`

**Tests Unitaires**
- [ ] Tests job complet (mock date)
- [ ] Tests transitions états
- [ ] Coverage >80%

### **Tâches Frontend (Jour 6-10)**

**Composants**
- [ ] `<NotificationBell>` (navbar, badge count)
- [ ] `<NotificationDropdown>`
- [ ] `<ValidationModal>` (liste transactions PENDING avec 4 actions)
- [ ] `<PostponeDialog>`

**Hooks**
- [ ] `useNotifications` (refetch 30s)
- [ ] `useValidateTransaction`, `usePostponeTransaction`

**Dashboard**
- [ ] Section "Transactions à valider" en haut

### **Tests E2E Playwright (Jour 11-14)**

- [ ] **E2E-US-4.1** : Notification apparaît (simuler job)
  ```typescript
  test('US-4.1: Receive validation notification', async ({ page, request }) => {
    await loginAsTestUser(page);
    // Créer transaction PROJECTED pour aujourd'hui (via API)
    await request.post('/api/v1/transactions', {
      data: {
        name: 'Test transaction',
        amount: -50,
        date: new Date().toISOString(). split('T')[0], // Aujourd'hui
        // ... 
      }
    });
    // Déclencher job (via API endpoint)
    await request.post('/api/v1/jobs/daily-maintenance');
    // Recharger page
    await page. reload();
    // Vérifier notification badge
    await expect(page.locator('[data-testid="notification-badge"]')). toHaveText('1');
    // Ouvrir dropdown
    await page.click('[aria-label="Notifications"]');
    await expect(page.locator('text=Test transaction')).toBeVisible();
  });
  ```
- [ ] **E2E-US-4.2a** : Valider transaction (montant inchangé)
- [ ] **E2E-US-4.2b** : Modifier montant puis valider
- [ ] **E2E-US-4.2c** : Reporter à une autre date
- [ ] **E2E-US-4.2d** : Supprimer depuis validation

### **Livrables Sprint 5**
✅ Feature validation automatique complète  
✅ Job quotidien fonctionnel (local)  
✅ Notifications in-app  
✅ Tests unitaires >80%  
✅ Tests E2E (5 user stories)  
✅ CI passante

---

## 👥 SPRINT 6 : Feature Mode Couple (2 semaines)

### **Fonctionnalité**
Invitation + fusion foyers + portefeuilles tracés

### **User Stories**
- **US-1.2a** : Inviter nouveau user (via email)
- **US-1.2b** : Inviter user existant (notification in-app)
- **US-1.2c** : Accepter invitation
- **US-1.3** : Dissoudre foyer
- **US-1. 4** : Consulter foyer archivé
- **US-2.1** : Voir 3 portefeuilles (si couple)
- **US-2. 2** : Attribuer transaction (personnel/commun)

### **Tâches Backend (Jour 1-6)**

**Base de Données**
- [ ] Modèles : `Invitation`, `TransactionSplit`
- [ ] Ajout champs `owner_type`, `owner_id` dans Transaction
- [ ] Migration Alembic

**Services**
- [ ] `invitation_service.py` (create, verify, accept, reject)
- [ ] `household_service.py` (merge, dissolve, calculate_wallets)
- [ ] `email_service.py` (envoyer email invitation)

**Logique Fusion/Dissolution**
- [ ] Fusion : créer COUPLE, migrer données, archiver anciens
- [ ] Dissolution : archiver COUPLE, créer 2 INDIVIDUAL, répartir

**Endpoints API**
- [ ] CRUD `/api/v1/invitations`
- [ ] `POST /api/v1/households/:id/dissolve`
- [ ] `GET /api/v1/households/archived`
- [ ] `GET /api/v1/dashboard/wallets`

**Tests Unitaires**
- [ ] Tests fusion complète
- [ ] Tests dissolution + répartition
- [ ] Tests calcul 3 portefeuilles
- [ ] Coverage >80%

### **Tâches Frontend (Jour 7-11)**

**Pages**
- [ ] Page `/settings/household`
- [ ] Page `/archived`
- [ ] Page `/join? code=XXX`

**Composants**
- [ ] `<WalletCards>` (3 cartes si couple)
- [ ] `<InvitePartnerButton>`, `<InvitationModal>`
- [ ] `<DissolveHouseholdButton>`, `<DissolveConfirmDialog>`
- [ ] `<AcceptInvitationDialog>`
- [ ] Modification `<AddTransactionModal>` (champ Attribution si couple)
- [ ] Modification `<TransactionItem>` (logo attribution)

**Hooks**
- [ ] `useHousehold`, `useWallets`, `useInvitations`
- [ ] `useCreateInvitation`, `useAcceptInvitation`, `useDissolveHousehold`

### **Tests E2E Playwright (Jour 12-14)**

- [ ] **E2E-US-1. 2a** : Inviter nouveau user (vérifier email envoyé - mock)
- [ ] **E2E-US-1.2b+c** : Inviter user existant + accepter
  ```typescript
  test('US-1.2b+c: Invite existing user and accept', async ({ page, context }) => {
    // User 1 (Alex) invite User 2 (Sarah)
    await loginAsUser(page, 'alex@test.com');
    await page.goto('/settings/household');
    await page. click('text=Inviter un partenaire');
    await page. fill('[name="email"]', 'sarah@test.com');
    await page.click('button:has-text("Envoyer invitation")');
    await expect(page.locator('text=Invitation envoyée')).toBeVisible();
    
    // User 2 (Sarah) accepte
    const page2 = await context.newPage();
    await loginAsUser(page2, 'sarah@test.com');
    await page2.goto('/dashboard');
    // Vérifier notification invitation
    await page2.click('[aria-label="Notifications"]');
    await expect(page2.locator('text=Alex vous invite')).toBeVisible();
    await page2.click('button:has-text("Accepter")');
    await expect(page2.locator('text=Félicitations')).toBeVisible();
    
    // Vérifier fusion (household COUPLE)
    await page2. goto('/dashboard');
    await expect(page2.locator('text=Alex & Sarah')).toBeVisible();
    // Vérifier 3 portefeuilles
    await expect(page2.locator('text=Mon Portefeuille')).toBeVisible();
    await expect(page2.locator('text=Portefeuille Sarah')).toBeVisible();
    await expect(page2.locator('text=Portefeuille Commun')).toBeVisible();
  });
  ```
- [ ] **E2E-US-1.3** : Dissoudre foyer (vérifier retour compte individuel)
- [ ] **E2E-US-1.4** : Consulter foyer archivé (lecture seule)
- [ ] **E2E-US-2. 1** : Voir 3 portefeuilles (si couple)
- [ ] **E2E-US-2.2** : Ajouter transaction commune (attribution)

### **Livrables Sprint 6**
✅ Feature mode couple complète  
✅ Fusion/dissolution foyers  
✅ Portefeuilles tracés  
✅ Tests unitaires >80%  
✅ Tests E2E (7 user stories)  
✅ CI passante

---

## 📁 SPRINT 7 : Feature Fichiers & Objectifs (2 semaines)

### **Fonctionnalité**
Upload avatars + objectifs épargne + export PDF

### **User Stories**
- **US-AVATAR-1** : Upload photo de profil
- **US-AVATAR-2** : Supprimer photo de profil
- **US-GOAL-1** : Créer objectif d'épargne
- **US-GOAL-2** : Voir progression objectif
- **US-8.1** : Exporter rapport mensuel PDF
- **US-7.3** : Annuler transaction (état CANCELLED)

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- [ ] Modèle `Goal`
- [ ] Champ `avatar_url` dans User
- [ ] Migration Alembic

**Services**
- [ ] `storage_service.py` (upload/delete fichiers local `/uploads/`)
- [ ] `pdf_service.py` (générer rapport mensuel)
- [ ] `goal_service.py` (CRUD + calculate_progress)

**Endpoints API**
- [ ] `POST /api/v1/users/me/avatar` (multipart)
- [ ] `DELETE /api/v1/users/me/avatar`
- [ ] CRUD `/api/v1/goals`
- [ ] `POST /api/v1/exports/pdf`
- [ ] `PATCH /api/v1/transactions/:id/cancel`

**Tests Unitaires**
- [ ] Tests upload avatar
- [ ] Tests génération PDF
- [ ] Tests CRUD objectifs
- [ ] Coverage >80%

### **Tâches Frontend (Jour 6-10)**

**Pages**
- [ ] Page `/goals`
- [ ] Modification `/settings/profile` (upload avatar)

**Composants**
- [ ] `<AvatarUpload>`, `<AvatarDisplay>`
- [ ] `<GoalCard>`, `<GoalList>`, `<AddGoalModal>`, `<GoalProgress>`
- [ ] `<ExportButton>`, `<ExportModal>`

**Hooks**
- [ ] `useUploadAvatar`, `useDeleteAvatar`
- [ ] `useGoals`, `useCreateGoal`, `useUpdateGoal`, `useDeleteGoal`
- [ ] `useExportPDF`

### **Tests E2E Playwright (Jour 11-14)**

- [ ] **E2E-US-AVATAR-1** : Upload avatar
  ```typescript
  test('US-AVATAR-1: Upload profile picture', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/settings/profile');
    // Upload fichier
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/avatar-test.jpg');
    await page.click('button:has-text("Enregistrer")');
    await expect(page.locator('text=Photo mise à jour')).toBeVisible();
    // Vérifier avatar visible dans navbar
    await expect(page.locator('nav img[alt*="avatar"]')).toBeVisible();
  });
  ```
- [ ] **E2E-US-AVATAR-2** : Supprimer avatar
- [ ] **E2E-US-GOAL-1** : Créer objectif
- [ ] **E2E-US-GOAL-2** : Vérifier progression objectif (barre + texte)
- [ ] **E2E-US-8.1** : Exporter PDF (vérifier download)
- [ ] **E2E-US-7.3** : Annuler transaction (état CANCELLED vs TRASHED)

### **Livrables Sprint 7**
✅ Feature fichiers & objectifs complète  
✅ Upload avatars (local)  
✅ Export PDF  
✅ Tests unitaires >80%  
✅ Tests E2E (6 user stories)  
✅ CI passante

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