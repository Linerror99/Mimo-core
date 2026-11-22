export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export type TransactionState = "REALIZED" | "PROJECTED" | "PENDING";

export type RecurrenceFrequency =
  | "NONE"
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "YEARLY";

export interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string | null;
  destination_account_id: string | null;
  description: string;
  amount: number;
  transaction_date: string;
  type: TransactionType;
  notes: string | null;
  state: TransactionState;
  recurrence_frequency: RecurrenceFrequency;
  recurrence_end_date: string | null;
  parent_transaction_id: string | null;
  recurring_template_id: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  account_name?: string;
  category_name?: string;
  destination_account_name?: string;
  goal_id?: string | null;
  goal_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  external_transaction_id?: string | null;
  destination_external_transaction_id?: string | null;
  import_source?: "manual" | "open_banking" | string;
}

export interface TransactionCreate {
  description: string;
  amount: number;
  transaction_date: string;
  type: TransactionType;
  account_id: string;
  category_id?: string | null;
  destination_account_id?: string | null;
  goal_id?: string | null;
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
  type?: TransactionType;
  account_id?: string;
  destination_account_id?: string | null;
  category_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface TransactionFilters {
  start_date?: string;
  end_date?: string;
  type?: TransactionType;
  account_id?: string;
  category_id?: string;
  state?: TransactionState;
  include_deleted?: boolean;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Revenu",
  EXPENSE: "Dépense",
  TRANSFER: "Virement",
};

export const TRANSACTION_STATE_LABELS: Record<TransactionState, string> = {
  REALIZED: "Réalisée",
  PROJECTED: "Projetée",
  PENDING: "En attente",
};

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  NONE: "Ponctuelle",
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  BIWEEKLY: "Bimensuelle",
  MONTHLY: "Mensuelle",
  YEARLY: "Annuelle",
};
