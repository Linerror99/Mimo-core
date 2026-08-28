import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Check, Clock, Calendar, ArrowRightLeft, DollarSign } from 'lucide-react';
import { Goal, goalService } from '@/services/goalService';
import { transactionService } from '@/services/transactionService';
import { accountService } from '@/services/accountService';
import { Transaction, TransactionType, TransactionState } from '@/types/transaction';
import { Account } from '@/types/account';
import { useFeedback } from '@/context/FeedbackContext';

interface GoalDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onGoalUpdated: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  isOpen,
  onClose,
  onGoalUpdated,
  onEditGoal,
  onDeleteGoal,
}) => {
  const { showFeedback } = useFeedback();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);

  // Form for adding new contribution transaction
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txDestinationAccountId, setTxDestinationAccountId] = useState('');

  useEffect(() => {
    if (goal && isOpen) {
      loadGoalData();
      accountService.getAccounts().then(setAccounts).catch(console.error);
    }
  }, [goal, isOpen]);

  const loadGoalData = async () => {
    if (!goal) return;
    try {
      setLoadingTx(true);
      const txs = await goalService.getGoalTransactions(goal.id);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load goal transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  if (!goal || !isOpen) return null;

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined) return 'Non défini';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Aucune';
    const [y, m, d] = isoStr.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !txAmount) return;

    try {
      const amount = parseFloat(txAmount);
      const isTransfer = !!txDestinationAccountId;
      const accountId = txAccountId || goal.account_id || (accounts[0]?.id || '');

      await transactionService.create({
        amount: isTransfer ? amount : -Math.abs(amount),
        description: txDescription || `Versement ${goal.name}`,
        transaction_date: txDate,
        type: isTransfer ? TransactionType.TRANSFER : TransactionType.EXPENSE,
        account_id: accountId,
        destination_account_id: isTransfer ? txDestinationAccountId : undefined,
        goal_id: goal.id,
      });

      setShowAddTx(false);
      setTxAmount('');
      setTxDescription('');
      await loadGoalData();
      onGoalUpdated();

      showFeedback({
        title: 'Versement enregistré',
        message: `Le versement de ${amount} € a été associé à l'épargne "${goal.name}".`,
        type: 'success',
      });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erreur lors de l\'ajout du versement');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Supprimer ce versement ?')) return;
    try {
      await transactionService.delete(txId);
      await loadGoalData();
      onGoalUpdated();
      showFeedback({
        title: 'Versement supprimé',
        message: 'Le versement a été retiré de l\'épargne.',
        type: 'delete',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const progress = goal.target_amount && goal.target_amount > 0
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogDescription className="sr-only">
            Détails de l'objectif financier et historique des transactions
          </DialogDescription>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                {goal.user_id ? 'Objectif Personnel' : 'Objectif Foyer'}
              </span>
              <DialogTitle className="text-2xl font-bold mt-1">{goal.name}</DialogTitle>
              {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEditGoal(goal)}>
                <Edit className="w-4 h-4 mr-1" /> Modifier
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDeleteGoal(goal.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Progress & Target Stats */}
        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-slate-600">Montant épargné</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(goal.current_amount)}</span>
              {goal.target_amount ? (
                <span className="text-sm text-slate-500 font-medium"> / {formatCurrency(goal.target_amount)}</span>
              ) : (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full ml-2">Épargne continue</span>
              )}
            </div>
          </div>

          {progress !== null && (
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-slate-200" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block">Contribution mensuelle :</span>
              <span className="font-semibold text-slate-800 text-sm">
                {goal.monthly_contribution ? `${formatCurrency(goal.monthly_contribution)} / mois` : 'Libre'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Date d'échéance :</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(goal.target_date)}</span>
            </div>
          </div>
        </div>

        {/* Linked Transactions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Transactions & Versements liés ({transactions.length})
            </h4>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs" onClick={() => setShowAddTx(!showAddTx)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> {showAddTx ? 'Fermer' : 'Ajouter un versement'}
            </Button>
          </div>

          {/* Form to add contribution transaction */}
          {showAddTx && (
            <form onSubmit={handleAddTransaction} className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-indigo-900 uppercase">Nouveau versement pour cette épargne</h5>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-medium">Montant (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 150.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Date</Label>
                  <Input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-medium">Compte source</Label>
                  <select
                    className="w-full h-8 px-2 border rounded-md text-xs bg-background"
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                  >
                    <option value="">Compte par défaut</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Description</Label>
                  <Input
                    placeholder={`Versement ${goal.name}`}
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" type="button" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddTx(false)}>
                  Annuler
                </Button>
                <Button size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs">
                  Enregistrer le versement
                </Button>
              </div>
            </form>
          )}

          {/* Transactions List */}
          {loadingTx ? (
            <p className="text-xs text-muted-foreground text-center py-4">Chargement des transactions...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed text-slate-500">
              <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-1" />
              <p className="text-xs font-medium">Aucun versement n'a encore été associé à cet objectif.</p>
              <p className="text-[11px] text-slate-400">Ajoutez un versement ci-dessus ou liez une transaction depuis la Timeline.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const isRealized = tx.state === TransactionState.REALIZED;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-white hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`p-1.5 rounded-md ${isRealized ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isRealized ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-800">{tx.description}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-2">
                          <span>{formatDate(tx.transaction_date)}</span>
                          <span>•</span>
                          <span className={isRealized ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                            {isRealized ? 'Réalisé' : 'Prévisionnel'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-slate-900">
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                        title="Supprimer la transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
