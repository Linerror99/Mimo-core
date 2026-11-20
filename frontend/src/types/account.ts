export type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "INVESTMENT"
  | "LOAN"
  | "CASH"
  | "OTHER";

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

export interface TotalBalanceResponse {
  total_balance: number;
  accounts_count: number;
  accounts: Array<{
    id: string;
    name: string;
    type: AccountType;
    initial_balance: number;
    current_balance: number;
  }>;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Compte courant",
  SAVINGS: "Épargne",
  INVESTMENT: "Investissement",
  LOAN: "Prêt",
  CASH: "Espèces",
  OTHER: "Autre",
};
