import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Plus, Target as TargetIcon, Sparkles } from 'lucide-react'
import { GoalDialog } from '@/components/GoalDialog'
import { GoalDetailModal } from '@/components/GoalDetailModal'
import { SafeToSpendCard } from '@/components/SafeToSpendCard'
import { goalService, type Goal, type GoalCreate, type GoalUpdate } from '@/services/goalService'
import { useGoalsQuery, invalidateGoals } from '@/hooks/queries/useGoalsQuery'
import { useAccountsQuery } from '@/hooks/queries/useAccountsQuery'
import { useFeedback } from '@/context/FeedbackContext'
import { GoalsSkeleton } from '@/components/skeletons/GoalsSkeleton'
import '@/styles/Goals.css'

interface SavingsGoalsSectionProps {
  onSwitchToProjects?: () => void
}

export const SavingsGoalsSection: React.FC<SavingsGoalsSectionProps> = ({ onSwitchToProjects }) => {
  const { showFeedback } = useFeedback()
  const { data: goals = [], isLoading: loadingGoals } = useGoalsQuery()
  const { data: accounts = [] } = useAccountsQuery()

  // Dialogs
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
  const [selectedGoalForDetail, setSelectedGoalForDetail] = useState<Goal | null>(null)

  const formatCurrency = (amount?: number | null) => {
    if (amount === null || amount === undefined) return 'Non défini'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Libre'
    const [y, m, d] = isoStr.split('T')[0].split('-')
    return `${d}/${m}/${y}`
  }

  const handleSaveGoal = async (goalData: GoalCreate | GoalUpdate, currentAmount?: number) => {
    try {
      if (editingGoal) {
        await goalService.update(editingGoal.id, goalData as GoalUpdate)
        if (currentAmount !== undefined && currentAmount !== editingGoal.current_amount) {
          await goalService.setContribution(editingGoal.id, { amount: currentAmount })
        }
        showFeedback({
          title: 'Objectif modifié',
          message: `L'objectif "${goalData.name}" a été mis à jour avec succès.`,
          type: 'success',
        })
      } else {
        await goalService.create(goalData as GoalCreate)
        showFeedback({
          title: 'Objectif créé',
          message: `L'objectif "${goalData.name}" a été créé avec succès.`,
          type: 'success',
        })
      }
      await invalidateGoals()
      setShowGoalDialog(false)
      setEditingGoal(undefined)
    } catch (error: any) {
      showFeedback({
        title: 'Erreur',
        message: error.response?.data?.detail || "Erreur lors de l'enregistrement de l'objectif.",
        type: 'warning',
      })
    }
  }

  const handleDeleteGoal = (goalId: string) => {
    showFeedback({
      title: 'Supprimer cet objectif ?',
      message: 'Voulez-vous vraiment supprimer cet objectif d’épargne ?',
      type: 'delete',
      showCancel: true,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await goalService.delete(goalId)
          setSelectedGoalForDetail(null)
          await invalidateGoals()
          showFeedback({
            title: 'Objectif supprimé',
            message: "L'objectif a été supprimé.",
            type: 'delete',
          })
        } catch (error) {
          console.error('Error deleting goal:', error)
          showFeedback({
            title: 'Erreur',
            message: "Erreur lors de la suppression de l'objectif.",
            type: 'warning',
          })
        }
      },
    })
  }

  if (loadingGoals && goals.length === 0) {
    return <GoalsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Top Safe-to-Spend Widget */}
      <SafeToSpendCard onOpenSimulator={onSwitchToProjects} />

      {/* Header with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-primary" />
            <span>Objectifs d'Épargne & Cagnottes</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {goals.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Suivez l'avancement de vos cagnottes, fonds d'urgence et projets d'épargne.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => {
            setEditingGoal(undefined)
            setShowGoalDialog(true)
          }}
        >
          <Plus className="w-4 h-4" /> Nouvel Objectif
        </Button>
      </div>

      {/* Goals Content */}
      {goals.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
            <TargetIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Aucun objectif d'épargne pour le moment</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            Créez une cagnotte libre ou fixez-vous un montant cible pour concrétiser vos projets financiers.
          </p>
          <Button onClick={() => setShowGoalDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Créer un objectif
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress =
              goal.target_amount && goal.target_amount > 0
                ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
                : null

            return (
              <div
                key={goal.id}
                className="goal-card cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => setSelectedGoalForDetail(goal)}
              >
                <div>
                  <div className="goal-card-header">
                    <span className={`goal-badge ${goal.user_id ? 'personal' : 'household'}`}>
                      {goal.user_id ? 'Personnel' : 'Foyer'}
                    </span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Détails →
                    </span>
                  </div>

                  <h3 className="goal-card-title mt-2 font-bold text-foreground">{goal.name}</h3>
                  {goal.description && <p className="goal-card-desc text-muted-foreground">{goal.description}</p>}

                  <div className="goal-amounts-row mt-3">
                    <span className="goal-saved-amount font-bold text-foreground">
                      {formatCurrency(goal.current_amount)}
                    </span>
                    {goal.target_amount ? (
                      <span className="goal-target-amount text-muted-foreground">
                        sur {formatCurrency(goal.target_amount)}
                      </span>
                    ) : (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                        Épargne libre
                      </span>
                    )}
                  </div>

                  {progress !== null && (
                    <div className="space-y-1 my-3">
                      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>Progression</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>

                <div className="goal-meta-grid mt-4 pt-3 border-t">
                  <div className="goal-meta-item">
                    <span className="goal-meta-label text-xs text-muted-foreground">Prélèvement</span>
                    <span className="goal-meta-val text-xs font-medium">
                      {goal.monthly_contribution ? `${formatCurrency(goal.monthly_contribution)} / mois` : 'Libre'}
                    </span>
                  </div>
                  <div className="goal-meta-item">
                    <span className="goal-meta-label text-xs text-muted-foreground">Échéance</span>
                    <span className="goal-meta-val text-xs font-medium">{formatDate(goal.target_date)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Goal Creation / Edit Dialog */}
      <GoalDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        onSubmit={handleSaveGoal}
        editingGoal={editingGoal}
        accounts={accounts}
      />

      {/* Goal Detail & Contribution Modal */}
      {selectedGoalForDetail && (
        <GoalDetailModal
          goal={selectedGoalForDetail}
          isOpen={Boolean(selectedGoalForDetail)}
          onClose={() => setSelectedGoalForDetail(null)}
          onEdit={(goal) => {
            setSelectedGoalForDetail(null)
            setEditingGoal(goal)
            setShowGoalDialog(true)
          }}
          onDelete={handleDeleteGoal}
          onUpdate={async () => {
            await invalidateGoals()
          }}
        />
      )}
    </div>
  )
}
