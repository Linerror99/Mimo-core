import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, RotateCcw, X } from 'lucide-react'
import type { Transaction } from '@/types'
import { toast } from 'sonner'

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

interface TrashProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Trash({ navigate, onLogout }: TrashProps) {
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleRestore = (id: string) => {
    const transaction = deletedTransactions?.find((t) => t.id === id)
    if (transaction) {
      const { deletedAt, ...restoredTransaction } = transaction
      setTransactions((prev) => [...(prev || []), restoredTransaction])
      setDeletedTransactions((prev) => (prev || []).filter((t) => t.id !== id))
      toast.success('Transaction restaurée')
    }
  }

  const handleDeletePermanently = (id: string) => {
    setDeletedTransactions((prev) => (prev || []).filter((t) => t.id !== id))
    toast.success('Transaction supprimée définitivement')
  }

  const handleEmptyTrash = () => {
    setDeletedTransactions(() => [])
    toast.success('Corbeille vidée')
  }

  return (
    <Layout currentPage="trash" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Corbeille</h1>
            <p className="text-muted-foreground">Les éléments sont conservés 30 jours</p>
          </div>
          {deletedTransactions && deletedTransactions.length > 0 && (
            <Button variant="destructive" onClick={handleEmptyTrash} className="gap-2">
              <Trash2 className="w-5 h-5" />
              Vider la corbeille
            </Button>
          )}
        </div>

        {(!deletedTransactions || deletedTransactions.length === 0) ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Corbeille vide</h3>
                <p className="text-muted-foreground">Aucun élément supprimé</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {deletedTransactions.map((transaction) => (
              <Card key={transaction.id} className="p-4 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium">{transaction.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {transaction.type === 'income' ? 'Revenu' : 'Dépense'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Supprimé le{' '}
                      {transaction.deletedAt
                        ? new Date(transaction.deletedAt).toLocaleString('fr-FR')
                        : 'Date inconnue'}{' '}
                      par Alex
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p
                      className={`font-mono-amounts font-semibold ${
                        transaction.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatAmount(Math.abs(transaction.amount))}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(transaction.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePermanently(transaction.id)}
                        className="text-destructive gap-1"
                      >
                        <X className="w-4 h-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
