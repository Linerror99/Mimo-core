import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { type Goal, type GoalCreate, type GoalUpdate } from '@/services/goalService'
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
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => {
    if (goal) {
      setGoalType(goal.user_id ? 'personal' : 'household')
      setName(goal.name)
      setDescription(goal.description || '')
      setTargetAmount(goal.target_amount.toString())
      setCurrentAmount(goal.current_amount.toString())
      setTargetDate(goal.target_date.split('T')[0])
    } else {
      setGoalType('personal')
      setName('')
      setDescription('')
      setTargetAmount('')
      setCurrentAmount('0')
      setTargetDate('')
    }
  }, [goal, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const currentAmountValue = parseFloat(currentAmount || '0')
    
    if (goal) {
      // Mode édition - envoyer GoalUpdate
      const updateData: GoalUpdate = {
        name,
        description: description || undefined,
        target_amount: parseFloat(targetAmount),
        target_date: targetDate,
      }
      onSave(updateData, currentAmountValue)
    } else {
      // Mode création - envoyer GoalCreate
      const createData: GoalCreate = {
        goal_type: goalType,
        name,
        description: description || undefined,
        target_amount: parseFloat(targetAmount),
        current_amount: currentAmountValue,
        target_date: targetDate,
      }
      onSave(createData, currentAmountValue)
    }
    
    // Reset form
    setGoalType('personal')
    setName('')
    setDescription('')
    setTargetAmount('')
    setCurrentAmount('0')
    setTargetDate('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Modifier l'objectif" : 'Nouvel objectif'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type d'objectif</Label>
            <RadioGroup 
              value={goalType} 
              onValueChange={(value: 'personal' | 'household') => setGoalType(value)}
              disabled={goal ? true : false} // Désactiver la modification du type en édition
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
                  disabled={!user?.is_in_couple} // Désactiver si pas en couple
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
            <Label htmlFor="name">Nom de l'objectif</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vacances d'été"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre objectif..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Montant cible (€)</Label>
            <Input
              id="target_amount"
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_amount">Montant actuel (€)</Label>
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
            <Label htmlFor="target_date">Date limite</Label>
            <Input
              id="target_date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {goal ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
