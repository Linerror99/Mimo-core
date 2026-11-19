import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotificationsView } from "@/components/features/notifications/notifications-view";
import { TrashView } from "@/components/features/trash/trash-view";
import type { NotificationItem } from "@/types/notification";
import type { Transaction } from "@/types/transaction";

const NOTIFS: NotificationItem[] = [
  {
    id: "n-1",
    user_id: "u-1",
    type: "validation_needed",
    message: "Validez votre loyer de 950 €",
    related_transaction_id: "tx-1",
    is_read: false,
    created_at: "2026-11-19T08:00:00Z",
  },
];

const TRASH_ITEMS: Transaction[] = [
  {
    id: "del-1",
    household_id: "h-1",
    account_id: "a-1",
    category_id: null,
    destination_account_id: null,
    description: "Restaurant midi",
    amount: 24.5,
    transaction_date: "2026-11-10",
    type: "EXPENSE",
    notes: null,
    state: "REALIZED",
    recurrence_frequency: "NONE",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: null,
    is_active: false,
    deleted_at: "2026-11-15T12:00:00Z",
    created_at: "2026-11-10T12:00:00Z",
    updated_at: "2026-11-15T12:00:00Z",
  },
];

describe("NotificationsView & TrashView", () => {
  it("permet de tout marquer comme lu dans les notifications", async () => {
    const user = userEvent.setup();
    const onMarkAll = vi.fn();

    render(
      <NotificationsView
        isLoading={false}
        notifications={NOTIFS}
        unreadCount={1}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={onMarkAll}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/validez votre loyer/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /tout marquer comme lu/i })
    );
    expect(onMarkAll).toHaveBeenCalledTimes(1);
  });

  it("permet de restaurer une transaction depuis la corbeille", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();

    render(
      <TrashView
        isLoading={false}
        items={TRASH_ITEMS}
        onRestore={onRestore}
        onPermanentDelete={vi.fn()}
        onEmptyTrash={vi.fn()}
      />
    );

    expect(screen.getByText("Restaurant midi")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /restaurer/i }));
    expect(onRestore).toHaveBeenCalledWith("del-1");
  });
});
