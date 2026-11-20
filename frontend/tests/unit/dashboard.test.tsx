import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardView,
  type DashboardData,
} from "@/components/features/dashboard/dashboard-view";
import { usePrivacyStore } from "@/stores/privacy-store";

const SAMPLE_DASHBOARD: DashboardData = {
  totalBalance: 14850,
  accounts: [
    {
      id: "acc-1",
      household_id: "h-1",
      name: "Compte Courant",
      type: "CHECKING",
      initial_balance: 5000,
      current_balance: 14850,
      currency: "EUR",
      is_active: true,
      closed_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  monthTransactions: [
    {
      id: "tx-1",
      household_id: "h-1",
      account_id: "acc-1",
      category_id: null,
      destination_account_id: null,
      description: "Salaire mensuel",
      amount: 3200,
      transaction_date: "2026-11-01",
      type: "INCOME",
      notes: null,
      state: "REALIZED",
      recurrence_frequency: "MONTHLY",
      recurrence_end_date: null,
      parent_transaction_id: null,
      recurring_template_id: null,
      is_active: true,
      deleted_at: null,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
  ],
  pendingTransactions: [
    {
      id: "tx-pending-1",
      household_id: "h-1",
      account_id: "acc-1",
      category_id: null,
      destination_account_id: null,
      description: "Loyer Appartement",
      amount: 950,
      transaction_date: "2026-11-19",
      type: "EXPENSE",
      notes: null,
      state: "PENDING",
      recurrence_frequency: "MONTHLY",
      recurrence_end_date: null,
      parent_transaction_id: null,
      recurring_template_id: null,
      is_active: true,
      deleted_at: null,
      created_at: "2026-11-19T00:00:00Z",
      updated_at: "2026-11-19T00:00:00Z",
    },
  ],
  safeToSpend: {
    current_balance: 3400,
    committed_expenses: 1200,
    safe_to_spend: 2200,
    next_income_date: "2026-12-01",
    next_income_amount: 3200,
    days_until_next_income: 12,
    status: "healthy",
    horizon_date: "2026-12-01",
  },
  wallets: {
    household_type: "COUPLE",
    total_balance: 14850,
    members: {
      u1: {
        user_id: "u1",
        user_name: "Alex",
        balance: 7000,
        personal_balance: 4000,
        shared_contribution: 3000,
      },
    },
    shared: { balance: 6000, split_per_person: 3000 },
  },
  projections: [],
};

describe("DashboardView — Skeletons, Safe-to-Spend, Mode Couple & Validations", () => {
  it("affiche le Skeleton structuré pendant le chargement sans spinner bloquant", () => {
    render(<DashboardView isLoading={true} data={null} />);
    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
  });

  it("affiche les KPIs, le reste à vivre, les portefeuilles couple et valide une opération en attente", async () => {
    usePrivacyStore.setState({ isPrivate: false });
    const user = userEvent.setup();
    const onValidate = vi.fn();

    render(
      <DashboardView
        isLoading={false}
        data={SAMPLE_DASHBOARD}
        onValidatePending={onValidate}
      />
    );

    expect(screen.getByTestId("safe-to-spend-amount")).toHaveTextContent(
      /2[\s\u202f]?200,00\s*€/
    );
    expect(screen.getByTestId("couple-wallets-section")).toBeInTheDocument();
    expect(screen.getByText("Loyer Appartement")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider loyer appartement/i })
    );
    expect(onValidate).toHaveBeenCalledWith("tx-pending-1");
  });
});
