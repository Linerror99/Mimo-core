"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Info,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateFr } from "@/lib/utils";
import type { NotificationItem } from "@/types/notification";

interface NotificationsViewProps {
  isLoading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<void> | void;
  onMarkAllAsRead: () => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function NotificationsSkeleton() {
  return (
    <div data-testid="notifications-skeleton" className="space-y-4">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function NotificationsView({
  isLoading,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  if (isLoading) return <NotificationsSkeleton />;

  const displayed =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Notifications
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Validations quotidiennes, alertes de trésorerie et activité du foyer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold",
                filter === "all"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              Toutes ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold",
                filter === "unread"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              Non lues ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={onMarkAllAsRead}>
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="Aucune notification"
          description="Vous êtes parfaitement à jour dans votre suivi quotidien."
        />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-zinc-800/80">
          {displayed.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5",
                !notif.is_read && "bg-blue-500/[0.04]"
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5">
                  {notif.type === "alert" ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  ) : notif.type === "validation_needed" ? (
                    <Bell className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                      {notif.message}
                    </p>
                    {!notif.is_read && <Badge variant="info">Nouveau</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                    <span>{formatDateFr(notif.created_at)}</span>
                    {notif.related_transaction_id && (
                      <Link
                        href="/timeline"
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Voir dans la timeline →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!notif.is_read && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMarkAsRead(notif.id)}
                    aria-label="Marquer comme lue"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Lu
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(notif.id)}
                  aria-label="Supprimer la notification"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
