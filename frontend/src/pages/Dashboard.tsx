import { useState, useEffect, useMemo } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ValidationModal } from '@/components/ValidationModal'
import { SafeToSpendCard } from '@/components/SafeToSpendCard'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { BankLogo } from '@/components/BankLogo'
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  ArrowLeftRight, AlertCircle, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import toast from '@/utils/toast'
import logger from '@/utils/logger'
import type { Transaction, Category } from '@/types'
import { transactionService } from '@/services/transactionService'
import { projectionService } from '@/services/projectionService'
import { accountService } from '@/services/accountService'
import { categoryService } from '@/services/categoryService'
import { Notification } from '@/types/notification'
import { useAuthStore } from '@/stores/authStore'

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface DashboardProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

// Palette donut
const DONUT_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6']

export function Dashboard({ navigate, onLogout }: DashboardProps) {
  const { user } = useAuthStore()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [allMonthTransactions, setAllMonthTransactions] = useState<Transaction[]>([])
  const [projections, setProjections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)
  const [totalBalance, setTotalBalance] = useState(0)
  const [accountsCount, setAccountsCount] = useState(0)
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Auto-check du job quotidien
      try {
        await transactionService.triggerDailyJob()
      } catch (err) {
        logger.error('Failed to trigger daily job', err)
      }

      await Promise.all([
        fetchRecentTransactions(),
        fetchProjections(),
        fetchPendingTransactions(),
        fetchAccountData(),
        fetchCategories(),
      ])
    } catch (error) {
      logger.error('Failed to fetch dashboard data', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const allTransactions = await transactionService.list()
      
      // Current month transactions
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const thisMonthTxs = allTransactions.filter(t => {
        const d = new Date(t.transaction_date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.state !== 'PROJECTED'
      })
      setAllMonthTransactions(thisMonthTxs)

      // Previous month transactions
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const prevMonthTxs = allTransactions.filter(t => {
        const d = new Date(t.transaction_date)
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.state !== 'PROJECTED'
      })
      setPrevMonthTransactions(prevMonthTxs)

      // Recent 7 realized
      const realized = allTransactions
        .filter(t => t.state === 'REALIZED' && t.transaction_date <= todayStr)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 7)
      setRecentTransactions(realized)
    } catch (error) {
      logger.error('Failed to fetch recent transactions', error)
    }
  }

  const fetchProjections = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const data = await projectionService.getMonthlyProjections(year, month)
      setProjections(data.projections || [])
    } catch (error) {
      logger.error('Failed to fetch projections', error)
    }
  }

  const fetchPendingTransactions = async () => {
    try {
      const pending = await transactionService.listPending()
      setPendingTransactions(pending)
    } catch (error) {
      logger.error('Failed to fetch pending transactions', error)
      toast.error('Erreur de chargement', error)
    }
  }

  const fetchAccountData = async () => {
    try {
      const data = await accountService.getTotalBalance()
      setTotalBalance(data.total_balance || 0)
      setAccountsCount(data.accounts_count || 0)
      setAccounts(data.accounts || [])
    } catch (error) {
      logger.error('Failed to fetch accounts', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const cats = await categoryService.getCategories()
      setCategories(cats)
    } catch (error) {
      logger.error('Failed to fetch categories', error)
    }
  }

  // ─── Computed Stats ───────────────────────────────────────────────
  const monthIncome = useMemo(() =>
    allMonthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [allMonthTransactions]
  )

  const monthExpenses = useMemo(() =>
    allMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [allMonthTransactions]
  )

  const monthTransfers = useMemo(() =>
    allMonthTransactions
      .filter(t => t.type === 'TRANSFER')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [allMonthTransactions]
  )

  const prevMonthIncome = useMemo(() =>
    prevMonthTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [prevMonthTransactions]
  )

  const prevMonthExpenses = useMemo(() =>
    prevMonthTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [prevMonthTransactions]
  )

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const incomeChange = getPercentChange(monthIncome, prevMonthIncome)
  const expenseChange = getPercentChange(monthExpenses, prevMonthExpenses)

  // ─── Category distribution for donut ──────────────────────────────
  const categoryDistribution = useMemo(() => {
    const catMap: Record<string, { name: string; total: number }> = {}
    allMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const catId = t.category_id || 'uncategorized'
        const catName = categories.find(c => c.id === catId)?.name || 'Sans catégorie'
        if (!catMap[catId]) catMap[catId] = { name: catName, total: 0 }
        catMap[catId].total += Math.abs(t.amount)
      })
    return Object.values(catMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [allMonthTransactions, categories])

  const totalCatExpenses = categoryDistribution.reduce((s, c) => s + c.total, 0)

  // ─── Balance evolution for area chart ─────────────────────────────
  const balanceEvolution = useMemo(() => {
    return projections.slice(0, 6).map(proj => ({
      month: new Date(proj.year, proj.month - 1).toLocaleDateString('fr-FR', { month: 'short' }),
      solde: proj.balance || 0,
      revenus: proj.total_income || 0,
      depenses: proj.total_expenses || 0,
    }))
  }, [projections])

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleValidateClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsValidationModalOpen(true)
  }

  const handleValidateAll = async () => {
    try {
      await Promise.all(pendingTransactions.map(t => transactionService.validate(t.id)))
      toast.success('Toutes les transactions ont été validées')
      fetchPendingTransactions()
    } catch {
      toast.error('Échec de la validation groupée')
    }
  }

  const handleValidationSuccess = () => {
    fetchDashboardData()
    setIsValidationModalOpen(false)
    setSelectedTransaction(null)
  }

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const formatAmountFull = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)

  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <Layout currentPage="dashboard" navigate={navigate} onLogout={onLogout}>
        <DashboardSkeleton />
      </Layout>
    )
  }

  return (
    <Layout currentPage="dashboard" navigate={navigate} onLogout={onLogout}>
      <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* ─── HEADER ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Bienvenue{user ? `, ${user.first_name}` : ''} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Voici un aperçu de vos finances • {currentMonthName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('timeline')}
              className="text-xs font-semibold"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Timeline
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('projection')}
              className="text-xs font-semibold bg-primary hover:bg-primary/90"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Projections
            </Button>
          </div>
        </div>

        {/* ─── KPI CARDS (4 colonnes) ───────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Solde Total */}
          <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Solde Total</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">{formatAmountFull(totalBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">{accountsCount} compte{accountsCount > 1 ? 's' : ''} actif{accountsCount > 1 ? 's' : ''}</p>
          </Card>

          {/* Revenus du mois */}
          <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenus</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600">{formatAmount(monthIncome)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {incomeChange >= 0 ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <TrendingUp className="w-3 h-3 mr-0.5" />+{incomeChange.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded">
                  <TrendingDown className="w-3 h-3 mr-0.5" />{incomeChange.toFixed(1)}%
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">vs mois dernier</span>
            </div>
          </Card>

          {/* Dépenses du mois */}
          <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dépenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-rose-600">{formatAmount(monthExpenses)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {expenseChange <= 0 ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <TrendingDown className="w-3 h-3 mr-0.5" />{expenseChange.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded">
                  <TrendingUp className="w-3 h-3 mr-0.5" />+{expenseChange.toFixed(1)}%
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">vs mois dernier</span>
            </div>
          </Card>

          {/* Virements */}
          <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Virements</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-sky-500" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-sky-600">{formatAmount(monthTransfers)}</p>
            <p className="text-xs text-muted-foreground mt-1">{allMonthTransactions.filter(t => t.type === 'TRANSFER').length} opération{allMonthTransactions.filter(t => t.type === 'TRANSFER').length > 1 ? 's' : ''}</p>
          </Card>
        </div>

        {/* ─── SAFE TO SPEND ────────────────────────────────────── */}
        <SafeToSpendCard onOpenSimulator={() => navigate('goals')} />

        {/* ─── PENDING TRANSACTIONS ─────────────────────────────── */}
        {pendingTransactions.length > 0 && (
          <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-bold text-amber-950">Transactions à valider</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200/90 text-amber-900 border border-amber-300">
                  {pendingTransactions.length}
                </span>
              </div>
              {pendingTransactions.length > 1 && (
                <Button size="sm" onClick={handleValidateAll} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs">
                  Tout valider ({pendingTransactions.length})
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {pendingTransactions.map((transaction) => {
                const isTransfer = transaction.type === 'TRANSFER'
                const isIncome = transaction.type === 'INCOME' || (!isTransfer && transaction.amount > 0)
                const isExpense = transaction.type === 'EXPENSE' || (!isTransfer && transaction.amount < 0)
                const displayAmount = Math.abs(transaction.amount)
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white border border-amber-200/70 shadow-xs hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isTransfer ? 'bg-sky-100 text-sky-600' : isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-base">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {new Date(transaction.transaction_date).toLocaleDateString('fr-FR')}
                          </span>
                          {isTransfer ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-700">
                              Virement
                            </span>
                          ) : isIncome ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">
                              Revenu
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                              Dépense
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`text-lg font-bold ${
                        isTransfer ? 'text-sky-600' : isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isTransfer ? '' : isIncome ? '+' : '-'}
                        {formatAmount(displayAmount)}
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => handleValidateClick(transaction)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                      >
                        Valider
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── MIDDLE ROW: Évolution + Catégories + Comptes ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Évolution du solde — large chart (span 5) */}
          <Card className="lg:col-span-5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold">Évolution du solde</h2>
                <p className="text-xs text-muted-foreground">Projection sur 6 mois</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('projection')} className="text-xs text-primary font-semibold">
                Voir tout
              </Button>
            </div>
            <div className="h-[220px]">
              {balanceEvolution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceEvolution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSolde" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number) => [formatAmountFull(value), '']}
                      labelStyle={{ fontWeight: 700 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="solde"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#gradSolde)"
                      name="Solde"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Aucune projection disponible
                </div>
              )}
            </div>
          </Card>

          {/* Distribution des dépenses — donut (span 3) */}
          <Card className="lg:col-span-3 p-5">
            <div className="mb-3">
              <h2 className="text-sm font-bold">Répartition dépenses</h2>
              <p className="text-xs text-muted-foreground">Ce mois par catégorie</p>
            </div>
            <div className="h-[180px] flex items-center justify-center relative">
              {categoryDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="name"
                        stroke="none"
                      >
                        {categoryDistribution.map((_, index) => (
                          <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          fontSize: '11px',
                        }}
                        formatter={(value: number) => [formatAmount(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatAmount(totalCatExpenses)}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune dépense ce mois</p>
              )}
            </div>
            {/* Legend */}
            <div className="mt-2 space-y-1">
              {categoryDistribution.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span className="text-muted-foreground truncate max-w-[100px]">{cat.name}</span>
                  </div>
                  <span className="font-semibold font-mono">{totalCatExpenses > 0 ? ((cat.total / totalCatExpenses) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Comptes bancaires (span 4) */}
          <Card className="lg:col-span-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold">Mes Comptes</h2>
                <p className="text-xs text-muted-foreground">{accountsCount} compte{accountsCount > 1 ? 's' : ''}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('accounts')} className="text-xs text-primary font-semibold">
                Voir tout
              </Button>
            </div>
            <div className="space-y-2.5">
              {accounts.slice(0, 5).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate('accounts')}
                >
                  <div className="flex items-center gap-3">
                    <BankLogo accountName={acc.name} size="sm" />
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[120px]">{acc.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {acc.type === 'CHECKING' ? 'Courant' :
                         acc.type === 'SAVINGS' ? 'Épargne' :
                         acc.type === 'CASH' ? 'Espèces' : acc.type}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold font-mono ${acc.current_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatAmountFull(acc.current_balance)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── BOTTOM ROW: Transactions + Projection 6 mois ──── */}
        {/* ─── BOTTOM ROW: Dernières Transactions (full width) ── */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Dernières transactions</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('timeline')} className="text-xs text-primary font-semibold">
              Voir tout
            </Button>
          </div>

          {/* Table-like header */}
          <div className="grid grid-cols-12 gap-2 px-3 pb-2 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-5">Description</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Montant</div>
          </div>

          <div className="divide-y">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-3">Aucune transaction pour le moment</p>
                <Button size="sm" onClick={() => navigate('timeline')}>Ajouter une transaction</Button>
              </div>
            ) : (
              recentTransactions.map((transaction) => {
                const isTransfer = transaction.type === 'TRANSFER'
                const isIncome = transaction.type === 'INCOME'
                const displayAmount = Math.abs(transaction.amount)

                return (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-12 gap-2 px-3 py-3 items-center hover:bg-secondary/30 transition-colors rounded-lg cursor-pointer"
                    onClick={() => navigate('timeline')}
                  >
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isTransfer ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' :
                        isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                        'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                      }`}>
                        {isTransfer ? <ArrowLeftRight className="w-3.5 h-3.5" /> :
                         isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> :
                         <ArrowUpRight className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-medium truncate">{transaction.description}</span>
                    </div>
                    <div className="col-span-3 text-xs text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isTransfer ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' :
                        isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      }`}>
                        {isTransfer ? 'Virement' : isIncome ? 'Revenu' : 'Dépense'}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={`text-sm font-bold font-mono ${
                        isTransfer ? 'text-sky-600' : isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isTransfer ? '' : isIncome ? '+' : '-'}{formatAmount(displayAmount)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* ─── Validation Modal ──────────────────────────────────── */}
        {selectedTransaction && (
          <ValidationModal
            notification={{
              id: '',
              user_id: user?.id || '',
              type: 'validation_needed',
              message: `Valider la transaction: ${selectedTransaction.description}`,
              related_transaction_id: selectedTransaction.id,
              is_read: false,
              created_at: new Date().toISOString()
            }}
            isOpen={isValidationModalOpen}
            onClose={() => {
              setIsValidationModalOpen(false)
              setSelectedTransaction(null)
            }}
            onSuccess={handleValidationSuccess}
          />
        )}
      </div>
    </Layout>
  )
}
