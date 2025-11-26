import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Goal } from '@/types'

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (goal: Goal) => void
  goal?: Goal
}

const GOAL_ICONS = ['🏠', '🚗', '✈️', '💍', '🎓', '💰', '🏖️', '🎯', '📱', '🎮']

export function GoalDialog({ open, onOpenChange, onSave, goal }: GoalDialogProps) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState(GOAL_ICONS[0])

  useEffect(() => {
    if (goal) {
      setName(goal.name)
      setTargetAmount(goal.targetAmount.toString())
      setCurrentAmount(goal.currentAmount.toString())
      setDeadline(goal.deadline.split('T')[0])
      setIcon(goal.icon)
    } else {
      setName('')
      setTargetAmount('')
      setCurrentAmount('0')
      setDeadline('')
      setIcon(GOAL_ICONS[0])
    }
  }, [goal, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newGoal: Goal = {
      id: goal?.id || Date.now().toString(),
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || '0'),
      deadline,
      icon,
      userId: 'current-user',
    }
    onSave(newGoal)
    setName('')
    setTargetAmount('')
    setCurrentAmount('0')
    setDeadline('')
    setIcon(GOAL_ICONS[0])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Modifier l'objectif" : 'Nouvel objectif'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Icône</Label>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl transition-colors ${
                    icon === emoji ? 'bg-primary/20 border-2 border-primary' : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Montant cible (€)</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentAmount">Montant actuel (€)</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Date limite</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
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
