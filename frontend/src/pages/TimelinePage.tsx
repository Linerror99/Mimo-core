/**
 * Timeline Page
 * 
 * Display and manage transactions (income, expenses, transfers)
 */
import React, { useState, useEffect } from "react";
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
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_STATE_LABELS,
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
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [endOfMonthBalance, setEndOfMonthBalance] = useState<number>(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [deleteOption, setDeleteOption] = useState<'single' | 'all' | 'period'>('single');
  const [deletePeriod, setDeletePeriod] = useState({ start: '', end: '' });
  
  // Date navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState<TransactionCreate>({
    amount: 0,
    description: "",
    transaction_date: new Date().toISOString().split('T')[0],
    type: TransactionType.EXPENSE,
    account_id: "",
    category_id: undefined,
  });

  // Recurring form state
  const [recurringFormData, setRecurringFormData] = useState({
    ...formData,
    recurrence_frequency: RecurrenceFrequency.MONTHLY,
    start_date: new Date().toISOString().split('T')[0],
    end_date: undefined,
  });

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les comptes et catégories
      const [accountsData, categoriesData, balanceData] = await Promise.all([
        accountService.getAccounts(),
        categoryService.getCategories(),
        accountService.getTotalBalance(),
      ]);
      
      setAccounts(accountsData);
      setCategories(categoriesData);
      setCurrentBalance(balanceData.total_balance);

      // Charger les transactions du mois
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const transactionsData = await transactionService.list({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      setTransactions(transactionsData);
      
      // Calculer le solde de fin de mois
      const totals = calculateTotalsByType(transactionsData);
      setEndOfMonthBalance(balanceData.total_balance + totals.balance);
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
      setIsRecurring(!!transaction.recurrence_frequency);
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
        transaction_date: new Date().toISOString().split('T')[0],
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
      // Ajuster le montant selon le type (EXPENSE = négatif, INCOME = positif)
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
          // Mapper les champs vers RecurringTemplateCreate
          const frequencyMap: Record<string, string> = {
            'DAILY': 'CUSTOM',
            'WEEKLY': 'WEEKLY',
            'MONTHLY': 'MONTHLY',
            'QUARTERLY': 'QUARTERLY',
            'YEARLY': 'YEARLY'
          };
          
          await recurringTemplateService.create({
            name: formData.description || `${formData.type === TransactionType.INCOME ? 'Revenu' : 'Dépense'} récurrent`,
            amount: Math.abs(formData.amount),  // Toujours positif, le backend gère le signe
            type: formData.type,
            description: formData.description,
            frequency: frequencyMap[recurringFormData.recurrence_frequency] || 'MONTHLY',
            start_date: recurringFormData.start_date,
            end_date: recurringFormData.end_date || null,
            day_of_month: recurringFormData.recurrence_frequency === 'MONTHLY' ? new Date().getDate() : undefined,
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
    console.log('Transaction à supprimer:', transaction);
    console.log('recurring_template_id:', transaction.recurring_template_id);
    
    // Si c'est une transaction récurrente, ouvrir le modal de choix
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

    // Sinon, suppression simple
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
        // Supprimer uniquement cette occurrence
        await transactionService.delete(deletingTransaction.id);
      } else if (deleteOption === 'all') {
        // Supprimer toutes les occurrences (supprimer le template)
        await recurringTemplateService.delete(deletingTransaction.recurring_template_id!);
      } else if (deleteOption === 'period') {
        // Supprimer sur une période
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Grouper les transactions par date
  const groupedTransactions = groupByDate(transactions);

  // Calculer les totaux du mois
  const totals = calculateTotalsByType(transactions);
  const monthBalance = totals.income + totals.expense; // expense est déjà négatif

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
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Ajouter
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Sélecteur de mois */}
        <div className="month-selector">
          <button className="btn btn-icon" onClick={goToPreviousMonth}>
            ◀
          </button>
          <div className="month-info">
            <h2>
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="month-balance">
              Transactions: <span className={totals.balance >= 0 ? "positive" : "negative"}>
                {formatAmount(totals.balance)}
              </span>
            </p>
          </div>
          <button className="btn btn-icon" onClick={goToNextMonth}>
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
            <span className="total-amount">{totals.transfer}</span>
          </div>
        </div>

        {/* Liste des transactions */}
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="empty-state">
            <p>Aucune transaction ce mois-ci</p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              Ajouter une transaction
            </button>
          </div>
        ) : (
          <div className="transactions-list">
            {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
              <div key={date} className="transaction-day">
                <h3 className="day-header">{formatDate(date)}</h3>
                <div className="day-transactions">
                  {dayTransactions.map((transaction) => {
                    const account = accounts.find(a => a.id === transaction.account_id);
                    const category = categories.find(c => c.id === transaction.category_id);
                    const isProjected = transaction.state === TransactionState.PROJECTED;
                    
                    return (
                      <div 
                        key={transaction.id} 
                        className={`transaction-card ${isProjected ? 'projected' : ''}`}
                      >
                        <div className="transaction-icon">
                          {TRANSACTION_TYPE_ICONS[transaction.type]}
                        </div>
                        <div className="transaction-info">
                          <div className="transaction-main">
                            <span className="transaction-description">
                              {transaction.description}
                            </span>
                            {isProjected && (
                              <span className="badge badge-projected">Projeté</span>
                            )}
                            {transaction.recurring_template_id && (
                              <span className="badge badge-recurring">
                                Récurrent
                              </span>
                            )}
                          </div>
                          <div className="transaction-details">
                            {account && <span className="detail-item">💳 {account.name}</span>}
                            {category && <span className="detail-item">🏷️ {category.name}</span>}
                          </div>
                        </div>
                        <div className="transaction-amount-actions">
                          <span className={`transaction-amount ${
                            transaction.type === TransactionType.INCOME ? 'income' : 'expense'
                          }`}>
                            {formatAmount(Math.abs(transaction.amount))}
                          </span>
                          <div className="transaction-actions">
                            <button
                              className="btn-action"
                              onClick={() => handleOpenModal(transaction)}
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-action"
                              onClick={() => handleDelete(transaction)}
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
                          onChange={() => setIsRecurring(false)}
                        />
                        Transaction ponctuelle
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="recurring"
                          checked={isRecurring}
                          onChange={() => setIsRecurring(true)}
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

                {/* Date */}
                <div className="form-group">
                  <label htmlFor="transaction_date">Date *</label>
                  <input
                    type="date"
                    id="transaction_date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>

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
                          onChange={(e) => setRecurringFormData({ 
                            ...recurringFormData, 
                            start_date: e.target.value 
                          })}
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
