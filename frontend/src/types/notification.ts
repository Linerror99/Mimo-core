export type NotificationType = 'validation_needed' | 'info' | 'alert'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  message: string
  related_transaction_id?: string
  is_read: boolean
  created_at: string
}
