import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Target as TargetIcon,
  Edit,
  Trash2,
  TrendingUp,
  Home,
  User,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Target
} from 'lucide-react'
import { GoalDialog } from '@/components/GoalDialog'
import { GoalDetailModal } from '@/components/GoalDetailModal'
import { SafeToSpendCard } from '@/components/SafeToSpendCard'
import { goalService, type Goal, type GoalCreate, type GoalUpdate } from '@/services/goalService'
import { projectionService } from '@/services/projectionService'
import { accountService } from '@/services/accountService'
import { Account } from '@/types/account'
import { useFeedback } from '@/context/FeedbackContext'
import { GoalsSkeleton } from '@/components/skeletons/GoalsSkeleton'
import '@/styles/Goals.css'

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
  const { showFeedback } = useFeedback()
  const [activeTab, setActiveTab] = useState<'savings' | 'simulator'>('savings')
  const [goals, setGoals] = useState<Goal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
  const [selectedGoalForDetail, setSelectedGoalForDetail] = useState<Goal | null>(null)

  // Simulator Form State
  const [simName, setSimName] = useState('')
  const [simIsSaving, setSimIsSaving] = useState(false)
  const [simPaymentType, setSimPaymentType] = useState<'DIRECT' | 'INSTALLMENTS' | 'RECURRING'>('INSTALLMENTS')
  const [simTotalAmount, setSimTotalAmount] = useState('1200')
  const [simMonthlyAmount, setSimMonthlyAmount] = useState('300')
  const [simInstallmentsCount, setSimInstallmentsCount] = useState('4')
  const [simStartDate, setSimStartDate] = useState(new Date().toISOString().split('T')[0])
  const [simAccountId, setSimAccountId] = useState('')
  const [simDestinationAccountId, setSimDestinationAccountId] = useState('')
  const [simulationResult, setSimulationResult] = useState<any | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [goalsData, accountsData] = await Promise.all([
        goalService.list(),
        accountService.getAccounts()
      ])
      setGoals(goalsData)
      setAccounts(accountsData)
      if (accountsData.length > 0 && !simAccountId) {
        setSimAccountId(accountsData[0].id)
      }
    } catch (error) {
      console.error('Error loading goals/accounts:', error)
    } finally {
      setLoading(false)
    }
  }

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
          type: 'success'
        })
      } else {
        await goalService.create(goalData as GoalCreate)
        showFeedback({
          title: 'Objectif créé',
          message: `L'objectif "${goalData.name}" a été créé avec succès.`,
          type: 'success'
        })
      }
      await loadData()
      setShowGoalDialog(false)
      setEditingGoal(undefined)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet objectif ?')) return
    try {
      await goalService.delete(goalId)
      setSelectedGoalForDetail(null)
      await loadData()
      showFeedback({
        title: 'Objectif supprimé',
        message: 'L\'objectif a été supprimé.',
        type: 'delete'
      })
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  // Run Simulation
  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!simName) return

    try {
      setIsSimulating(true)
      const res = await projectionService.simulatePurchase({
        name: simName,
        is_saving: simIsSaving,
        payment_type: simPaymentType,
        total_amount: simTotalAmount ? parseFloat(simTotalAmount) : undefined,
        monthly_amount: simMonthlyAmount ? parseFloat(simMonthlyAmount) : undefined,
        installments_count: parseInt(simInstallmentsCount, 10) || 1,
        start_date: simStartDate,
        account_id: simAccountId || undefined,
        destination_account_id: simIsSaving ? (simDestinationAccountId || undefined) : undefined
      })
      setSimulationResult(res)
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la simulation')
    } finally {
      setIsSimulating(false)
    }
  }

  // Commit Simulation into Timeline
  const handleCommitSimulation = async () => {
    if (!simulationResult) return
    try {
      setIsCommitting(true)
      const res = await projectionService.commitSimulation({
        name: simName,
        is_saving: simIsSaving,
        payment_type: simPaymentType,
        total_amount: simTotalAmount ? parseFloat(simTotalAmount) : undefined,
        monthly_amount: simMonthlyAmount ? parseFloat(simMonthlyAmount) : undefined,
        installments_count: parseInt(simInstallmentsCount, 10) || 1,
        start_date: simStartDate,
        account_id: simAccountId || undefined,
        destination_account_id: simIsSaving ? (simDestinationAccountId || undefined) : undefined,
        create_goal: true
      })

      await loadData()
      showFeedback({
        title: 'Simulation validée',
        message: res.message || 'Les transactions prévisionnelles ont été créées dans votre Timeline.',
        type: 'success'
      })
      setActiveTab('savings')
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation')
    } finally {
      setIsCommitting(false)
    }
  }

  if (loading && goals.length === 0) {
    return (
      <Layout currentPage="goals" navigate={navigate} onLogout={onLogout}>
        <GoalsSkeleton />
      </Layout>
    )
  }

  return (
    <Layout currentPage="goals" navigate={navigate} onLogout={onLogout}>
      <div className="goals-container space-y-6">
        {/* Top Safe-to-Spend Widget */}
        <SafeToSpendCard onOpenSimulator={() => setActiveTab('simulator')} />

        {/* Header with Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Épargne & Aide à la Décision</h1>
            <p className="text-sm text-slate-500">Gérez vos objectifs d'épargne connectés et simulez vos achats avant décision.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="goals-tabs-nav">
              <button
                type="button"
                className={`goals-tab-btn ${activeTab === 'savings' ? 'active' : ''}`}
                onClick={() => setActiveTab('savings')}
              >
                <TargetIcon className="w-4 h-4" />
                <span>Mes Épargnes & Projets ({goals.length})</span>
              </button>
              <button
                type="button"
                className={`goals-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setActiveTab('simulator')}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Simulateur d'Achat</span>
              </button>
            </div>

            {activeTab === 'savings' && (
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-10 gap-1.5" onClick={() => { setEditingGoal(undefined); setShowGoalDialog(true); }}>
                <Plus className="w-4 h-4" /> Nouvel Objectif
              </Button>
            )}
          </div>
        </div>

        {/* ─── TAB 1: SAVINGS & SINKING FUNDS ───────────────────────────── */}
        {activeTab === 'savings' && (
          <div>
            {loading ? (
              <div className="text-center py-16 text-slate-400">Chargement de vos objectifs...</div>
            ) : goals.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
                  <TargetIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Aucun objectif d'épargne pour le moment</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  Créez une épargne libre ou avec montant cible, ou simulez un projet d'achat avec notre simulateur d'aide à la décision.
                </p>
                <div className="flex justify-center gap-3">
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowGoalDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Créer un objectif
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('simulator')}>
                    <Zap className="w-4 h-4 mr-1 text-amber-500" /> Utiliser le simulateur
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="goals-grid">
                {goals.map((goal) => {
                  const progress = goal.target_amount && goal.target_amount > 0
                    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
                    : null

                  return (
                    <div
                      key={goal.id}
                      className="goal-card"
                      onClick={() => setSelectedGoalForDetail(goal)}
                    >
                      <div>
                        <div className="goal-card-header">
                          <span className={`goal-badge ${goal.user_id ? 'personal' : 'household'}`}>
                            {goal.user_id ? 'Personnel' : 'Foyer'}
                          </span>
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            Détails & Versements →
                          </span>
                        </div>

                        <h3 className="goal-card-title">{goal.name}</h3>
                        {goal.description && <p className="goal-card-desc">{goal.description}</p>}

                        <div className="goal-amounts-row">
                          <span className="goal-saved-amount">{formatCurrency(goal.current_amount)}</span>
                          {goal.target_amount ? (
                            <span className="goal-target-amount">sur {formatCurrency(goal.target_amount)}</span>
                          ) : (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">Épargne libre</span>
                          )}
                        </div>

                        {progress !== null && (
                          <div className="space-y-1 my-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Progression</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-slate-100" />
                          </div>
                        )}
                      </div>

                      <div className="goal-meta-grid">
                        <div className="goal-meta-item">
                          <span className="goal-meta-label">Prélèvement</span>
                          <span className="goal-meta-val">
                            {goal.monthly_contribution ? `${formatCurrency(goal.monthly_contribution)} / mois` : 'Libre'}
                          </span>
                        </div>
                        <div className="goal-meta-item">
                          <span className="goal-meta-label">Horizon</span>
                          <span className="goal-meta-val">{formatDate(goal.target_date)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: PURCHASE & SAVINGS SIMULATOR ───────────────────────── */}
        {activeTab === 'simulator' && (
          <div className="simulator-layout">
            {/* Form */}
            <div className="simulator-form-card">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-amber-500" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Simulateur d'Achat & Projet</h2>
                  <p className="text-xs text-slate-500">Évaluez la faisabilité financière avant d'engager une dépense</p>
                </div>
              </div>

              <form onSubmit={handleRunSimulation} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-slate-600">Type de projet</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${!simIsSaving ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      onClick={() => {
                        setSimIsSaving(false)
                        setSimPaymentType('INSTALLMENTS')
                      }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Achat / Dépense</span>
                    </button>
                    <button
                      type="button"
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${simIsSaving ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      onClick={() => {
                        setSimIsSaving(true)
                        setSimPaymentType('RECURRING')
                      }}
                    >
                      <Target className="w-4 h-4" />
                      <span>Projet d'Épargne</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">
                    {simIsSaving ? "Nom de l'épargne ou projet" : "Nom de l'achat"}
                  </Label>
                  <Input
                    required
                    placeholder={simIsSaving ? "Ex: Fonds de secours, Vacances été, etc." : "Ex: MacBook Pro, TV OLED, etc."}
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                  />
                </div>

                {/* ─── CAS 1 : ACHAT / DÉPENSE ─── */}
                {!simIsSaving ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Mode de paiement</Label>
                      <select
                        className="w-full p-2 border rounded-md text-sm bg-background"
                        value={simPaymentType}
                        onChange={(e) => setSimPaymentType(e.target.value as any)}
                      >
                        <option value="DIRECT">Paiement comptant (1x)</option>
                        <option value="INSTALLMENTS">Paiement en plusieurs fois (Nx : 3x, 4x, 10x, 12x...)</option>
                      </select>
                    </div>

                    {simPaymentType === 'DIRECT' ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Montant total (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Ex: 800.00"
                          value={simTotalAmount}
                          onChange={(e) => setSimTotalAmount(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Montant total (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Ex: 1200.00"
                            value={simTotalAmount}
                            onChange={(e) => setSimTotalAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Nombre de fois / mois</Label>
                          <Input
                            type="number"
                            min="1"
                            max="60"
                            value={simInstallmentsCount}
                            onChange={(e) => setSimInstallmentsCount(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ─── CAS 2 : PROJET D'ÉPARGNE ─── */
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-600">Montant cible (€)</Label>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!simTotalAmount}
                            onChange={(e) => setSimTotalAmount(e.target.checked ? '' : '1000')}
                          />
                          Épargne libre (sans cible fixe)
                        </label>
                      </div>
                      {simTotalAmount !== '' && (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 3000.00"
                          value={simTotalAmount}
                          onChange={(e) => setSimTotalAmount(e.target.value)}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Prélèvement mensuel (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Ex: 200.00"
                          value={simMonthlyAmount}
                          onChange={(e) => setSimMonthlyAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Durée (en mois)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={simInstallmentsCount}
                          onChange={(e) => setSimInstallmentsCount(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">
                    {simIsSaving ? "Date de début (première échéance)" : "Date du premier paiement"}
                  </Label>
                  <Input
                    type="date"
                    required
                    value={simStartDate}
                    onChange={(e) => setSimStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Compte source</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm bg-background"
                    value={simAccountId}
                    onChange={(e) => setSimAccountId(e.target.value)}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                {simIsSaving && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Compte épargne de destination</Label>
                    <select
                      className="w-full p-2 border rounded-md text-sm bg-background"
                      value={simDestinationAccountId}
                      onChange={(e) => setSimDestinationAccountId(e.target.value)}
                    >
                      <option value="">Sélectionner un compte épargne</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Button type="submit" disabled={isSimulating} className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold mt-2">
                  {isSimulating ? 'Calcul en cours...' : 'Lancer la simulation'}
                </Button>
              </form>
            </div>

            {/* Results / Diagnostics */}
            <div className="simulator-results-col">
              {!simulationResult ? (
                <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed text-slate-400 text-center">
                  <Sparkles className="w-12 h-12 text-indigo-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-700">Prêt pour votre simulation</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Renseignez les détails de votre projet à gauche et cliquez sur "Lancer la simulation" pour obtenir un diagnostic instantané de faisabilité.
                  </p>
                </div>
              ) : (
                <>
                  {/* Feasibility Card */}
                  <div className={`feasibility-card ${simulationResult.feasibility_status}`}>
                    <div className="feasibility-header">
                      {simulationResult.feasibility_status === 'SUCCESS' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                      {simulationResult.feasibility_status === 'WARNING' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                      {simulationResult.feasibility_status === 'DANGER' && <XCircle className="w-6 h-6 text-rose-600" />}
                      <span className="feasibility-status-badge">
                        {simulationResult.feasibility_status === 'SUCCESS' ? 'PROJET VIABLE' : simulationResult.feasibility_status === 'WARNING' ? 'ATTENTION' : 'RISQUE ÉLEVÉ'}
                      </span>
                    </div>

                    <div className="feasibility-message">
                      {simulationResult.feasibility_message}
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-slate-500 block">Coût total :</span>
                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(simulationResult.total_amount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Mensualité :</span>
                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(simulationResult.monthly_amount)} / mois</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Solde min projeté :</span>
                        <span className={`font-bold text-sm ${simulationResult.min_projected_balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(simulationResult.min_projected_balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Table */}
                  <div className="schedule-table-card">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Échéancier prévisionnel ({simulationResult.schedule.length} échéances)
                    </h4>
                    <div className="max-h-56 overflow-y-auto">
                      <table className="schedule-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th className="text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationResult.schedule.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="font-medium text-slate-600">{formatDate(item.date)}</td>
                              <td>{item.label}</td>
                              <td className="text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Commit Button */}
                  <button
                    type="button"
                    disabled={isCommitting}
                    className="btn-commit-simulation"
                    onClick={handleCommitSimulation}
                  >
                    <span>Valider et intégrer à ma Timeline</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Goal Detail Modal */}
        <GoalDetailModal
          goal={selectedGoalForDetail}
          isOpen={!!selectedGoalForDetail}
          onClose={() => setSelectedGoalForDetail(null)}
          onGoalUpdated={loadData}
          onEditGoal={(goal) => {
            setSelectedGoalForDetail(null)
            setEditingGoal(goal)
            setShowGoalDialog(true)
          }}
          onDeleteGoal={handleDeleteGoal}
        />

        {/* Goal Create/Edit Dialog */}
        <GoalDialog
          open={showGoalDialog}
          onOpenChange={setShowGoalDialog}
          onSave={handleSaveGoal}
          goal={editingGoal}
        />
      </div>
    </Layout>
  )
}
