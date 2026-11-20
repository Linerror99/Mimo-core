"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationsView } from "@/components/features/notifications/notifications-view";
import { notificationService } from "@/services/notification-service";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.list(false),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await refresh();
    } catch {
      toast.error("Action impossible");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success("Toutes les notifications ont été marquées comme lues");
      await refresh();
    } catch {
      toast.error("Action impossible");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.remove(id);
      toast.success("Notification supprimée");
      await refresh();
    } catch {
      toast.error("Suppression impossible");
    }
  };

  return (
    <AppShell
      activePath="/notifications"
      initialUnreadCount={data?.unread_count ?? 0}
    >
      <NotificationsView
        isLoading={isLoading}
        notifications={data?.notifications ?? []}
        unreadCount={data?.unread_count ?? 0}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={handleDelete}
      />
    </AppShell>
  );
}
