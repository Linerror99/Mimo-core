import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Wallet,
  Tag,
  Repeat,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { transactionService } from '../services/transactionService';
import { recurringTemplateService } from '../services/recurringTemplateService';
import { accountService } from '../services/accountService';
import { categoryService } from '../services/categoryService';
import {
  TransactionType,
  RecurrenceFrequency,
  RECURRENCE_FREQUENCY_LABELS
} from '../types/transaction';
import { Account } from '../types/account';
import { Category } from '../types/category';
import { useFeedback } from '../context/FeedbackContext';
import '../styles/QuickTransactionModal.css';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showFeedback } = useFeedback();

  // Data sources
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');

  // Recurring options
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(RecurrenceFrequency.MONTHLY);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [endDate, setEndDate] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load accounts and categories when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setLoadingData(true);
      Promise.all([
        accountService.getAccounts(),
        categoryService.getCategories()
      ])
        .then(([accs, cats]) => {
          setAccounts(accs);
          setCategories(cats);
          if (accs.length > 0 && !accountId) {
            setAccountId(accs[0].id);
          }
        })
        .catch((err) => {
          console.error('Erreur de chargement des données:', err);
          setErrorMessage('Impossible de charger les comptes ou catégories.');
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  }, [isOpen]);

  // Reset form helper
  const resetForm = () => {
    setDescription('');
    setAmount('');
    setErrorMessage(null);
    setCategoryId('');
    setDestinationAccountId('');
    setIsRecurring(false);
    setType(TransactionType.EXPENSE);
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${day}`;
    setTransactionDate(today);
    setStartDate(today);
    setEndDate('');
    if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  };

  // Close with reset
  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting]);

  // Submit transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Veuillez renseigner un montant supérieur à 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Veuillez renseigner une description.');
      return;
    }

    if (!accountId) {
      setErrorMessage('Veuillez sélectionner un compte.');
      return;
    }

    if (type === TransactionType.TRANSFER && !destinationAccountId) {
      setErrorMessage('Veuillez sélectionner un compte de destination.');
      return;
    }

    if (type === TransactionType.TRANSFER && accountId === destinationAccountId) {
      setErrorMessage('Le compte source et le compte de destination doivent être différents.');
      return;
    }

    try {
      setSubmitting(true);

      if (isRecurring) {
        // Fréquence mapping
        const frequencyMap: Record<string, string> = {
          'DAILY': 'CUSTOM',
          'WEEKLY': 'WEEKLY',
          'BIWEEKLY': 'WEEKLY',
          'MONTHLY': 'MONTHLY',
          'QUARTERLY': 'QUARTERLY',
          'YEARLY': 'YEARLY'
        };

        const mappedFrequency = frequencyMap[frequency] || 'MONTHLY';
        const effStartDate = startDate || transactionDate;
        const [yearStr, monthStr, dayStr] = effStartDate.split('-');
        const dayOfMonth = parseInt(dayStr, 10);
        const startDateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
        const jsDay = startDateObj.getDay();
        const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

        await recurringTemplateService.create({
          name: description.trim(),
          amount: Math.abs(numAmount),
          type: type,
          description: description.trim(),
          frequency: mappedFrequency,
          start_date: effStartDate,
          end_date: endDate || null,
          day_of_month: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(mappedFrequency) ? dayOfMonth : undefined,
          day_of_week: mappedFrequency === 'WEEKLY' ? dayOfWeek : undefined,
          custom_days: mappedFrequency === 'CUSTOM' ? 1 : undefined,
          account_id: accountId,
          destination_account_id: type === TransactionType.TRANSFER ? destinationAccountId : null,
          category_id: type !== TransactionType.TRANSFER && categoryId ? categoryId : null,
        });
      } else {
        // Ajuster le montant selon le type
        const adjustedAmount = type === TransactionType.INCOME
          ? Math.abs(numAmount)
          : -Math.abs(numAmount);

        await transactionService.create({
          description: description.trim(),
          amount: adjustedAmount,
          transaction_date: transactionDate,
          type: type,
          account_id: accountId,
          category_id: type !== TransactionType.TRANSFER && categoryId ? categoryId : null,
          destination_account_id: type === TransactionType.TRANSFER ? destinationAccountId : null,
        });
      }

      // Feedback & Global Event Dispatch
      const typeLabel = type === TransactionType.INCOME ? 'Revenu' : type === TransactionType.TRANSFER ? 'Virement' : 'Dépense';
      showFeedback({
        title: isRecurring ? 'Transaction récurrente créée' : 'Transaction enregistrée',
        message: `${typeLabel} "${description.trim()}" de ${numAmount.toFixed(2)} € créé avec succès.`,
        type: 'success'
      });

      // Dispatch event to inform other active pages (Timeline, Dashboard, Accounts)
      window.dispatchEvent(new CustomEvent('mimo-transaction-created', {
        detail: { description, amount: numAmount, type, date: transactionDate }
      }));

      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (err: any) {
      console.error('Erreur enregistrement transaction:', err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Une erreur est survenue lors de la sauvegarde.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filtrer les catégories selon le type
  const filteredCategories = categories.filter((c) => c.type === type);

  const formatAccountLabel = (acc: Account) => {
    if (acc.current_balance !== undefined && acc.current_balance !== null) {
      const num = Number(acc.current_balance);
      if (!isNaN(num)) {
        return `${acc.name} (${num.toFixed(2)} €)`;
      }
    }
    return acc.name;
  };

  return (
    <div className="quick-tx-overlay" onClick={handleClose}>
      <div
        className="quick-tx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-tx-title"
      >
        {/* Header */}
        <div className="quick-tx-header">
          <div className="quick-tx-title-group">
            <div className="quick-tx-badge-icon">
              <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 id="quick-tx-title" className="quick-tx-title">
                Nouvelle transaction
              </h2>
              <p className="quick-tx-subtitle">
                Ajoutez une opération rapidement depuis n'importe quel écran
              </p>
            </div>
          </div>
          <button
            type="button"
            className="quick-tx-close-btn"
            onClick={handleClose}
            aria-label="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="quick-tx-alert-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="quick-tx-form">
          {/* Flux Tabs (Expense / Income / Transfer) */}
          <div className="quick-tx-type-tabs">
            <button
              type="button"
              className={`quick-tx-tab expense ${type === TransactionType.EXPENSE ? 'active' : ''}`}
              onClick={() => {
                setType(TransactionType.EXPENSE);
                setCategoryId('');
              }}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Dépense</span>
            </button>
            <button
              type="button"
              className={`quick-tx-tab income ${type === TransactionType.INCOME ? 'active' : ''}`}
              onClick={() => {
                setType(TransactionType.INCOME);
                setCategoryId('');
              }}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Revenu</span>
            </button>
            <button
              type="button"
              className={`quick-tx-tab transfer ${type === TransactionType.TRANSFER ? 'active' : ''}`}
              onClick={() => {
                setType(TransactionType.TRANSFER);
                setCategoryId('');
              }}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Virement</span>
            </button>
          </div>

          {/* Ponctuelle vs Récurrente Pill */}
          <div className="quick-tx-mode-toggle">
            <button
              type="button"
              className={`quick-tx-mode-btn ${!isRecurring ? 'active' : ''}`}
              onClick={() => setIsRecurring(false)}
            >
              Ponctuelle
            </button>
            <button
              type="button"
              className={`quick-tx-mode-btn ${isRecurring ? 'active' : ''}`}
              onClick={() => setIsRecurring(true)}
            >
              <Repeat className="w-3.5 h-3.5 mr-1" />
              Récurrente
            </button>
          </div>

          {/* Row: Description & Montant */}
          <div className="quick-tx-grid-2">
            <div className="quick-tx-field">
              <label htmlFor="quick-tx-desc" className="quick-tx-label">
                Libellé / Description <span className="text-rose-500">*</span>
              </label>
              <input
                id="quick-tx-desc"
                type="text"
                className="quick-tx-input"
                placeholder={
                  type === TransactionType.EXPENSE
                    ? 'Ex: Courses supermarché'
                    : type === TransactionType.INCOME
                    ? 'Ex: Salaire, Remboursement'
                    : 'Ex: Virement épargne'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="quick-tx-field">
              <label htmlFor="quick-tx-amount" className="quick-tx-label">
                Montant (€) <span className="text-rose-500">*</span>
              </label>
              <div className="quick-tx-input-wrap">
                <input
                  id="quick-tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="quick-tx-input quick-tx-amount-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="quick-tx-currency-symbol">€</span>
              </div>
            </div>
          </div>

          {/* Row: Date (if not recurring) or Recurrence Frequency (if recurring) */}
          {!isRecurring ? (
            <div className="quick-tx-field">
              <label htmlFor="quick-tx-date" className="quick-tx-label">
                Date de l'opération <span className="text-rose-500">*</span>
              </label>
              <div className="quick-tx-input-wrap">
                <input
                  id="quick-tx-date"
                  type="date"
                  className="quick-tx-input"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
                <Calendar className="quick-tx-input-icon" />
              </div>
            </div>
          ) : (
            <div className="quick-tx-recurring-box">
              <div className="quick-tx-field">
                <label htmlFor="quick-tx-frequency" className="quick-tx-label">
                  Fréquence de répétition <span className="text-rose-500">*</span>
                </label>
                <select
                  id="quick-tx-frequency"
                  className="quick-tx-select"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                  required
                >
                  {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quick-tx-grid-2 mt-3">
                <div className="quick-tx-field">
                  <label htmlFor="quick-tx-start-date" className="quick-tx-label">
                    Date de début <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="quick-tx-start-date"
                    type="date"
                    className="quick-tx-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="quick-tx-field">
                  <label htmlFor="quick-tx-end-date" className="quick-tx-label">
                    Date de fin <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
                  </label>
                  <input
                    id="quick-tx-end-date"
                    type="date"
                    className="quick-tx-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Row: Source Account & Category / Destination Account */}
          <div className="quick-tx-grid-2">
            <div className="quick-tx-field">
              <label htmlFor="quick-tx-account" className="quick-tx-label">
                {type === TransactionType.TRANSFER ? 'Depuis le compte' : 'Compte'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <select
                id="quick-tx-account"
                className="quick-tx-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {formatAccountLabel(acc)}
                  </option>
                ))}
              </select>
            </div>

            {type === TransactionType.TRANSFER ? (
              <div className="quick-tx-field">
                <label htmlFor="quick-tx-dest-account" className="quick-tx-label">
                  Vers le compte <span className="text-rose-500">*</span>
                </label>
                <select
                  id="quick-tx-dest-account"
                  className="quick-tx-select"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un compte cible</option>
                  {accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {formatAccountLabel(acc)}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="quick-tx-field">
                <label htmlFor="quick-tx-category" className="quick-tx-label">
                  Catégorie <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <select
                  id="quick-tx-category"
                  className="quick-tx-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Sans catégorie</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="quick-tx-actions">
            <button
              type="button"
              className="quick-tx-btn-cancel"
              onClick={handleClose}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="quick-tx-btn-submit"
              disabled={submitting || loadingData}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isRecurring ? 'Créer la récurrence' : 'Ajouter la transaction'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
