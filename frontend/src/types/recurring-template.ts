import type { TransactionType } from "./transaction";

export type TemplateFrequency =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "CUSTOM";

export interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  frequency: TemplateFrequency;
  start_date: string;
  end_date: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
  custom_days: number | null;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  household_id: string;
  is_active: string;
  created_at: string;
  updated_at: string | null;
}

export interface RecurringTemplateCreate {
  name: string;
  amount: number;
  type: TransactionType;
  description?: string;
  frequency: TemplateFrequency;
  start_date: string;
  end_date?: string | null;
  day_of_month?: number | null;
  day_of_week?: number | null;
  custom_days?: number | null;
  account_id: string;
  destination_account_id?: string | null;
  category_id?: string | null;
}

export interface RecurringTemplateUpdate {
  name?: string;
  amount?: number;
  description?: string;
  end_date?: string | null;
  day_of_month?: number | null;
  day_of_week?: number | null;
  custom_days?: number | null;
  category_id?: string | null;
  is_active?: string;
  apply_to_future?: boolean;
}

export const TEMPLATE_FREQUENCY_LABELS: Record<TemplateFrequency, string> = {
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  YEARLY: "Annuelle",
  CUSTOM: "Personnalisée",
};
