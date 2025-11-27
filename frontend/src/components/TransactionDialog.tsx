import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Transaction, TransactionType, TransactionAttribution, Account, Category } from '@/types'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (transaction: Transaction) => void
  transaction?: Transaction
}

export function TransactionDialog({ open, onOpenChange, onSave, transaction }: TransactionDialogProps) {
  const [accounts] = useState<Account[]>([])
  const [categories] = useState<Category[]>([])
  
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [attribution, setAttribution] = useState<TransactionAttribution>('personal')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState('default')
  const [categoryId, setCategoryId] = useState('default')

  useEffect(() => {
    if (transaction) {
      setName(transaction.name)
      setAmount(Math.abs(transaction.amount).toString())
      setType(transaction.type)
      setAttribution(transaction.attribution)
      setDate(transaction.date.split('T')[0])
      setAccountId(transaction.accountId)
      setCategoryId(transaction.categoryId)
    } else {
      setName('')
      setAmount('')
      setType('expense')
      setAttribution('personal')
      setDate(new Date().toISOString().split('T')[0])
      setAccountId(accounts && accounts.length > 0 ? accounts[0].id : 'default')
      setCategoryId('default')
    }
  }, [transaction, open, accounts])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newTransaction: Transaction = {
      id: transaction?.id || Date.now().toString(),
      name,
      amount: parseFloat(amount),
      type,
      status: transaction?.status || 'pending',
      attribution,
      categoryId,
      accountId,
      date,
      isRecurring: transaction?.isRecurring || false,
      createdBy: transaction?.createdBy || 'user',
    }
    onSave(newTransaction)
  }

  const filteredCategories = (categories || []).filter((cat) => cat.type === type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Modifier la transaction' : 'Nouvelle transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Dépense</TabsTrigger>
              <TabsTrigger value="income">Revenu</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>Attribution</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={attribution === 'personal' ? 'default' : 'outline'}
                onClick={() => setAttribution('personal')}
                className="w-full"
              >
                Moi
              </Button>
              <Button
                type="button"
                variant={attribution === 'partner' ? 'default' : 'outline'}
                onClick={() => setAttribution('partner')}
                className="w-full"
              >
                Partenaire
              </Button>
              <Button
                type="button"
                variant={attribution === 'shared' ? 'default' : 'outline'}
                onClick={() => setAttribution('shared')}
                className="w-full"
              >
                Commun
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Loyer mensuel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {accounts && accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="account">Compte</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredCategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie (optionnel)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Aucune catégorie</SelectItem>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {transaction ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
