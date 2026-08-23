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
}

export const projectionService = new ProjectionService();
