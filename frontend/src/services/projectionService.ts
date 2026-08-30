/**
 * Projection Service
 * 
 * Service pour récupérer les projections financières via l'API.
 */
import { Projection, MonthlyProjection } from '../types/projection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ProjectionService {
  /**
   * Générer les projections sur une période
   */
  async generate(startDate: string, endDate: string): Promise<Projection[]> {
    const token = localStorage.getItem('access_token');
    const url = `${API_URL}/api/v1/projections?start_date=${startDate}&end_date=${endDate}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch projections');
    }
    
    return response.json();
  }

  /**
   * Récupérer les projections pour un mois spécifique
   */
  async getMonthly(month: number, year: number): Promise<MonthlyProjection> {
    const token = localStorage.getItem('access_token');
    const url = `${API_URL}/api/v1/projections/monthly/${year}/${month}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch monthly projection');
    }
    
    return response.json();
  }

  /**
   * Récupérer les projections pour les 12 prochains mois
   */
  async getNext12Months(): Promise<MonthlyProjection[]> {
    const now = new Date();
    const projections: MonthlyProjection[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const projection = await this.getMonthly(month, year);
      projections.push(projection);
    }
    
    return projections;
  }

  /**
   * Récupérer les projections pour une plage de mois personnalisée
   */
  async getRange(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<MonthlyProjection[]> {
    const monthsToFetch: { year: number; month: number }[] = [];
    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      monthsToFetch.push({ year: curY, month: curM });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    return await Promise.all(monthsToFetch.map(({ year, month }) => this.getMonthly(month, year)));
  }

  /**
   * Récupérer les projections à partir d'un mois donné
   */
  async getMonthlyProjections(year: number, month: number) {
    const now = new Date();
    const projections: any[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, month - 1 + i, 1);
      const projMonth = date.getMonth() + 1;
      const projYear = date.getFullYear();
      
      try {
        const projection = await this.getMonthly(projMonth, projYear);
        projections.push(projection);
      } catch (error) {
        console.error(`Failed to fetch projection for ${projYear}-${projMonth}:`, error);
      }
    }
    
    return { projections };
  }

  /**
   * Récupérer le Reste à Vivre Réel (Safe-to-Spend)
   */
  async getSafeToSpend(): Promise<{
    current_balance: number;
    committed_expenses: number;
    safe_to_spend: number;
    next_income_date: string;
    next_income_amount: number;
    days_until_next_income: number;
    status: 'healthy' | 'caution' | 'danger';
    horizon_date: string;
  }> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/api/v1/projections/safe-to-spend`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch safe-to-spend');
    }
    return response.json();
  }

  /**
   * Simuler un achat / projet d'épargne (aide à la décision)
   */
  async simulatePurchase(data: {
    name: string;
    is_saving: boolean;
    total_amount?: number;
    monthly_amount?: number;
    payment_type: string;
    installments_count?: number;
    start_date: string;
    account_id?: string;
    destination_account_id?: string;
    category_id?: string;
  }) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/api/v1/projections/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to simulate purchase');
    }
    return response.json();
  }

  /**
   * Valider une simulation et créer les transactions prévisionnelles
   */
  async commitSimulation(data: {
    name: string;
    is_saving: boolean;
    total_amount?: number;
    monthly_amount?: number;
    payment_type: string;
    installments_count?: number;
    start_date: string;
    account_id?: string;
    destination_account_id?: string;
    category_id?: string;
    create_goal?: boolean;
  }) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/api/v1/projections/commit-simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to commit simulation');
    }
    return response.json();
  }
}

export const projectionService = new ProjectionService();
