import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronLeft, ChevronRight, User, Home as HomeIcon, Clock, Check, Eye, Edit, Trash2 } from 'lucide-react'
import type { Transaction } from '@/types'
import { TransactionDialog } from '@/components/TransactionDialog'

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

interface TimelineProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Timeline({ navigate, onLogout }: TimelineProps) {
  const [transactions, setTransactions] = useKV<Transaction[]>('transactions', [])
  const [deletedTransactions, setDeletedTransactions] = useKV<Transaction[]>('deleted-transactions', [])
  const [showDialog, setShowDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [currentMonth] = useState(new Date())

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const monthBalance = 2450

  const groupedTransactions = (transactions || []).reduce(
    (acc, transaction) => {
      const date = new Date(transaction.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      })
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(transaction)
      return acc
    },
    {} as Record<string, Transaction[]>
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'realized':
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            <Check className="w-3 h-3 mr-1" />
            Réalisé
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        )
      case 'projected':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <Eye className="w-3 h-3 mr-1" />
            Projeté
          </Badge>
        )
      default:
        return null
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowDialog(true)
  }

  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions?.find((t) => t.id === transactionId)
    if (transaction) {
      const updatedTransaction = { ...transaction, deletedAt: new Date().toISOString() }
      setTransactions((prev) => (prev || []).filter((t) => t.id !== transactionId))
      setDeletedTransactions((prev) => [...(prev || []), updatedTransaction])
    }
  }

  const handleSaveTransaction = (transaction: Transaction) => {
    if (editingTransaction) {
      setTransactions((prev) => (prev || []).map((t) => (t.id === transaction.id ? transaction : t)))
    } else {
      setTransactions((prev) => [...(prev || []), transaction])
    }
    setShowDialog(false)
    setEditingTransaction(undefined)
  }

  return (
    <Layout currentPage="timeline" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Timeline</h1>
            <p className="text-muted-foreground">Toutes vos transactions</p>
          </div>
          <Button onClick={() => setShowDialog(true)} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Ajouter
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Solde du mois:{' '}
                <span className="font-mono-amounts font-semibold text-foreground">
                  {formatAmount(monthBalance)}
                </span>
              </p>
            </div>
            <Button variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {Object.keys(groupedTransactions).length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Aucune transaction</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par ajouter votre première transaction
                </p>
                <Button onClick={() => setShowDialog(true)}>Ajouter une transaction</Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {date}
                </h3>
                <div className="space-y-2">
                  {dayTransactions.map((transaction) => (
                    <Card
                      key={transaction.id}
                      className={`p-4 ${transaction.status === 'projected' ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {transaction.attribution === 'shared' ? (
                              <HomeIcon className="w-5 h-5 text-primary" />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{transaction.name}</p>
                              {getStatusBadge(transaction.status)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {transaction.attribution === 'shared'
                                ? 'Commun'
                                : transaction.attribution === 'personal'
                                  ? 'Personnel'
                                  : 'Partenaire'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p
                            className={`font-mono-amounts text-lg font-semibold ${
                              transaction.type === 'income' ? 'text-success' : 'text-destructive'
                            }`}
                          >
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatAmount(Math.abs(transaction.amount))}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <TransactionDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open)
            if (!open) setEditingTransaction(undefined)
          }}
          onSave={handleSaveTransaction}
          transaction={editingTransaction}
        />
      </div>
    </Layout>
  )
}
