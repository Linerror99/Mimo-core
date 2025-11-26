import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Account, AccountType } from '@/types'

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (account: Account) => void
  account?: Account
}

export function AccountDialog({ open, onOpenChange, onSave, account }: AccountDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [bank, setBank] = useState('')
  const [balance, setBalance] = useState('')

  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setBank(account.bank || '')
      setBalance(account.balance.toString())
    } else {
      setName('')
      setType('checking')
      setBank('')
      setBalance('')
    }
  }, [account, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newAccount: Account = {
      id: account?.id || Date.now().toString(),
      name,
      type,
      bank,
      balance: parseFloat(balance),
      userId: 'current-user',
    }
    onSave(newAccount)
    setName('')
    setType('checking')
    setBank('')
    setBalance('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du compte</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Compte courant principal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de compte</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Compte Courant</SelectItem>
                <SelectItem value="savings">Épargne</SelectItem>
                <SelectItem value="credit">Carte de Crédit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Banque (optionnel)</Label>
            <Input
              id="bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Ex: BNP Paribas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Solde actuel (€)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {account ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
