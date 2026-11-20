import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimelineView } from "@/components/features/timeline/timeline-view";
import type { Account } from "@/types/account";
import type { Transaction } from "@/types/transaction";

const ACCOUNTS: Account[] = [
  {
    id: "acc-1",
    household_id: "h-1",
    name: "Compte Courant",
    type: "CHECKING",
    initial_balance: 1000,
    current_balance: 2500,
    currency: "EUR",
    is_active: true,
    closed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: "t-1",
    household_id: "h-1",
    account_id: "acc-1",
    category_id: null,
    destination_account_id: null,
    description: "Courses Biocoop",
    amount: 85.4,
    transaction_date: "2026-11-12",
    type: "EXPENSE",
    notes: null,
    state: "REALIZED",
    recurrence_frequency: "NONE",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: null,
    is_active: true,
    deleted_at: null,
    created_at: "2026-11-12T00:00:00Z",
    updated_at: "2026-11-12T00:00:00Z",
  },
  {
    id: "t-2",
    household_id: "h-1",
    account_id: "acc-1",
    category_id: null,
    destination_account_id: null,
    description: "Abonnement Fibre",
    amount: 39.99,
    transaction_date: "2026-11-19",
    type: "EXPENSE",
    notes: null,
    state: "PENDING",
    recurrence_frequency: "MONTHLY",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: "tpl-1",
    is_active: true,
    deleted_at: null,
    created_at: "2026-11-19T00:00:00Z",
    updated_at: "2026-11-19T00:00:00Z",
  },
];

describe("TimelineView — Filtres, États & Création", () => {
  it("affiche le skeleton pendant le chargement", () => {
    render(
      <TimelineView
        isLoading={true}
        year={2026}
        month={11}
        onChangeMonth={vi.fn()}
        transactions={[]}
        templates={[]}
        accounts={[]}
        categories={[]}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onValidateTransaction={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />
    );
    expect(screen.getByTestId("timeline-skeleton")).toBeInTheDocument();
  });

  it("filtre les transactions par recherche et permet de valider une échéance en attente", async () => {
    const user = userEvent.setup();
    const onValidate = vi.fn();

    render(
      <TimelineView
        isLoading={false}
        year={2026}
        month={11}
        onChangeMonth={vi.fn()}
        transactions={TRANSACTIONS}
        templates={[]}
        accounts={ACCOUNTS}
        categories={[]}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onValidateTransaction={onValidate}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />
    );

    expect(screen.getByText("Courses Biocoop")).toBeInTheDocument();
    expect(screen.getByText("Abonnement Fibre")).toBeInTheDocument();
    expect(screen.getByTestId("pending-alert-banner")).toBeInTheDocument();

    const pendingRow = screen.getByText("Abonnement Fibre").closest("tr");
    expect(pendingRow).toHaveAttribute("data-state", "PENDING");
    expect(pendingRow?.className).toContain("border-l-amber-500");

    await user.type(
      screen.getByPlaceholderText(/rechercher par libellé/i),
      "Fibre"
    );
    expect(screen.queryByText("Courses Biocoop")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider abonnement fibre/i })
    );
    expect(onValidate).toHaveBeenCalledWith("t-2");
  });

  it("affiche le solde restant en fin de journée dans la liste et bascule en mode Calendrier", async () => {
    const user = userEvent.setup();

    render(
      <TimelineView
        isLoading={false}
        year={2026}
        month={11}
        onChangeMonth={vi.fn()}
        transactions={TRANSACTIONS}
        allTransactions={TRANSACTIONS}
        templates={[]}
        accounts={ACCOUNTS}
        categories={[]}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onValidateTransaction={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />
    );

    // 1000 - 85.40 = 914,60 € le 12 nov ; 914.60 - 39.99 = 874,61 € le 19 nov
    expect(screen.getByTestId("row-day-balance-t-1")).toHaveTextContent(
      /914,60/
    );
    expect(screen.getByTestId("row-day-balance-t-2")).toHaveTextContent(
      /874,61/
    );

    // Passage en mode Calendrier
    await user.click(screen.getByRole("button", { name: /vue calendrier/i }));
    expect(screen.getByTestId("timeline-calendar-view")).toBeInTheDocument();

    // Clic sur le 19 novembre -> ouvre le panneau du jour avec la transaction et le solde fin de journée
    await user.click(screen.getByTestId("calendar-day-2026-11-19"));
    const panel = screen.getByTestId("calendar-day-panel");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent("Abonnement Fibre");
    expect(panel).toHaveTextContent(/874,61/);
  });
});
