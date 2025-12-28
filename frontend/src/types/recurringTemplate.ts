/**
 * Recurring Template Types
 * 
 * Types pour les templates de transactions récurrentes.
 */

export enum Frequency {
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM"
}

export const FrequencyLabels: Record<Frequency, string> = {
  [Frequency.WEEKLY]: "Hebdomadaire",
  [Frequency.MONTHLY]: "Mensuelle",
  [Frequency.QUARTERLY]: "Trimestrielle",
  [Frequency.YEARLY]: "Annuelle",
  [Frequency.CUSTOM]: "Personnalisée"
};

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER = "TRANSFER"
}

export interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  
  frequency: Frequency;
  start_date: string; // ISO date
  end_date: string | null; // ISO date
  
  day_of_month: number | null; // 1-31 for MONTHLY/QUARTERLY/YEARLY
  day_of_week: number | null; // 0-6 for WEEKLY (0=Lundi)
  custom_days: number | null; // Number of days for CUSTOM
  
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  household_id: string;
  
  is_active: string; // "true" | "false"
  created_at: string;
  updated_at: string | null;
}

export interface RecurringTemplateCreate {
  name: string;
  amount: number;
  type: TransactionType;
  description?: string;
  
  frequency: Frequency;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  
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
  is_active?: string; // "true" | "false"
}

export interface BulkCancelRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export interface BulkUpdateRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  amount: number;
}

// Helper function pour obtenir le label d'une fréquence
export function getFrequencyLabel(frequency: Frequency): string {
  return FrequencyLabels[frequency];
}

// Helper function pour obtenir les jours de la semaine
export const WeekDays = [
  { value: 0, label: "Lundi" },
  { value: 1, label: "Mardi" },
  { value: 2, label: "Mercredi" },
  { value: 3, label: "Jeudi" },
  { value: 4, label: "Vendredi" },
  { value: 5, label: "Samedi" },
  { value: 6, label: "Dimanche" }
];

// Helper function pour formatter la récurrence en texte
export function formatRecurrence(template: RecurringTemplate): string {
  const freq = FrequencyLabels[template.frequency];
  
  if (template.frequency === Frequency.WEEKLY && template.day_of_week !== null) {
    const day = WeekDays[template.day_of_week].label;
    return `${freq} le ${day}`;
  }
  
  if (template.frequency === Frequency.MONTHLY && template.day_of_month !== null) {
    return `${freq} le ${template.day_of_month}`;
  }
  
  if (template.frequency === Frequency.QUARTERLY && template.day_of_month !== null) {
    return `${freq} le ${template.day_of_month}`;
  }
  
  if (template.frequency === Frequency.YEARLY && template.day_of_month !== null) {
    const startDate = new Date(template.start_date);
    const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
    return `${freq} le ${template.day_of_month} ${month}`;
  }
  
  if (template.frequency === Frequency.CUSTOM && template.custom_days !== null) {
    return `Tous les ${template.custom_days} jours`;
  }
  
  return freq;
}
