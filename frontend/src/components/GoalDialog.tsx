import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { type Goal, type GoalCreate, type GoalUpdate } from '@/services/goalService'
import { accountService } from '@/services/accountService'
import { Account } from '@/types/account'
import { User, Home } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (goal: GoalCreate | GoalUpdate, currentAmount?: number) => void
  goal?: Goal
}

export function GoalDialog({ open, onOpenChange, onSave, goal }: GoalDialogProps) {
  const user = useAuthStore((state) => state.user)
  const [goalType, setGoalType] = useState<'personal' | 'household'>('personal')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hasTargetAmount, setHasTargetAmount] = useState(true)
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [targetDate, setTargetDate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    accountService.getAccounts().then(setAccounts).catch(console.error)
  }, [])

  useEffect(() => {
    if (goal) {
      setGoalType(goal.user_id ? 'personal' : 'household')
      setName(goal.name)
      setDescription(goal.description || '')
      setHasTargetAmount(goal.target_amount !== null && goal.target_amount !== undefined)
      setTargetAmount(goal.target_amount ? goal.target_amount.toString() : '')
      setCurrentAmount(goal.current_amount.toString())
      setMonthlyContribution(goal.monthly_contribution ? goal.monthly_contribution.toString() : '')
      setStartDate(new Date().toISOString().split('T')[0])
      setTargetDate(goal.target_date ? goal.target_date.split('T')[0] : '')
      setAccountId(goal.account_id || '')
      setDestinationAccountId(goal.destination_account_id || '')
    } else {
      setGoalType('personal')
      setName('')
      setDescription('')
      setHasTargetAmount(true)
      setTargetAmount('')
      setCurrentAmount('0')
      setMonthlyContribution('')
      setStartDate(new Date().toISOString().split('T')[0])
      setTargetDate('')
      setAccountId('')
      setDestinationAccountId('')
    }
  }, [goal, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const currentAmountValue = parseFloat(currentAmount || '0')
    const targetAmt = hasTargetAmount && targetAmount ? parseFloat(targetAmount) : undefined
    const monthlyContrib = monthlyContribution ? parseFloat(monthlyContribution) : undefined
    
    if (goal) {
      // Mode édition - envoyer GoalUpdate
      const updateData: GoalUpdate = {
        name,
        description: description || null,
        target_amount: (hasTargetAmount && targetAmount) ? parseFloat(targetAmount) : null,
        monthly_contribution: monthlyContribution ? parseFloat(monthlyContribution) : null,
        target_date: targetDate ? targetDate : null,
        account_id: accountId || null,
        destination_account_id: destinationAccountId || null,
      }
      onSave(updateData, currentAmountValue)
    } else {
      // Mode création - envoyer GoalCreate
      const createData: GoalCreate = {
        goal_type: goalType,
        name,
        description: description || undefined,
        target_amount: targetAmt,
        current_amount: currentAmountValue,
        monthly_contribution: monthlyContrib,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        account_id: accountId || undefined,
        destination_account_id: destinationAccountId || undefined,
      }
      onSave(createData, currentAmountValue)
    }
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Modifier l'épargne / objectif" : 'Nouvel objectif ou épargne'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulaire de gestion d'objectif financier ou d'épargne
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type d'objectif</Label>
            <RadioGroup 
              value={goalType} 
              onValueChange={(value: 'personal' | 'household') => setGoalType(value)}
              disabled={goal ? true : false}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="cursor-pointer font-normal">
                  <User className="inline w-4 h-4 mr-1" />
                  Personnel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="household" 
                  id="household" 
                  disabled={!user?.is_in_couple}
                />
                <Label 
                  htmlFor="household" 
                  className={`font-normal ${!user?.is_in_couple ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Home className="inline w-4 h-4 mr-1" />
                  Foyer {!user?.is_in_couple && '(nécessite d\'être en couple)'}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'épargne ou projet</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Épargne précaution, Voyage Japon, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails du projet..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target_amount">Montant cible (€)</Label>
              <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hasTargetAmount}
                  onChange={(e) => setHasTargetAmount(!e.target.checked)}
                />
                Épargne libre (sans cible fixe)
              </label>
            </div>
            {hasTargetAmount && (
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Ex: 5000.00"
                required={hasTargetAmount}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="current_amount">Montant déjà épargné (€)</Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_contribution">Prélèvement mensuel (€)</Label>
              <Input
                id="monthly_contribution"
                type="number"
                step="0.01"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="Ex: 200.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début / 1ère échéance</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_date">Date limite (optionnel)</Label>
              <Input
                id="target_date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="account_id">Compte source</Label>
              <select
                id="account_id"
                className="w-full p-2 border rounded-md text-sm bg-background"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Sélectionner un compte</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_account_id">Compte épargne / livret</Label>
              <select
                id="destination_account_id"
                className="w-full p-2 border rounded-md text-sm bg-background"
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
              >
                <option value="">Sélectionner un compte</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {goal ? 'Mettre à jour' : 'Créer l\'objectif'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
