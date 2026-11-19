import { apiRequest } from "@/lib/api-client";
import type {
  NotificationItem,
  NotificationListResponse,
} from "@/types/notification";

export const notificationService = {
  async list(unreadOnly = false): Promise<NotificationListResponse> {
    const qs = unreadOnly ? "?unread_only=true" : "";
    return apiRequest<NotificationListResponse>(`/notifications${qs}`);
  },

  async getUnreadCount(): Promise<number> {
    const data = await apiRequest<{ count: number }>(
      "/notifications/unread/count"
    );
    return data.count ?? 0;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    return apiRequest<NotificationItem>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  async markAllAsRead(): Promise<void> {
    await apiRequest<void>("/notifications/mark-all-read", { method: "POST" });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/notifications/${id}`, { method: "DELETE" });
  },
};
