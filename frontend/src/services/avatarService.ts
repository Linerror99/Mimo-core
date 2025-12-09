/**
 * Avatar API Service
 * 
 * API calls for user avatar management
 */
import api from './api';

export const avatarService = {
  /**
   * Upload user avatar
   */
  async upload(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ avatar_url: string }>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  /**
   * Delete user avatar
   */
  async delete(): Promise<void> {
    await api.delete('/users/me/avatar');
  },
};
