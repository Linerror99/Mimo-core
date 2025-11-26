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

## 🔐 SPRINT 1 : Feature Authentification (2 semaines)

### **Fonctionnalité**
Système d'authentification complet (inscription, connexion, profil)

### **User Stories**
- **US-1. 1** : Créer un compte individuel (prénom, nom, email, password)
- **US-6.1** : Se déconnecter
- **US-6.2** : Modifier ses informations personnelles
- **US-6.2b** : Changer son mot de passe

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- [ ] Modèles SQLAlchemy : `User`, `Household`, `HouseholdMembership`
- [ ] Migration Alembic initiale
- [ ] Seeds données de test

**Services**
- [ ] `auth_service.py` :
  - Hash/verify password (bcrypt)
  - Create/verify JWT tokens (access 15min, refresh 7j)
  - Register user (créer user + household INDIVIDUAL)
  - Login (retourner tokens)
  - Logout (blacklist token Redis)
  - Refresh token
- [ ] `user_service.py` :
  - Get user profile
  - Update user info
  - Update password

**Endpoints API**
- [ ] `POST /api/v1/auth/register`
- [ ] `POST /api/v1/auth/login`
- [ ] `POST /api/v1/auth/logout`
- [ ] `POST /api/v1/auth/refresh`
- [ ] `GET /api/v1/users/me`
- [ ] `PATCH /api/v1/users/me`
- [ ] `PATCH /api/v1/users/me/password`

**Tests Unitaires Backend**
- [ ] Tests `auth_service` (hash, verify, tokens)
- [ ] Tests endpoints auth (register, login, logout)
- [ ] Tests sécurité (email unique, password strength)
- [ ] Tests blacklist Redis
- [ ] Coverage >80%

### **Tâches Frontend (Jour 6-10)**

**Schemas Zod**
- [ ] `registerSchema`, `loginSchema`, `profileSchema`, `passwordSchema`

**Pages & Layouts**
- [ ] Layout `(auth)` sans navbar
- [ ] Page `/login`
- [ ] Page `/register` (champs prénom + nom)
- [ ] Layout `(dashboard)` avec navbar
- [ ] Page `/dashboard` (placeholder)
- [ ] Page `/settings/profile`

**Composants**
- [ ] `<LoginForm>` (React Hook Form + Zod)
- [ ] `<RegisterForm>`
- [ ] `<Navbar>` (avec bouton déconnexion)
- [ ] `<ProfileForm>`
- [ ] `<PasswordForm>`

**State & API**
- [ ] Store Zustand `authStore` (user, tokens, login, logout)
- [ ] API client Axios avec interceptors (auto-refresh token)
- [ ] Hooks TanStack Query : `useRegister`, `useLogin`, `useLogout`, `useMe`, `useUpdateProfile`
- [ ] Middleware Next.js (protéger routes `/dashboard/*`)

**Validation & UX**
- [ ] Messages d'erreur FR
- [ ] Toast notifications
- [ ] Loading states
- [ ] Validation temps réel

### **Tests E2E Playwright (Jour 11-14)**

**Tests User Stories**
- [ ] **E2E-US-1.1** : Inscription complète
  ```typescript
  test('US-1.1: User can register', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name="first_name"]', 'Alex');
    await page.fill('[name="last_name"]', 'Dupont');
    await page.fill('[name="email"]', 'alex@test.com');
    await page. fill('[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
  ```
- [ ] **E2E-US-6.1** : Déconnexion
  ```typescript
  test('US-6.1: User can logout', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    // Then logout
    await page.click('[aria-label="User menu"]');
    await page. click('text=Déconnexion');
    await expect(page).toHaveURL('/login');
  });
  ```
- [ ] **E2E-US-6.2** : Modification profil
- [ ] **E2E-US-6.2b** : Changement mot de passe

**Helpers Playwright**
- [ ] `fixtures/auth.ts` : `loginAsTestUser(page)`
- [ ] `fixtures/db.ts` : `seedTestUser()`, `cleanupTestData()`

**CI Integration**
- [ ] Ajouter step Playwright dans workflow CI
- [ ] Artifacts : screenshots + videos en cas d'échec

### **Livrables Sprint 1**
✅ Feature auth complète (Front + Back)  
✅ Tests unitaires backend >80%  
✅ Tests E2E Playwright (4 user stories)  
✅ CI passante (lint + tests unitaires + E2E)

---

## 🏦 SPRINT 2 : Feature Comptes & Catégories (2 semaines)

### **Fonctionnalité**
CRUD complets pour comptes bancaires et catégories

### **User Stories**
- **US-6.3a** : Créer un compte bancaire
- **US-6.3b** : Modifier un compte bancaire
- **US-6.3c** : Supprimer un compte bancaire
- **US-CAT-1** : Créer une catégorie
- **US-CAT-2** : Modifier une catégorie
- **US-CAT-3** : Supprimer une catégorie

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- [ ] Modèles : `Account`, `Category`
- [ ] Migrations Alembic
- [ ] Seeds catégories par défaut (15-20)

**Services**
- [ ] `account_service.py` (CRUD + calculate_balance)
- [ ] `category_service.py` (CRUD + get_tree)

**Endpoints API**
- [ ] CRUD `/api/v1/accounts`
- [ ] CRUD `/api/v1/categories`

**Cache Redis**
- [ ] Cache catégories (TTL 1h, invalidation sur modif)

**Tests Unitaires**
- [ ] Tests CRUD comptes
- [ ] Tests CRUD catégories
- [ ] Test empêcher suppression compte avec transactions
- [ ] Coverage >80%

### **Tâches Frontend (Jour 6-10)**

**Pages**
- [ ] Page `/accounts` (liste + grille cartes)
- [ ] Page `/categories` (liste hiérarchique)

**Composants**
- [ ] `<AccountCard>`, `<AccountList>`
- [ ] `<AddAccountModal>`, `<EditAccountModal>`, `<DeleteAccountDialog>`
- [ ] `<CategoryTree>`, `<CategoryItem>`
- [ ] `<AddCategoryModal>` (color picker + icon picker)

**Hooks TanStack Query**
- [ ] `useAccounts`, `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount`
- [ ] `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`

### **Tests E2E Playwright (Jour 11-14)**

- [ ] **E2E-US-6.3a** : Créer compte
  ```typescript
  test('US-6.3a: User can create account', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/accounts');
    await page. click('text=Ajouter un compte');
    await page.fill('[name="name"]', 'Boursorama Courant');
    await page.selectOption('[name="type"]', 'CHECKING');
    await page.fill('[name="initial_balance"]', '1500');
    await page.click('button:has-text("Ajouter")');
    await expect(page. locator('text=Boursorama Courant')).toBeVisible();
  });
  ```
- [ ] **E2E-US-6.3b** : Modifier compte
- [ ] **E2E-US-6.3c** : Supprimer compte
- [ ] **E2E-US-CAT-1** : Créer catégorie
- [ ] **E2E-US-CAT-2** : Modifier catégorie
- [ ] **E2E-US-CAT-3** : Supprimer catégorie

### **Livrables Sprint 2**
✅ Feature comptes & catégories complète  
✅ Tests unitaires >80%  
✅ Tests E2E (6 user stories)  
✅ CI passante

---

## 💸 SPRINT 3 : Feature Transactions Ponctuelles (2 semaines)

### **Fonctionnalité**
Ajouter transactions ponctuelles + timeline + corbeille

### **User Stories**
- **US-3.1a** : Ajouter transaction ponctuelle passée
- **US-3. 1b** : Ajouter transaction ponctuelle future
- **US-3.1c** : Modifier transaction
- **US-3.2** : Supprimer transaction (soft delete)
- **US-7.1** : Voir corbeille
- **US-7.2** : Restaurer transaction depuis corbeille
- **US-TIMELINE-1** : Voir timeline mensuelle

### **Tâches Backend (Jour 1-5)**

**Base de Données**
- [ ] Modèle `Transaction` (complet avec états)
- [ ] Enums : `TransactionState`, `TransactionType`, `OwnerType`
- [ ] Migration Alembic

**Services**
- [ ] `transaction_service.py` (CRUD + soft delete + restore)
- [ ] `balance_service.py` (calcul soldes)

**Endpoints API**
- [ ] CRUD `/api/v1/transactions`
- [ ] `GET /api/v1/transactions/trash`
- [ ] `PATCH /api/v1/transactions/:id/restore`
- [ ] `DELETE /api/v1/transactions/:id/permanent`

**Cache Redis**
- [ ] Cache solde compte (TTL 5min)

**Tests Unitaires**
- [ ] Tests états selon date (passée=REALIZED, future=PROJECTED)
- [ ] Tests calcul solde
- [ ] Tests soft delete + restore
- [ ] Coverage >80%

### **Tâches Frontend (Jour 6-10)**

**Pages**
- [ ] Page `/timeline` (vue mensuelle)
- [ ] Page `/trash`

**Composants**
- [ ] `<TimelineHeader>`, `<MonthSelector>`, `<TransactionList>`, `<TransactionItem>`
- [ ] `<AddTransactionModal>`, `<EditTransactionModal>`, `<DeleteTransactionDialog>`
- [ ] `<TrashList>`, `<TrashItem>`

**Hooks**
- [ ] `useTransactions`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`
- [ ] `useTrash`, `useRestoreTransaction`

### **Tests E2E Playwright (Jour 11-14)**

- [ ] **E2E-US-3.1a** : Ajouter transaction passée
  ```typescript
  test('US-3.1a: Add past transaction', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/timeline');
    await page. click('text=Ajouter une transaction');
    await page. selectOption('[name="type"]', 'EXPENSE');
    await page.fill('[name="amount"]', '45');
    await page.fill('[name="name"]', 'Courses Carrefour');
    await page. fill('[name="date"]', '2025-11-25'); // Hier
    await page.click('button:has-text("Ajouter")');
    await expect(page.locator('text=Courses Carrefour')).toBeVisible();
    // Vérifier état REALIZED (icône ✓)
    await expect(page.locator('[data-transaction-state="REALIZED"]')).toBeVisible();
  });
  ```
- [ ] **E2E-US-3.1b** : Ajouter transaction future
- [ ] **E2E-US-3.1c** : Modifier transaction
- [ ] **E2E-US-3.2** : Supprimer vers corbeille
- [ ] **E2E-US-7. 1** : Voir corbeille
- [ ] **E2E-US-7.2** : Restaurer transaction
- [ ] **E2E-US-TIMELINE-1** : Navigation timeline (mois précédent/suivant)

### **Livrables Sprint 3**
✅ Feature transactions ponctuelles complète  
✅ Timeline interactive  
✅ Corbeille fonctionnelle  
✅ Tests unitaires >80%  
✅ Tests E2E (7 user stories)  
✅ CI passante

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