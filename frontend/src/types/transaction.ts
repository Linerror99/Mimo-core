/**
 * Transaction Types
 * 
 * TypeScript types for transactions (income, expense, transfer)
 */

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export enum TransactionState {
  REALIZED = 'REALIZED',  // Transaction passée (date <= aujourd'hui)
  PROJECTED = 'PROJECTED'  // Transaction future (date > aujourd'hui)
}

export enum RecurrenceFrequency {
  NONE = 'NONE',  // Transaction ponctuelle
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string | null;
  destination_account_id: string | null;
  
  description: string;
  amount: number;
  transaction_date: string;  // ISO date string
  type: TransactionType;
  notes: string | null;
  
  state: TransactionState;  // Calculé automatiquement
  recurrence_frequency: RecurrenceFrequency;
  recurrence_end_date: string | null;
  parent_transaction_id: string | null;
  
  is_active: boolean;
  deleted_at: string | null;  // ISO datetime string
  created_at: string;
  updated_at: string;
  
  // Relations (optionnel, enrichi par le backend)
  account_name?: string;
  category_name?: string;
  destination_account_name?: string;
}

export interface TransactionCreate {
  description: string;
  amount: number;
  transaction_date: string;  // YYYY-MM-DD
  type: TransactionType;
  account_id: string;
  category_id?: string | null;
  destination_account_id?: string | null;
  notes?: string | null;
}

export interface RecurringTransactionCreate extends TransactionCreate {
  recurrence_frequency: RecurrenceFrequency;
  recurrence_end_date?: string | null;
}

export interface TransactionUpdate {
  description?: string;
  amount?: number;
  transaction_date?: string;
  category_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface TransactionFilters {
  start_date?: string;  // YYYY-MM-DD
  end_date?: string;    // YYYY-MM-DD
  type?: TransactionType;
  account_id?: string;
  category_id?: string;
  state?: TransactionState;
  include_deleted?: boolean;
}

// Labels traduits
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Revenu',
  [TransactionType.EXPENSE]: 'Dépense',
  [TransactionType.TRANSFER]: 'Virement'
};

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: '💰',
  [TransactionType.EXPENSE]: '💸',
  [TransactionType.TRANSFER]: '🔄'
};

export const TRANSACTION_STATE_LABELS: Record<TransactionState, string> = {
  [TransactionState.REALIZED]: 'Réalisée',
  [TransactionState.PROJECTED]: 'Projetée'
};

export const TRANSACTION_STATE_COLORS: Record<TransactionState, string> = {
  [TransactionState.REALIZED]: '#10B981',  // green
  [TransactionState.PROJECTED]: '#6366F1'  // indigo
};

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  [RecurrenceFrequency.NONE]: 'Ponctuelle',
  [RecurrenceFrequency.DAILY]: 'Quotidienne',
  [RecurrenceFrequency.WEEKLY]: 'Hebdomadaire',
  [RecurrenceFrequency.BIWEEKLY]: 'Bimensuelle',
  [RecurrenceFrequency.MONTHLY]: 'Mensuelle',
  [RecurrenceFrequency.YEARLY]: 'Annuelle'
};
