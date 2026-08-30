import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ValidationModal } from '@/components/ValidationModal'
import { WalletCards } from '@/components/WalletCards'
import { SafeToSpendCard } from '@/components/SafeToSpendCard'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { TrendingUp, Clock, Check, AlertCircle } from 'lucide-react'
import toast from '@/utils/toast'
import logger from '@/utils/logger'
import type { Transaction } from '@/types'
import { transactionService } from '@/services/transactionService'
import { projectionService } from '@/services/projectionService'
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

export function Dashboard({ navigate, onLogout }: DashboardProps) {
  const { user } = useAuthStore()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [projections, setProjections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Auto-check du job quotidien pour passer automatiquement les transactions PROJECTED échues en PENDING
      try {
        await transactionService.triggerDailyJob()
      } catch (err) {
        logger.error('Failed to trigger daily job', err)
      }

      await Promise.all([
        fetchRecentTransactions(),
        fetchProjections(),
        fetchPendingTransactions(),
      ])
    } catch (error) {
      logger.error('Failed to fetch dashboard data', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      // Récupérer les 5 dernières transactions réalisées jusqu'à aujourd'hui
      const todayStr = new Date().toISOString().split('T')[0]
      const allTransactions = await transactionService.list()
      const realized = allTransactions
        .filter(t => t.state === 'REALIZED' && t.transaction_date <= todayStr)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 5)
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

  const handleValidateClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsValidationModalOpen(true)
  }

  const handleValidateAll = async () => {
    try {
      await Promise.all(
        pendingTransactions.map((t) => transactionService.validate(t.id))
      )
      toast.success('Toutes les transactions ont été validées')
      fetchPendingTransactions()
    } catch (error) {
      toast.error('Échec de la validation groupée')
    }
  }

  const handleValidationSuccess = () => {
    fetchDashboardData()
    setIsValidationModalOpen(false)
    setSelectedTransaction(null)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'realized':
        return <Check className="w-4 h-4 text-success" />
      case 'projected':
        return <Clock className="w-4 h-4 text-warning" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <Layout currentPage="dashboard" navigate={navigate} onLogout={onLogout}>
        <DashboardSkeleton />
      </Layout>
    )
  }

  return (
    <Layout currentPage="dashboard" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">
            Welcome{user ? `, ${user.first_name}` : ''}
          </h1>
          <p className="text-muted-foreground">Aperçu de votre situation financière</p>
        </div>

        {/* Portefeuilles - Utilise WalletCards (Sprint 6) */}
        <WalletCards />

        {/* Reste à Vivre Réel (Sprint V2) */}
        <SafeToSpendCard onOpenSimulator={() => navigate('goals')} />

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

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Dernières transactions</h2>
            <Button variant="ghost" onClick={() => navigate('timeline')}>
              Voir tout
            </Button>
          </div>
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Aucune transaction pour le moment</p>
                <Button onClick={() => navigate('timeline')}>Ajouter une transaction</Button>
              </div>
            ) : (
              recentTransactions.map((transaction) => {
                const isTransfer = transaction.type === 'TRANSFER'
                const isIncome = transaction.type === 'INCOME' || (!isTransfer && transaction.amount > 0)
                const isExpense = transaction.type === 'EXPENSE' || (!isTransfer && transaction.amount < 0)
                const displayAmount = Math.abs(transaction.amount)
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon('realized')}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-mono-amounts font-semibold ${
                        isTransfer ? 'text-sky-600' : isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isTransfer ? '' : isIncome ? '+' : '-'}
                      {formatAmount(displayAmount)}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Projection 6 mois</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate('projection')}>
              Voir détail
            </Button>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : projections.length > 0 ? (
            <div className="space-y-2">
              {projections.slice(0, 6).map((proj, index) => {
                const isPositive = proj.balance >= 0
                const monthLabel = new Date(proj.year, proj.month - 1).toLocaleDateString('fr-FR', { 
                  month: 'long', 
                  year: 'numeric' 
                })
                return (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-secondary/30">
                    <span className="text-sm font-medium">{monthLabel}</span>
                    <span className={`text-sm font-semibold ${
                      isPositive ? 'text-success' : 'text-destructive'
                    }`}>
                      {formatAmount(proj.balance)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-secondary/30 rounded-lg">
              <p className="text-muted-foreground">Aucune projection disponible</p>
            </div>
          )}
        </Card>

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
