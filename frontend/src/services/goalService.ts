import api from './api';
import { useAuthStore } from '@/stores/authStore';
import { Transaction } from '@/types/transaction';

export type GoalType = 'personal' | 'household';

export interface Goal {
  id: string;
  household_id: string | null;
  user_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  target_amount?: number | null;
  current_amount: number;
  monthly_contribution?: number | null;
  target_date?: string | null; // ISO date
  account_id?: string | null;
  destination_account_id?: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  progress_percentage?: number;
  is_completed?: boolean;
  remaining_amount?: number;
}

export interface GoalCreate {
  goal_type: GoalType;
  name: string;
  description?: string;
  target_amount?: number;
  current_amount?: number;
  monthly_contribution?: number;
  start_date?: string; // ISO date
  target_date?: string; // ISO date
  account_id?: string;
  destination_account_id?: string;
}

export interface GoalUpdate {
  name?: string;
  description?: string | null;
  target_amount?: number | null;
  monthly_contribution?: number | null;
  target_date?: string | null;
  account_id?: string | null;
  destination_account_id?: string | null;
}

export interface GoalContributionUpdate {
  amount: number;
}

// Interface pour l'API backend
interface GoalCreateBackend {
  name: string;
  description?: string;
  target_amount?: number;
  current_amount?: number;
  monthly_contribution?: number;
  start_date?: string;
  target_date?: string;
  account_id?: string;
  destination_account_id?: string;
  user_id?: string;
  household_id?: string;
}

export const goalService = {
  /**
   * Créer un objectif
   */
  async create(data: GoalCreate): Promise<Goal> {
    const user = useAuthStore.getState().user;
    
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }
    
    // Vérification: si goal_type=household, l'utilisateur doit être en couple
    if (data.goal_type === 'household' && !user.household_id) {
      throw new Error('Vous devez être en couple pour créer un objectif foyer');
    }
    
    // Transformer goal_type en user_id ou household_id
    const backendData: GoalCreateBackend = {
      name: data.name,
      description: data.description,
      target_amount: data.target_amount,
      current_amount: data.current_amount || 0,
      monthly_contribution: data.monthly_contribution,
      start_date: data.start_date || undefined,
      target_date: data.target_date || undefined,
      account_id: data.account_id || undefined,
      destination_account_id: data.destination_account_id || undefined,
    };
    
    if (data.goal_type === 'personal') {
      backendData.user_id = user.id;
    } else {
      backendData.household_id = user.household_id;
    }
    
    const response = await api.post<Goal>('/goals', backendData);
    return response.data;
  },

  /**
   * Lister les objectifs (personnels ou foyer)
   */
  async list(goalType?: GoalType): Promise<Goal[]> {
    const params = goalType ? `?goal_type=${goalType}` : '';
    const response = await api.get<Goal[]>(`/goals${params}`);
    return response.data;
  },

  /**
   * Récupérer un objectif par ID
   */
  async get(id: string): Promise<Goal> {
    const response = await api.get<Goal>(`/goals/${id}`);
    return response.data;
  },

  /**
   * Récupérer les transactions liées à un objectif
   */
  async getGoalTransactions(goalId: string): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>(`/goals/${goalId}/transactions`);
    return response.data;
  },

  /**
   * Mettre à jour un objectif
   */
  async update(id: string, data: GoalUpdate): Promise<Goal> {
    const response = await api.patch<Goal>(`/goals/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un objectif
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  },

  /**
   * Mettre à jour la contribution (ajouter/retirer)
   */
  async updateContribution(id: string, data: GoalContributionUpdate): Promise<Goal> {
    const response = await api.patch<Goal>(`/goals/${id}/contribution`, data);
    return response.data;
  },

  /**
   * Définir la contribution (remplace le montant actuel)
   */
  async setContribution(id: string, data: GoalContributionUpdate): Promise<Goal> {
    const response = await api.put<Goal>(`/goals/${id}/contribution`, data);
    return response.data;
  },
};
