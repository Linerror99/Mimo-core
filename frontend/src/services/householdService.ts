/**
 * Household Service - Sprint 6 Mode Couple
 * 
 * Gère les opérations liées aux foyers (dissolution, consultation archivés)
 */

import apiClient from './api';

// Types
export interface Household {
  id: string;
  name: string;
  type: 'individual' | 'couple';
  status: 'active' | 'archived' | 'merged_into_couple';
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface DissolveHouseholdResponse {
  archived_household: {
    id: string;
    name: string;
    status: string;
  };
  new_households: Array<{
    id: string;
    name: string;
    owner: string;
    initial_balance: number;
  }>;
}

export interface ArchivedHousehold {
  id: string;
  name: string;
  type: string;
  status: string;
  archived_at: string;
  members: HouseholdMember[];
  created_at: string;
}

export interface ArchivedHouseholdsResponse {
  archived_households: ArchivedHousehold[];
}

/**
 * Dissoudre un foyer COUPLE
 * Crée 2 nouveaux foyers INDIVIDUAL et archive le foyer COUPLE
 */
export const dissolveHousehold = async (
  householdId: string
): Promise<DissolveHouseholdResponse> => {
  const response = await apiClient.post<DissolveHouseholdResponse>(
    `/households/${householdId}/dissolve`
  );
  return response.data;
};

/**
 * Récupérer la liste des foyers archivés
 * Pour consultation en lecture seule
 */
export const getArchivedHouseholds = async (): Promise<ArchivedHousehold[]> => {
  const response = await apiClient.get<ArchivedHouseholdsResponse>(
    '/households/archived'
  );
  return response.data.archived_households;
};

/**
 * Récupérer le household actuel de l'utilisateur avec ses membres
 */
export const getCurrentHousehold = async (): Promise<{
  household: Household;
  members: HouseholdMember[];
}> => {
  const response = await apiClient.get<{
    household: Household;
    members: HouseholdMember[];
  }>('/households/me');
  return response.data;
};

export default {
  dissolveHousehold,
  getArchivedHouseholds,
  getCurrentHousehold,
};
