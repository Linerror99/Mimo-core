/**
 * Account Types
 */

export enum AccountType {
  CHECKING = "CHECKING",
  SAVINGS = "SAVINGS",
  INVESTMENT = "INVESTMENT",
  LOAN = "LOAN",
  CASH = "CASH",
  OTHER = "OTHER",
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  logo_url?: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  type: AccountType;
  initial_balance?: number;
  currency?: string;
  logo_url?: string | null;
}

export interface AccountUpdate {
  name?: string;
  type?: AccountType;
  initial_balance?: number;
  currency?: string;
  is_active?: boolean;
  logo_url?: string | null;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.CHECKING]: "Compte Courant",
  [AccountType.SAVINGS]: "Compte Épargne",
  [AccountType.INVESTMENT]: "Investissement",
  [AccountType.LOAN]: "Prêt",
  [AccountType.CASH]: "Espèces",
  [AccountType.OTHER]: "Autre",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  [AccountType.CHECKING]: "💳",
  [AccountType.SAVINGS]: "🏦",
  [AccountType.INVESTMENT]: "📈",
  [AccountType.LOAN]: "💰",
  [AccountType.CASH]: "💵",
  [AccountType.OTHER]: "🔖",
};
