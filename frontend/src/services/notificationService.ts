import apiClient from './api'
import { Notification } from '@/types/notification'

interface NotificationListResponse {
  total: number
  unread_count: number
  notifications: Notification[]
}

export const notificationService = {
  async getAll(unreadOnly = false): Promise<NotificationListResponse> {
    const params = unreadOnly ? { unread: true } : {}
    const response = await apiClient.get('/notifications', { params })
    return response.data
  },

  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`)
    return response.data
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read')
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/notifications/unread/count')
    return response.data.count
  },

  async delete(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`)
  },
}
