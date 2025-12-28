/**
 * Goal API Service
 * 
 * API calls for goal CRUD operations
 */
import api from './api';
import { useAuthStore } from '@/stores/authStore';

export type GoalType = 'personal' | 'household';

export interface Goal {
  id: string;
  household_id: string | null;
  user_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string; // ISO date
  created_at: string;
  updated_at: string;
  // Computed fields
  progress_percentage?: number;
  is_completed?: boolean;
}

export interface GoalCreate {
  goal_type: GoalType;
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  target_date: string; // ISO date
}

export interface GoalUpdate {
  name?: string;
  description?: string;
  target_amount?: number;
  target_date?: string;
}

export interface GoalContributionUpdate {
  amount: number;
}

// Interface pour l'API backend (différente du frontend)
interface GoalCreateBackend {
  name: string;
  description?: string;
  target_amount: number;
  target_date?: string;
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
      target_date: data.target_date,
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
  async getById(goalId: string): Promise<Goal> {
    const response = await api.get<Goal>(`/goals/${goalId}`);
    return response.data;
  },

  /**
   * Mettre à jour un objectif
   */
  async update(goalId: string, data: GoalUpdate): Promise<Goal> {
    const response = await api.patch<Goal>(`/goals/${goalId}`, data);
    return response.data;
  },

  /**
   * Supprimer un objectif
   */
  async delete(goalId: string): Promise<void> {
    await api.delete(`/goals/${goalId}`);
  },

  /**
   * Mettre à jour la contribution à un objectif (ajoute au montant actuel)
   */
  async updateContribution(goalId: string, data: GoalContributionUpdate): Promise<Goal> {
    const response = await api.patch<Goal>(`/goals/${goalId}/contribution`, data);
    return response.data;
  },

  /**
   * Définir le montant actuel d'un objectif (remplace le montant actuel)
   */
  async setContribution(goalId: string, data: GoalContributionUpdate): Promise<Goal> {
    const response = await api.put<Goal>(`/goals/${goalId}/contribution`, data);
    return response.data;
  },
};
