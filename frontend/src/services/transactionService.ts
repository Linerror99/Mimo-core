/**
 * Transaction API Service
 * 
 * API calls for transaction CRUD operations
 */
import api from './api';
import {
  Transaction,
  TransactionCreate,
  RecurringTransactionCreate,
  TransactionUpdate,
  TransactionFilters
} from '../types/transaction';

export const transactionService = {
  /**
   * Créer une transaction ponctuelle
   */
  async create(data: TransactionCreate): Promise<Transaction> {
    const response = await api.post<Transaction>('/transactions', data);
    return response.data;
  },

  /**
   * Créer une transaction récurrente
   */
  async createRecurring(data: RecurringTransactionCreate): Promise<Transaction> {
    const response = await api.post<Transaction>('/transactions/recurring', data);
    return response.data;
  },

  /**
   * Lister les transactions avec filtres
   */
  async list(filters?: TransactionFilters): Promise<Transaction[]> {
    const params = new URLSearchParams();
    
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.type) params.append('transaction_type', filters.type);
    if (filters?.account_id) params.append('account_id', filters.account_id);
    if (filters?.category_id) params.append('category_id', filters.category_id);
    if (filters?.state) params.append('state', filters.state);
    if (filters?.include_deleted !== undefined) {
      params.append('include_deleted', String(filters.include_deleted));
    }
    
    const response = await api.get<Transaction[]>(`/transactions?${params.toString()}`);
    return response.data;
  },

  /**
   * Récupérer une transaction par ID
   */
  async getById(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  /**
   * Mettre à jour une transaction
   */
  async update(id: string, data: TransactionUpdate): Promise<Transaction> {
    const response = await api.patch<Transaction>(`/transactions/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer une transaction (soft delete → corbeille)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },

  /**
   * Lister les transactions dans la corbeille
   */
  async listTrash(): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/transactions/trash');
    return response.data;
  },

  /**
   * Restaurer une transaction depuis la corbeille
   */
  async restore(id: string): Promise<Transaction> {
    const response = await api.patch<Transaction>(`/transactions/${id}/restore`);
    return response.data;
  },

  /**
   * Supprimer définitivement une transaction
   */
  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/transactions/${id}/permanent`);
  },
};

/**
 * Calculer le solde total des transactions
 */
export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, transaction) => {
    // Ne compter que les transactions réalisées (non futures)
    if (transaction.state === 'REALIZED' && !transaction.deleted_at) {
      return sum + Number(transaction.amount);
    }
    return sum;
  }, 0);
}

/**
 * Grouper les transactions par date (pour la timeline)
 */
export function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    const date = transaction.transaction_date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
  });
  
  return grouped;
}

/**
 * Filtrer les transactions par mois
 */
export function filterByMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  return transactions.filter(transaction => {
    const date = new Date(transaction.transaction_date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

/**
 * Calculer les totaux par type
 */
export function calculateTotalsByType(transactions: Transaction[]): {
  income: number;
  expense: number;
  transfer: number;
  balance: number;
} {
  const totals = {
    income: 0,
    expense: 0,
    transfer: 0,
    balance: 0
  };

  transactions.forEach(transaction => {
    if (transaction.deleted_at) return;  // Ignorer les transactions supprimées

    const amount = Number(transaction.amount);
    
    switch (transaction.type) {
      case 'INCOME':
        totals.income += amount;
        break;
      case 'EXPENSE':
        totals.expense += amount;  // Garder le montant négatif pour le calcul algébrique
        break;
      case 'TRANSFER':
        totals.transfer += amount;
        break;
    }
    
    totals.balance += amount;
  });

  return totals;
}
