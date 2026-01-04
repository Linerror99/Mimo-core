# Mimo Finance - Product Requirements Document

Mimo Finance is a modern web application for personal and couples financial management, enabling users to track transactions, manage budgets, set savings goals, and project their financial future.

**Experience Qualities**:
1. **Trustworthy** - Clean, professional design with clear visual hierarchy that inspires confidence when handling money matters
2. **Effortless** - Intuitive interactions and smart defaults make financial tracking feel natural rather than burdensome
3. **Collaborative** - Seamless couple mode with shared wallets and transparent transaction management

**Complexity Level**: Light Application (multiple features with basic state)
Financial management requires multiple interconnected features (transactions, accounts, categories, projections) with persistent state, but remains focused on core money tracking without advanced analytics or integrations.

## Essential Features

### Authentication Flow
- **Functionality**: Secure login and registration with email/password
- **Purpose**: Protect sensitive financial data and enable personalized experiences
- **Trigger**: Landing on app without active session
- **Progression**: Login page → Credentials entry → Dashboard (or Register → Account creation → Dashboard)
- **Success criteria**: User can create account, login, and maintain session across visits

### Dashboard Overview
- **Functionality**: Central hub showing wallet balances, pending transactions, recent activity, and projection preview
- **Purpose**: Provide at-a-glance financial status and quick access to key actions
- **Trigger**: Post-authentication default view
- **Progression**: View balances → Review pending transactions → Scan recent activity → Navigate to detailed views
- **Success criteria**: All critical financial metrics visible within 3 seconds, zero-click awareness of financial status

### Transaction Timeline
- **Functionality**: Chronological list of all transactions (realized, pending, projected) with filtering and CRUD operations
- **Purpose**: Maintain complete transaction history with clear status indicators
- **Trigger**: Navigate from dashboard or add new transaction
- **Progression**: Select month → View grouped transactions by date → Add/Edit/Delete transaction → See updated balance
- **Success criteria**: Can add transaction in under 20 seconds, status visually distinct, balance updates immediately

### Financial Projection
- **Functionality**: 12-month forward projection graph and table based on recurring transactions
- **Purpose**: Help users anticipate future financial state and avoid negative balances
- **Trigger**: Navigate from dashboard projection preview
- **Progression**: View projection graph → Identify problem months → Click month for details → Adjust transactions → See updated projection
- **Success criteria**: Projection updates in real-time when transactions change, clearly shows deficit months

### Account Management
- **Functionality**: Track multiple bank accounts with balances and transaction counts
- **Purpose**: Organize finances across different accounts (checking, savings, credit)
- **Trigger**: Navigate to accounts section or add transaction
- **Progression**: View all accounts → Add new account → Assign transactions → Track individual balances
- **Success criteria**: Can add account in 15 seconds, transactions properly attributed

### Category System
- **Functionality**: Hierarchical expense and income categories with budgets and visual tracking
- **Purpose**: Organize spending patterns and set spending limits per category
- **Trigger**: Add/edit transaction or review spending
- **Progression**: Browse categories → Create custom category → Set monthly budget → Track progress via progress bar
- **Success criteria**: Categories have clear visual identity (color + icon), budget warnings when approaching limit

### Savings Goals
- **Functionality**: Define savings targets with deadlines and automatic progress tracking
- **Purpose**: Motivate users toward specific financial objectives
- **Trigger**: Navigate to goals section
- **Progression**: Create goal → Set target amount and date → View progress → Receive monthly savings suggestions
- **Success criteria**: Progress bar updates with transactions, calculates required monthly savings

### Couple Mode (Phase 2)
- **Functionality**: Invite partner, create shared wallet, attribute transactions to personal/partner/shared
- **Purpose**: Enable transparent financial management for couples
- **Trigger**: Settings → Household → Invite partner
- **Progression**: Send invitation → Partner accepts → Shared wallet created → Attribute transactions → Both see combined view
- **Success criteria**: Each partner sees their wallet + shared wallet, transaction attribution clear

## Edge Case Handling

- **Negative balances** - Red warning indicators, projection highlights deficit months
- **Empty states** - Friendly illustrations with clear CTAs to add first item
- **No internet** - Visual offline indicator, queue actions for later sync
- **Deleted transactions** - 30-day trash with restore capability before permanent deletion
- **Recurring transaction conflicts** - Show validation warning if recurring pattern creates duplicates
- **Partner invitation pending** - Clear pending status with resend option
- **Budget overruns** - Visual warning (red progress bar) when category spending exceeds budget

## Design Direction

The design should feel professionally modern yet approachable—like a trusted financial advisor who speaks your language. Clean lines and generous white space create calm in the inherently stressful domain of money management. The interface should recede when scanning information but provide clear affordance when action is needed. A minimal interface serves the core purpose: reducing cognitive load when dealing with numbers.

## Color Selection

**Triadic color scheme** with blue-violet primary, green for income/success, and red for expenses/warnings. This creates visual clarity where money flows (green in, red out) while maintaining brand identity.

- **Primary Color**: Blue-violet (oklch(0.59 0.19 278)) - Modern, trustworthy brand color that feels both professional and friendly, used for key actions and brand elements
- **Secondary Colors**: 
  - Success/Income (oklch(0.70 0.17 160)) - Fresh green for positive money flow
  - Danger/Expense (oklch(0.63 0.22 25)) - Warm red for spending without alarm
  - Warning (oklch(0.75 0.15 70)) - Amber for alerts and pending states
- **Accent Color**: Warm purple (oklch(0.65 0.20 300)) for couple/shared features, differentiating collaborative elements
- **Foreground/Background Pairings**:
  - Background (oklch(0.98 0 0)): Foreground (oklch(0.25 0 0)) - Ratio 13.2:1 ✓
  - Card (oklch(1 0 0)): Card-foreground (oklch(0.25 0 0)) - Ratio 14.8:1 ✓
  - Primary (oklch(0.59 0.19 278)): White text (oklch(1 0 0)) - Ratio 5.1:1 ✓
  - Secondary (oklch(0.96 0.01 278)): Secondary-foreground (oklch(0.25 0 0)) - Ratio 12.5:1 ✓
  - Accent (oklch(0.65 0.20 300)): White text (oklch(1 0 0)) - Ratio 4.8:1 ✓
  - Muted (oklch(0.96 0 0)): Muted-foreground (oklch(0.50 0 0)) - Ratio 5.2:1 ✓

## Font Selection

Inter for UI elements provides excellent legibility at all sizes with a modern, neutral personality. JetBrains Mono for monetary amounts ensures perfect alignment and scanability of numbers—critical when comparing values.

- **Typographic Hierarchy**:
  - H1 (Page Titles): Inter Semibold/32px/tight (-0.02em)
  - H2 (Section Headers): Inter Semibold/24px/tight (-0.01em)
  - H3 (Subsections): Inter Semibold/20px/normal
  - Body (Primary Text): Inter Regular/16px/relaxed (1.6)
  - Small (Labels): Inter Medium/14px/normal
  - Caption (Metadata): Inter Regular/12px/normal
  - Amounts (Money): JetBrains Mono Medium/16-24px/normal (tabular-nums)

## Animations

Animations serve exclusively functional purposes—confirming actions, establishing spatial relationships, and guiding attention during state changes. Every motion is purposeful and completes within 300ms to feel instant rather than waiting.

- **Purposeful Meaning**: Scale-down on button press confirms touch, slide-in modals establish spatial context, fade transitions between pages maintain continuity
- **Hierarchy of Movement**: Transaction additions slide in to draw attention, balance updates fade smoothly, page transitions are subtle fades to avoid disruption

## Component Selection

- **Components**: 
  - Dialog for transaction add/edit (modal focus on form)
  - Card for wallets, accounts, goals, categories (contained information blocks)
  - Button variants (primary for main actions, secondary for cancel, ghost for icon actions)
  - Input with proper focus states for forms
  - Select for dropdowns (categories, accounts, frequency)
  - Badge for status indicators (pending, realized, projected)
  - Progress for budget tracking and goal progress
  - Tabs for revenue/expense toggle
  - Calendar for date picking
  - Avatar for user profile
  - Tooltip for icon explanations
  
- **Customizations**: 
  - Transaction list items (custom card with status indicator strip)
  - Wallet cards (larger, with gradient background based on type)
  - Month selector with arrow navigation
  - Category color and icon picker (grid of options)
  
- **States**: 
  - Buttons: Default → Hover (slight darken) → Active (scale 0.98) → Disabled (50% opacity)
  - Inputs: Default → Focus (primary ring) → Error (red ring + message) → Disabled (gray background)
  - Transaction cards: Realized (full opacity) → Pending (orange badge) → Projected (70% opacity + icon)
  
- **Icon Selection**: 
  - Lucide icons throughout for consistency
  - Home (dashboard), List (timeline), TrendingUp (projection), CreditCard (accounts), Folder (categories), Target (goals), Repeat (recurring), Settings, Trash, Plus (add), ChevronLeft/Right (navigation)
  
- **Spacing**: 
  - Card padding: 24px
  - Form field gaps: 16px
  - Section margins: 32px
  - Grid gaps: 16px (mobile) / 24px (desktop)
  - Button padding: 12px 24px
  
- **Mobile**: 
  - Sidebar becomes bottom navigation with 5 items max
  - Multi-column grids become single column stacks
  - Modals become full-screen sheets on mobile
  - Tables become stacked card lists
  - Touch targets minimum 44x44px
