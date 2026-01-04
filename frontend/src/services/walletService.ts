/**
 * Wallet Service - Sprint 6 Mode Couple
 * 
 * Gère la récupération des portefeuilles (INDIVIDUAL ou COUPLE)
 */

import apiClient from './api';

// Types
export interface MemberWallet {
  user_id: string;
  user_name: string;
  balance: number;
  personal_balance: number;
  shared_contribution: number;
}

export interface SharedWallet {
  balance: number;
  split_per_person: number;
}

export interface WalletsResponse {
  household_type: 'INDIVIDUAL' | 'COUPLE';
  total_balance: number;
  members: Record<string, MemberWallet> | null;
  shared: SharedWallet | null;
}

/**
 * Récupérer les portefeuilles du household de l'utilisateur
 */
export const getWallets = async (): Promise<WalletsResponse> => {
  const response = await apiClient.get<WalletsResponse>('/wallets');
  return response.data;
};

export default {
  getWallets,
};
