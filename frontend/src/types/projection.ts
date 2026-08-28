/**
 * Projection Types
 * 
 * Types pour les projections financières.
 */

export interface Projection {
  template_id: string;
  template_name: string;
  date: string; // ISO date
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  frequency: string;
}

export interface MonthlyProjection {
  month: number; // 1-12
  year: number;
  income: number;
  expense: number;
  transfers?: number;
  balance: number; // Patrimoine global (tous comptes)
  treasury_balance?: number; // Trésorerie courante après épargne
  projections: Projection[];
}

export interface ProjectionSummary {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2026"
  income: number;
  expense: number;
  balance: number;
}

// Helper function pour formater le mois
export function formatMonth(month: number, year: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

// Helper function pour générer les 12 prochains mois
export function getNext12Months(): { month: number; year: number }[] {
  const result: { month: number; year: number }[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({
      month: date.getMonth() + 1,
      year: date.getFullYear()
    });
  }
  
  return result;
}

// Helper function pour formatter un montant avec signe
export function formatProjectionAmount(amount: number, type: string): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(Math.abs(amount));
  
  if (type === "EXPENSE") {
    return `- ${formatted}`;
  } else if (type === "INCOME") {
    return `+ ${formatted}`;
  }
  
  return formatted;
}
