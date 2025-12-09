import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Plus, Target as TargetIcon, Edit, Trash2, TrendingUp, Home } from 'lucide-react'
import { GoalDialog } from '@/components/GoalDialog'
import { toast } from 'sonner'
import { goalService, type Goal, type GoalCreate, type GoalUpdate, type GoalContributionUpdate } from '@/services/goalService'

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
  const [goals, setGoals] = useState<Goal[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    try {
      setLoading(true)
      const data = await goalService.list()
      setGoals(data)
    } catch (error) {
      console.error('Error loading goals:', error)
      toast.error('Erreur lors du chargement des objectifs')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSaveGoal = async (goalData: GoalCreate | GoalUpdate, currentAmount?: number) => {
    try {
      if (editingGoal) {
        // Mise à jour de l'objectif
        await goalService.update(editingGoal.id, goalData as GoalUpdate)
        
        // Remplacer le montant actuel si il a changé (PUT au lieu de PATCH)
        if (currentAmount !== undefined && currentAmount !== editingGoal.current_amount) {
          await goalService.setContribution(editingGoal.id, { amount: currentAmount })
        }
        
        toast.success('Objectif modifié avec succès')
      } else {
        // Création d'un nouvel objectif
        await goalService.create(goalData as GoalCreate)
        toast.success('Objectif créé avec succès')
      }
      await loadGoals()
      setShowDialog(false)
      setEditingGoal(undefined)
    } catch (error: any) {
      console.error('Error saving goal:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'Erreur lors de l\'enregistrement'
      toast.error(errorMessage)
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowDialog(true)
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await goalService.delete(goalId)
      await loadGoals()
      toast.success('Objectif supprimé')
    } catch (error) {
      console.error('Error deleting goal:', error)
      toast.error('Erreur lors de la suppression')
    }
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
              const progress = (goal.current_amount / goal.target_amount) * 100
              const remaining = goal.target_amount - goal.current_amount
              const isPersonal = goal.user_id !== null
              const targetDate = new Date(goal.target_date)
              const daysLeft = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              
              return (
                <Card key={goal.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isPersonal ? 'bg-primary/10' : 'bg-warning/10'
                      }`}>
                        {isPersonal ? (
                          <TrendingUp className="w-6 h-6 text-primary" />
                        ) : (
                          <Home className="w-6 h-6 text-warning" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {targetDate.toLocaleDateString('fr-FR')} ({daysLeft}j restants)
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
                        <span className="font-mono-amounts">{formatAmount(goal.current_amount)}</span>
                        <span className="font-mono-amounts text-muted-foreground">
                          {formatAmount(goal.target_amount)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% atteint</p>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    )}
                    <div className="space-y-1 pt-2 border-t border-border">
                      <p className="text-sm">
                        Il vous reste <span className="font-semibold">{formatAmount(remaining)}</span>
                      </p>
                      {daysLeft > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Économiser environ {formatAmount(remaining / (daysLeft / 30))}/mois
                        </p>
                      )}
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
