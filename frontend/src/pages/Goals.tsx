import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Plus, Target as TargetIcon, Edit, Trash2 } from 'lucide-react'
import { GoalDialog } from '@/components/GoalDialog'
import { toast } from 'sonner'
import type { Goal } from '@/types'

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

interface GoalsProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Goals({ navigate, onLogout }: GoalsProps) {
  const [goals, setGoals] = useKV<Goal[]>('goals', [])
  const [showDialog, setShowDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSaveGoal = (goal: Goal) => {
    if (editingGoal) {
      setGoals((prev) => (prev || []).map((g) => (g.id === goal.id ? goal : g)))
      toast.success('Objectif modifié avec succès')
    } else {
      setGoals((prev) => [...(prev || []), goal])
      toast.success('Objectif créé avec succès')
    }
    setShowDialog(false)
    setEditingGoal(undefined)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowDialog(true)
  }

  const handleDeleteGoal = (goalId: string) => {
    setGoals((prev) => (prev || []).filter((g) => g.id !== goalId))
    toast.success('Objectif supprimé')
  }

  return (
    <Layout currentPage="goals" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Objectifs d'Épargne</h1>
            <p className="text-muted-foreground">Suivez vos objectifs financiers</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="w-5 h-5" />
            Créer un objectif
          </Button>
        </div>

        {(!goals || goals.length === 0) ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <TargetIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Aucun objectif</h3>
                <p className="text-muted-foreground mb-4">
                  Définissez vos objectifs d'épargne pour rester motivé
                </p>
                <Button onClick={() => setShowDialog(true)}>Créer un objectif</Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100
              const remaining = goal.targetAmount - goal.currentAmount
              return (
                <Card key={goal.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">{goal.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(goal.deadline).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditGoal(goal)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-mono-amounts">{formatAmount(goal.currentAmount)}</span>
                        <span className="font-mono-amounts text-muted-foreground">
                          {formatAmount(goal.targetAmount)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% atteint</p>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-border">
                      <p className="text-sm">
                        Il vous reste <span className="font-semibold">{formatAmount(remaining)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Économiser environ 225€/mois pour atteindre l'objectif
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <GoalDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open)
            if (!open) setEditingGoal(undefined)
          }}
          onSave={handleSaveGoal}
          goal={editingGoal}
        />
      </div>
    </Layout>
  )
}
