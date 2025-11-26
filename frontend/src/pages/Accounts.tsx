import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, CreditCard, Edit, Trash2 } from 'lucide-react'
import { AccountDialog } from '@/components/AccountDialog'
import { toast } from 'sonner'
import type { Account } from '@/types'

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

interface AccountsProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Accounts({ navigate, onLogout }: AccountsProps) {
  const [accounts, setAccounts] = useKV<Account[]>('accounts', [])
  const [showDialog, setShowDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>()

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'checking':
        return 'Compte Courant'
      case 'savings':
        return 'Épargne'
      case 'credit':
        return 'Carte de Crédit'
      default:
        return type
    }
  }

  const handleSaveAccount = (account: Account) => {
    if (editingAccount) {
      setAccounts((prev) => (prev || []).map((a) => (a.id === account.id ? account : a)))
      toast.success('Compte modifié avec succès')
    } else {
      setAccounts((prev) => [...(prev || []), account])
      toast.success('Compte ajouté avec succès')
    }
    setShowDialog(false)
    setEditingAccount(undefined)
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setShowDialog(true)
  }

  const handleDeleteAccount = (accountId: string) => {
    setAccounts((prev) => (prev || []).filter((a) => a.id !== accountId))
    toast.success('Compte supprimé')
  }

  return (
    <Layout currentPage="accounts" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Comptes Bancaires</h1>
            <p className="text-muted-foreground">Gérez vos comptes et leurs soldes</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="w-5 h-5" />
            Ajouter un compte
          </Button>
        </div>

        {(!accounts || accounts.length === 0) ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Aucun compte</h3>
                <p className="text-muted-foreground mb-4">Commencez par ajouter votre premier compte bancaire</p>
                <Button onClick={() => setShowDialog(true)}>Ajouter un compte</Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="secondary">{getAccountTypeLabel(account.type)}</Badge>
                </div>
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold text-lg">{account.name}</h3>
                  {account.bank && <p className="text-sm text-muted-foreground">{account.bank}</p>}
                  <p className="text-2xl font-bold font-mono-amounts">{formatAmount(account.balance)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditAccount(account)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <AccountDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open)
            if (!open) setEditingAccount(undefined)
          }}
          onSave={handleSaveAccount}
          account={editingAccount}
        />
      </div>
    </Layout>
  )
}
