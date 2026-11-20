export interface ProjectionEntry {
  template_id: string;
  template_name: string;
  date: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  frequency: string;
}

export interface MonthlyProjection {
  month: number;
  year: number;
  income: number;
  expense: number;
  transfers?: number;
  balance: number;
  treasury_balance?: number;
  projections: ProjectionEntry[];
}

export interface SafeToSpendData {
  current_balance: number;
  committed_expenses: number;
  safe_to_spend: number;
  next_income_date: string;
  next_income_amount: number;
  days_until_next_income: number;
  status: "healthy" | "caution" | "danger";
  horizon_date: string;
}

export type SimulationPaymentType = "DIRECT" | "INSTALLMENTS" | "RECURRING";

export interface PurchaseSimulationPayload {
  name: string;
  is_saving: boolean;
  total_amount?: number;
  monthly_amount?: number;
  payment_type: SimulationPaymentType;
  installments_count?: number;
  start_date: string;
  account_id?: string;
  destination_account_id?: string;
  category_id?: string;
  create_goal?: boolean;
}

export interface SimulationScheduleItem {
  date: string;
  amount: number;
  label: string;
}

export interface SimulationMonthlyComparison {
  month: number;
  year: number;
  month_label: string;
  base_balance: number;
  simulated_balance: number;
  sim_cost: number;
}

export interface PurchaseSimulationResult {
  name?: string;
  is_saving?: boolean;
  payment_type?: SimulationPaymentType;
  total_amount?: number;
  monthly_amount?: number;
  duration_months?: number;
  schedule?: SimulationScheduleItem[];
  feasibility_status?: "SUCCESS" | "WARNING" | "DANGER";
  feasibility_message?: string;
  min_projected_balance?: number;
  lowest_balance_month?: string;
  monthly_comparisons?: SimulationMonthlyComparison[];
  // Legacy aliases kept for backwards compatibility in tests
  is_feasible?: boolean;
  status?: string;
  message?: string;
  min_balance_after?: number;
  impact_summary?: string;
}
