import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ValidationModal } from '@/components/ValidationModal'
import { User, Home as HomeIcon, TrendingUp, Clock, Check, Database, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { sampleTransactions, sampleAccounts, sampleCategories, sampleGoals } from '@/lib/sampleData'
import type { Transaction, Account, Category, Goal } from '@/types'
import { transactionService } from '@/services/transactionService'
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)

  useEffect(() => {
    fetchPendingTransactions()
  }, [])

  const fetchPendingTransactions = async () => {
    try {
      const pending = await transactionService.listPending()
      setPendingTransactions(pending)
    } catch (error) {
      console.error('Failed to fetch pending transactions:', error)
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
    fetchPendingTransactions()
    setIsValidationModalOpen(false)
    setSelectedTransaction(null)
  }

  const loadSampleData = () => {
    setTransactions(() => sampleTransactions)
    setAccounts(() => sampleAccounts)
    setCategories(() => sampleCategories)
    setGoals(() => sampleGoals)
    toast.success('Données d\'exemple chargées avec succès!')
  }

  const personalBalance = 1500
  const partnerBalance = 1000
  const sharedBalance = 200

  const myWalletTotal = personalBalance + sharedBalance / 2
  const partnerWalletTotal = partnerBalance + sharedBalance / 2

  const recentTransactions = (transactions || []).slice(0, 5)

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
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <Layout currentPage="dashboard" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">
              Welcome{user ? `, ${user.first_name}` : ''}
            </h1>
            <p className="text-muted-foreground">Aperçu de votre situation financière</p>
          </div>
          {(!transactions || transactions.length === 0) && (
            <Button onClick={loadSampleData} variant="outline" className="gap-2">
              <Database className="w-4 h-4" />
              Charger des données d'exemple
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Mon Portefeuille
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold font-mono-amounts">{formatAmount(myWalletTotal)}</p>
              <div className="text-sm opacity-90 space-y-1">
                <p>Personnel: {formatAmount(personalBalance)}</p>
                <p>Part commune: {formatAmount(sharedBalance / 2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/70 to-primary/60 text-primary-foreground border-0">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Partenaire
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold font-mono-amounts">{formatAmount(partnerWalletTotal)}</p>
              <div className="text-sm opacity-90 space-y-1">
                <p>Personnel: {formatAmount(partnerBalance)}</p>
                <p>Part commune: {formatAmount(sharedBalance / 2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-accent to-accent/80 text-accent-foreground border-0">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <HomeIcon className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Commun
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold font-mono-amounts">{formatAmount(sharedBalance)}</p>
              <div className="text-sm opacity-90 space-y-1">
                <p>100€ chacun</p>
              </div>
            </div>
          </Card>
        </div>

        {pendingTransactions.length > 0 && (
          <Card className="p-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-semibold">Transactions à valider</h2>
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
                  {pendingTransactions.length}
                </Badge>
              </div>
              {pendingTransactions.length > 1 && (
                <Button size="sm" onClick={handleValidateAll} className="bg-amber-600 hover:bg-amber-700">
                  Tout valider
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {pendingTransactions.map((transaction) => {
                const isExpense = transaction.amount < 0
                const displayAmount = Math.abs(transaction.amount)
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {new Date(transaction.transaction_date).toLocaleDateString('fr-FR')}
                          </Badge>
                          <Badge 
                            variant={isExpense ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {isExpense ? 'Dépense' : 'Revenu'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`font-mono-amounts text-lg font-semibold ${
                        isExpense ? 'text-destructive' : 'text-success'
                      }`}>
                        {isExpense ? '-' : '+'}
                        {formatAmount(displayAmount)}
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => handleValidateClick(transaction)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        Valider
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
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
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <p className="font-medium">{transaction.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-mono-amounts font-semibold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatAmount(Math.abs(transaction.amount))}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Projection</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate('projection')}>
              Voir détail
            </Button>
          </div>
          <div className="h-48 flex items-center justify-center bg-secondary/30 rounded-lg">
            <p className="text-muted-foreground">Graphique de projection sur 6 mois</p>
          </div>
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
