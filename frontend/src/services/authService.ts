import apiClient from './api';

export const authService = {
  /**
   * Étape 1 : Demander un code de réinitialisation de mot de passe par email
   */
  async forgotPassword(email: string): Promise<{ message: string; expires_in_minutes: number }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Étape 2 : Vérifier la validité du code à 6 chiffres
   */
  async verifyResetCode(email: string, code: string): Promise<{ valid: boolean; message: string }> {
    const response = await apiClient.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  /**
   * Étape 3 : Enregistrer le nouveau mot de passe avec le code validé
   */
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', {
      email,
      code,
      new_password: newPassword,
    });
    return response.data;
  },
};
