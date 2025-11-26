import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Category, TransactionType } from '@/types'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (category: Category) => void
  category?: Category
}

const CATEGORY_ICONS = ['🏠', '🚗', '🍔', '🎬', '💊', '🎓', '👕', '✈️', '🎮', '🔌', '📱', '💰']
const CATEGORY_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#FFD93D',
  '#6BCF7F',
  '#C77DFF',
  '#FB8500',
  '#219EBC',
]

export function CategoryDialog({ open, onOpenChange, onSave, category }: CategoryDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [icon, setIcon] = useState(CATEGORY_ICONS[0])
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [monthlyBudget, setMonthlyBudget] = useState('')

  useEffect(() => {
    if (category) {
      setName(category.name)
      setType(category.type)
      setIcon(category.icon)
      setColor(category.color)
      setMonthlyBudget(category.monthlyBudget?.toString() || '')
    } else {
      setName('')
      setType('expense')
      setIcon(CATEGORY_ICONS[0])
      setColor(CATEGORY_COLORS[0])
      setMonthlyBudget('')
    }
  }, [category, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newCategory: Category = {
      id: category?.id || Date.now().toString(),
      name,
      type,
      icon,
      color,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
      userId: 'current-user',
    }
    onSave(newCategory)
    setName('')
    setType('expense')
    setIcon(CATEGORY_ICONS[0])
    setColor(CATEGORY_COLORS[0])
    setMonthlyBudget('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Dépense</TabsTrigger>
              <TabsTrigger value="income">Revenu</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="name">Nom de la catégorie</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Courses alimentaires"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="grid grid-cols-6 gap-2">
              {CATEGORY_ICONS.map((emoji) => (
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
            <Label>Couleur</Label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORY_COLORS.map((clr) => (
                <button
                  key={clr}
                  type="button"
                  onClick={() => setColor(clr)}
                  className={`w-full aspect-square rounded-lg transition-all ${
                    color === clr ? 'ring-2 ring-foreground ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: clr }}
                />
              ))}
            </div>
          </div>

          {type === 'expense' && (
            <div className="space-y-2">
              <Label htmlFor="budget">Budget mensuel (€, optionnel)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {category ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
