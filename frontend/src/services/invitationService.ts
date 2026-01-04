/**
 * Invitation Service - Sprint 6 Mode Couple
 * 
 * Gère les invitations pour créer des foyers COUPLE
 */

import apiClient from './api';

// Types
export interface Invitation {
  id: string;
  inviter_user_id: string;
  inviter_email: string;
  inviter_name: string;
  invitee_user_id: string;
  invitee_email: string;
  invitee_name: string | null;
  type: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

export interface CreateInvitationRequest {
  invitee_email: string;
}

export interface InvitationsListResponse {
  invitations: Invitation[];
}

/**
 * Créer une nouvelle invitation
 */
export const createInvitation = async (email: string): Promise<Invitation> => {
  const response = await apiClient.post<Invitation>('/invitations', {
    invitee_email: email,
  });
  return response.data;
};

/**
 * Récupérer les invitations de l'utilisateur
 * @param type - 'sent' | 'received' | 'none' (toutes)
 */
export const getInvitations = async (
  type?: 'sent' | 'received'
): Promise<Invitation[]> => {
  const params = type ? { type } : {};
  const response = await apiClient.get<InvitationsListResponse>('/invitations', {
    params,
  });
  return response.data.invitations;
};

/**
 * Accepter une invitation
 */
export const acceptInvitation = async (invitationId: string): Promise<void> => {
  await apiClient.post(`/invitations/${invitationId}/accept`);
};

/**
 * Rejeter une invitation
 */
export const rejectInvitation = async (invitationId: string): Promise<void> => {
  await apiClient.post(`/invitations/${invitationId}/reject`);
};

/**
 * Annuler une invitation (inviter seulement)
 */
export const cancelInvitation = async (invitationId: string): Promise<void> => {
  await apiClient.delete(`/invitations/${invitationId}`);
};

export default {
  createInvitation,
  getInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
};
