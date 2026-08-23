/**
 * Timeline Page
 * 
 * Display and manage transactions (income, expenses, transfers)
 */
import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { transactionService, groupByDate, calculateTotalsByType } from "../services/transactionService";
import { recurringTemplateService } from "../services/recurringTemplateService";
import { accountService } from "../services/accountService";
import { categoryService } from "../services/categoryService";
import {
  Transaction,
  TransactionCreate,
  TransactionType,
  TransactionState,
  RecurrenceFrequency,
  TRANSACTION_TYPE_ICONS,
  RECURRENCE_FREQUENCY_LABELS,
} from "../types/transaction";
import { Account } from "../types/account";
import { Category } from "../types/category";
import { ExportButton } from "../components/ExportButton";
import "../styles/Timeline.css";

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

interface TimelineProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Timeline({ navigate, onLogout }: TimelineProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [deleteOption, setDeleteOption] = useState<'single' | 'all' | 'period'>('single');
  const [deletePeriod, setDeletePeriod] = useState({ start: '', end: '' });
  // View mode: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  // Selected day in calendar view (YYYY-MM-DD)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  // Helper pour formater une Date en YYYY-MM-DD local
  const formatLocalDate = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState<TransactionCreate>({
    amount: 0,
    description: "",
    transaction_date: formatLocalDate(),
    type: TransactionType.EXPENSE,
    account_id: "",
    category_id: undefined,
  });

  // Recurring form state
  const [recurringFormData, setRecurringFormData] = useState({
    ...formData,
    recurrence_frequency: RecurrenceFrequency.MONTHLY,
    start_date: formatLocalDate(),
    end_date: undefined as string | undefined,
  });

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les comptes et catégories
      const [accountsData, categoriesData] = await Promise.all([
        accountService.getAccounts(),
        categoryService.getCategories(),
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);

      // Charger les transactions du mois en évitant les décalages UTC
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth(); // 0-11
      const lastDay = new Date(year, month + 1, 0).getDate();
      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const transactionsData = await transactionService.list({
        start_date: startDateStr,
        end_date: endDateStr,
      });

      setTransactions(transactionsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setIsRecurring(!!transaction.recurring_template_id);
      setFormData({
        amount: Math.abs(transaction.amount),
        description: transaction.description,
        transaction_date: transaction.transaction_date,
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        destination_account_id: transaction.destination_account_id,
      });
    } else {
      setEditingTransaction(null);
      setIsRecurring(false);
      setFormData({
        amount: 0,
        description: "",
        transaction_date: formatLocalDate(),
        type: TransactionType.EXPENSE,
        account_id: accounts.length > 0 ? accounts[0].id : "",
        category_id: undefined,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setIsRecurring(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Ajuster le montant selon le type (EXPENSE = négatif, INCOME = positif, TRANSFER = négatif pour le compte source)
      const adjustedAmount = formData.type === TransactionType.INCOME
        ? Math.abs(formData.amount)
        : -Math.abs(formData.amount);

      if (editingTransaction) {
        // Mise à jour
        await transactionService.update(editingTransaction.id, {
          ...formData,
          amount: adjustedAmount,
        });
      } else {
        // Création
        if (isRecurring) {
          const frequencyMap: Record<string, string> = {
            'DAILY': 'CUSTOM',
            'WEEKLY': 'WEEKLY',
            'MONTHLY': 'MONTHLY',
            'QUARTERLY': 'QUARTERLY',
            'YEARLY': 'YEARLY'
          };

          const frequency = frequencyMap[recurringFormData.recurrence_frequency] || 'MONTHLY';
          const startDate = recurringFormData.start_date || formData.transaction_date;

          const [yearStr, monthStr, dayStr] = startDate.split('-');
          const dayOfMonth = parseInt(dayStr, 10);
          const startDateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
          const jsDay = startDateObj.getDay();
          const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

          await recurringTemplateService.create({
            name: formData.description || `${formData.type === TransactionType.INCOME ? 'Revenu' : 'Dépense'} récurrent`,
            amount: Math.abs(formData.amount),
            type: formData.type,
            description: formData.description,
            frequency: frequency,
            start_date: startDate,
            end_date: recurringFormData.end_date || null,
            day_of_month: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(frequency) ? dayOfMonth : undefined,
            day_of_week: frequency === 'WEEKLY' ? dayOfWeek : undefined,
            custom_days: frequency === 'CUSTOM' ? 1 : undefined,
            account_id: formData.account_id,
            category_id: formData.category_id || null,
          });
        } else {
          await transactionService.create({
            ...formData,
            amount: adjustedAmount,
          });
        }
      }

      await loadData();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    if (transaction.recurring_template_id) {
      setDeletingTransaction(transaction);
      setDeleteOption('single');
      setDeletePeriod({
        start: transaction.transaction_date,
        end: transaction.transaction_date
      });
      setShowDeleteModal(true);
      return;
    }

    if (!window.confirm("Supprimer cette transaction (envoi à la corbeille) ?")) {
      return;
    }

    try {
      await transactionService.delete(transaction.id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;

    try {
      if (deleteOption === 'single') {
        await transactionService.delete(deletingTransaction.id);
      } else if (deleteOption === 'all') {
        await recurringTemplateService.delete(deletingTransaction.recurring_template_id!);
      } else if (deleteOption === 'period') {
        await recurringTemplateService.bulkCancel(deletingTransaction.recurring_template_id!, {
          start_date: deletePeriod.start,
          end_date: deletePeriod.end
        });
      }

      setShowDeleteModal(false);
      setDeletingTransaction(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedCalendarDay(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedCalendarDay(null);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedCalendarDay(null);
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1));
    setSelectedCalendarDay(null);
  };

  const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1));
    setSelectedCalendarDay(null);
  };

  // Build calendar grid for current month
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday=0 in our grid (ISO week)
    const startDow = (firstDay.getDay() + 6) % 7;
    const days: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push(`${year}-${mm}-${dd}`);
    }
    return days;
  }, [currentMonth]);

  // Grouper les transactions par date
  const groupedTransactions = useMemo(() => {
    return groupByDate(transactions);
  }, [transactions]);

  // Sorted date keys for list view (chronological)
  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => a.localeCompare(b));
  }, [groupedTransactions]);

  // Calculer les totaux du mois
  const totals = useMemo(() => calculateTotalsByType(transactions), [transactions]);

  // Transactions for selected calendar day
  const selectedDayTransactions = useMemo(() => {
    if (!selectedCalendarDay) return [];
    return groupedTransactions[selectedCalendarDay] || [];
  }, [selectedCalendarDay, groupedTransactions]);

  // Years range for year selector
  const yearRange = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current - 5; y <= current + 10; y++) years.push(y);
    return years;
  }, []);

  const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (loading && transactions.length === 0) {
    return (
      <Layout currentPage="timeline" navigate={navigate} onLogout={onLogout}>
        <div className="timeline-page">
          <div className="loading">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="timeline" navigate={navigate} onLogout={onLogout}>
      <div className="timeline-page">
        <div className="timeline-header">
          <div>
            <h1>📅 Timeline</h1>
            <p className="subtitle">Toutes vos transactions</p>
          </div>
          <div className="timeline-header-actions">
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Vue liste"
              >
                ☰ Liste
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Vue calendrier"
              >
                📅 Calendrier
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              + Ajouter
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Sélecteur de mois */}
        <div className="month-selector">
          <button className="btn btn-icon" onClick={goToPreviousMonth} title="Mois précédent">
            ◀
          </button>
          <div className="month-info">
            <div className="month-selects">
              <select
                className="month-select"
                value={currentMonth.getMonth()}
                onChange={handleMonthSelect}
              >
                {MONTHS_FR.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                className="month-select"
                value={currentMonth.getFullYear()}
                onChange={handleYearSelect}
              >
                {yearRange.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="month-balance">
              <span className={totals.balance >= 0 ? "positive" : "negative"}>
                {totals.balance >= 0 ? '+' : ''}{formatAmount(totals.balance)}
              </span>
              {' '}ce mois
            </p>
          </div>
          <button className="btn btn-icon" onClick={goToNextMonth} title="Mois suivant">
            ▶
          </button>
          <button className="btn btn-secondary" onClick={goToToday}>
            Aujourd'hui
          </button>
          <ExportButton
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth() + 1}
            className="export-btn"
          />
        </div>

        {/* Résumé des totaux */}
        <div className="totals-summary">
          <div className="total-card income">
            <span className="total-label">💰 Revenus</span>
            <span className="total-amount">{formatAmount(totals.income)}</span>
          </div>
          <div className="total-card expense">
            <span className="total-label">💸 Dépenses</span>
            <span className="total-amount">{formatAmount(Math.abs(totals.expense))}</span>
          </div>
          <div className="total-card transfer">
            <span className="total-label">🔄 Virements</span>
            <span className="total-amount">{formatAmount(totals.transfer)}</span>
          </div>
        </div>

        {/* Vue Liste ou Calendrier */}
        {viewMode === 'list' ? (
          /* LISTE */
          sortedDateKeys.length === 0 ? (
            <div className="empty-state">
              <p>Aucune transaction ce mois-ci</p>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                Ajouter une transaction
              </button>
            </div>
          ) : (
            <div className="transactions-list">
              {sortedDateKeys.map((date) => {
                const dayTransactions = groupedTransactions[date];
                return (
                  <div key={date} className="transaction-day">
                    <h3 className="day-header">{formatDate(date)}</h3>
                    <div className="day-transactions">
                      {dayTransactions.map((transaction) => (
                        <TransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          accounts={accounts}
                          categories={categories}
                          onEdit={handleOpenModal}
                          onDelete={handleDelete}
                          formatAmount={formatAmount}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* CALENDRIER */
          <div className="calendar-container">
            {/* Jours de semaine */}
            <div className="calendar-grid">
              {DAYS_FR.map(d => (
                <div key={d} className="calendar-dow">{d}</div>
              ))}
              {calendarGrid.map((dayStr, idx) => {
                if (!dayStr) return <div key={`empty-${idx}`} className="calendar-cell empty" />;
                const dayTxs = groupedTransactions[dayStr] || [];
                const isToday = dayStr === formatLocalDate();
                const isSelected = dayStr === selectedCalendarDay;
                const dayNum = parseInt(dayStr.split('-')[2], 10);
                return (
                  <div
                    key={dayStr}
                    className={`calendar-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${dayTxs.length > 0 ? ' has-events' : ''}`}
                    onClick={() => setSelectedCalendarDay(isSelected ? null : dayStr)}
                  >
                    <span className="cal-day-num">{dayNum}</span>
                    <div className="cal-dots">
                      {dayTxs.map((t) => {
                        let dotClass = 'expense-dot';
                        let dotTitle = 'Dépense';
                        if (t.type === TransactionType.INCOME) {
                          dotClass = 'income-dot';
                          dotTitle = 'Revenu';
                        } else if (t.type === TransactionType.TRANSFER) {
                          dotClass = 'transfer-dot';
                          dotTitle = 'Virement';
                        }
                        return (
                          <span
                            key={t.id}
                            className={`cal-dot ${dotClass}`}
                            title={`${dotTitle}: ${t.description || formatAmount(Math.abs(t.amount))}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Panneau du jour sélectionné */}
            {selectedCalendarDay && (
              <div className="calendar-day-panel">
                <div className="calendar-day-panel-header">
                  <h3>📅 {formatDate(selectedCalendarDay)}</h3>
                  <button className="close-btn" onClick={() => setSelectedCalendarDay(null)}>×</button>
                </div>
                {selectedDayTransactions.length === 0 ? (
                  <div className="calendar-day-empty">
                    <p>Aucune transaction ce jour</p>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setFormData(prev => ({ ...prev, transaction_date: selectedCalendarDay }));
                      handleOpenModal();
                    }}>+ Ajouter</button>
                  </div>
                ) : (
                  <div className="calendar-day-transactions">
                    {selectedDayTransactions.map(transaction => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        accounts={accounts}
                        categories={categories}
                        onEdit={handleOpenModal}
                        onDelete={handleDelete}
                        formatAmount={formatAmount}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal de création/édition */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {editingTransaction ? "Modifier la transaction" : "Nouvelle transaction"}
                </h2>
                <button className="close-btn" onClick={handleCloseModal}>
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Type de transaction */}
                {!editingTransaction && (
                  <div className="form-group">
                    <label>Type</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recurring"
                          checked={!isRecurring}
                          onChange={() => {
                            setIsRecurring(false);
                            if (recurringFormData.start_date) {
                              setFormData(prev => ({ ...prev, transaction_date: recurringFormData.start_date }));
                            }
                          }}
                        />
                        Transaction ponctuelle
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recurring"
                          checked={isRecurring}
                          onChange={() => {
                            setIsRecurring(true);
                            if (formData.transaction_date) {
                              setRecurringFormData(prev => ({ ...prev, start_date: formData.transaction_date }));
                            }
                          }}
                        />
                        Transaction récurrente
                      </label>
                    </div>
                  </div>
                )}

                {/* Tabs: Revenu / Dépense / Virement */}
                <div className="form-group">
                  <label>Catégorie</label>
                  <div className="tabs">
                    <button
                      type="button"
                      className={`tab ${formData.type === TransactionType.INCOME ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: TransactionType.INCOME })}
                    >
                      💰 Revenu
                    </button>
                    <button
                      type="button"
                      className={`tab ${formData.type === TransactionType.EXPENSE ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: TransactionType.EXPENSE })}
                    >
                      💸 Dépense
                    </button>
                    <button
                      type="button"
                      className={`tab ${formData.type === TransactionType.TRANSFER ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, type: TransactionType.TRANSFER })}
                    >
                      🔄 Virement
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="description">Description *</label>
                  <input
                    type="text"
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Ex: Courses, Salaire, Loyer..."
                  />
                </div>

                {/* Montant */}
                <div className="form-group">
                  <label htmlFor="amount">Montant *</label>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                {/* Date (uniquement pour transaction ponctuelle) */}
                {!isRecurring && (
                  <div className="form-group">
                    <label htmlFor="transaction_date">Date *</label>
                    <input
                      type="date"
                      id="transaction_date"
                      value={formData.transaction_date}
                      onChange={(e) => {
                        setFormData({ ...formData, transaction_date: e.target.value });
                        setRecurringFormData(prev => ({ ...prev, start_date: e.target.value }));
                      }}
                      required
                    />
                  </div>
                )}

                {/* Compte */}
                <div className="form-group">
                  <label htmlFor="account_id">Compte *</label>
                  <select
                    id="account_id"
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un compte</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catégorie (si pas transfer) */}
                {formData.type !== TransactionType.TRANSFER && (
                  <div className="form-group">
                    <label htmlFor="category_id">Catégorie</label>
                    <select
                      id="category_id"
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value || undefined })}
                    >
                      <option value="">Sans catégorie</option>
                      {categories
                        .filter(c => c.type === formData.type)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Compte destination (si transfer) */}
                {formData.type === TransactionType.TRANSFER && (
                  <div className="form-group">
                    <label htmlFor="destination_account_id">Vers le compte *</label>
                    <select
                      id="destination_account_id"
                      value={formData.destination_account_id || ''}
                      onChange={(e) => setFormData({ ...formData, destination_account_id: e.target.value })}
                      required
                    >
                      <option value="">Sélectionner un compte</option>
                      {accounts
                        .filter(a => a.id !== formData.account_id)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Options récurrence */}
                {isRecurring && !editingTransaction && (
                  <>
                    <div className="form-group">
                      <label htmlFor="recurrence_frequency">Fréquence *</label>
                      <select
                        id="recurrence_frequency"
                        value={recurringFormData.recurrence_frequency}
                        onChange={(e) => setRecurringFormData({
                          ...recurringFormData,
                          recurrence_frequency: e.target.value as RecurrenceFrequency
                        })}
                        required
                      >
                        {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="start_date">Date de début *</label>
                        <input
                          type="date"
                          id="start_date"
                          value={recurringFormData.start_date}
                          onChange={(e) => {
                            setRecurringFormData({
                              ...recurringFormData,
                              start_date: e.target.value
                            });
                            setFormData(prev => ({ ...prev, transaction_date: e.target.value }));
                          }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="end_date">Date de fin (optionnel)</label>
                        <input
                          type="date"
                          id="end_date"
                          value={recurringFormData.end_date || ''}
                          onChange={(e) => setRecurringFormData({
                            ...recurringFormData,
                            end_date: e.target.value || undefined
                          })}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingTransaction ? "Enregistrer" : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de suppression récurrente */}
        {showDeleteModal && deletingTransaction && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Supprimer transaction récurrente</h2>
                <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>Cette transaction fait partie d'une série récurrente. Comment souhaitez-vous la supprimer ?</p>

                <div className="delete-options">
                  <label className="delete-option">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="single"
                      checked={deleteOption === 'single'}
                      onChange={() => setDeleteOption('single')}
                    />
                    <div>
                      <strong>Cette occurrence uniquement</strong>
                      <p>Supprimer seulement cette transaction ({deletingTransaction.transaction_date})</p>
                    </div>
                  </label>

                  <label className="delete-option">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="all"
                      checked={deleteOption === 'all'}
                      onChange={() => setDeleteOption('all')}
                    />
                    <div>
                      <strong>Toutes les occurrences</strong>
                      <p>Supprimer définitivement toutes les transactions de cette récurrence</p>
                    </div>
                  </label>

                  <label className="delete-option">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="period"
                      checked={deleteOption === 'period'}
                      onChange={() => setDeleteOption('period')}
                    />
                    <div>
                      <strong>Sur une période</strong>
                      <p>Supprimer les occurrences entre deux dates</p>
                    </div>
                  </label>

                  {deleteOption === 'period' && (
                    <div className="period-inputs">
                      <div className="form-group">
                        <label>Date de début</label>
                        <input
                          type="date"
                          value={deletePeriod.start}
                          onChange={(e) => setDeletePeriod({ ...deletePeriod, start: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date de fin</label>
                        <input
                          type="date"
                          value={deletePeriod.end}
                          onChange={(e) => setDeletePeriod({ ...deletePeriod, end: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── TransactionCard sub-component ───────────────────────────────────────────
interface TransactionCardProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  formatAmount: (n: number) => string;
}

function TransactionCard({ transaction, accounts, categories, onEdit, onDelete, formatAmount }: TransactionCardProps) {
  const account = accounts.find(a => a.id === transaction.account_id);
  const destinationAccount = accounts.find(a => a.id === transaction.destination_account_id);
  const category = categories.find(c => c.id === transaction.category_id);
  const isProjected = transaction.state === TransactionState.PROJECTED;
  const isIncome = transaction.type === TransactionType.INCOME;
  const isTransfer = transaction.type === TransactionType.TRANSFER;

  return (
    <div className={`transaction-card ${isProjected ? 'projected' : ''}`}>
      <div className="transaction-icon">
        {TRANSACTION_TYPE_ICONS[transaction.type]}
      </div>
      <div className="transaction-info">
        <div className="transaction-main">
          <span className="transaction-description">{transaction.description}</span>
          {isProjected && <span className="badge badge-projected">Projeté</span>}
          {transaction.recurring_template_id && (
            <span className="badge badge-recurring">Récurrent</span>
          )}
        </div>
        <div className="transaction-details">
          {isTransfer && account && destinationAccount ? (
            <span className="detail-item">💳 {account.name} ➔ 💳 {destinationAccount.name}</span>
          ) : (
            account && <span className="detail-item">💳 {account.name}</span>
          )}
          {category && <span className="detail-item">🏷️ {category.name}</span>}
        </div>
      </div>
      <div className="transaction-amount-actions">
        <span className={`transaction-amount ${isIncome ? 'income' : isTransfer ? 'transfer' : 'expense'}`}>
          {isIncome ? '+' : isTransfer ? '🔄 ' : '-'}{formatAmount(Math.abs(transaction.amount))}
        </span>
        <div className="transaction-actions">
          <button className="btn-action" onClick={() => onEdit(transaction)} title="Modifier">✏️</button>
          <button className="btn-action" onClick={() => onDelete(transaction)} title="Supprimer">🗑️</button>
        </div>
      </div>
    </div>
  );
}
