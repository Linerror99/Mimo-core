import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountsView } from "@/components/features/accounts/accounts-view";
import { TimelineView } from "@/components/features/timeline/timeline-view";
import type { Account } from "@/types/account";
import type { BankConnection } from "@/types/banking";
import type { Transaction } from "@/types/transaction";

const ACCOUNTS: Account[] = [
  {
    id: "acc-sg",
    household_id: "h-1",
    name: "SG",
    type: "CHECKING",
    initial_balance: 1000,
    current_balance: 2500,
    currency: "EUR",
    is_active: true,
    closed_at: null,
    iban_masked: "FR76 •••• 4821",
    sync_enabled: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const CONNECTIONS: BankConnection[] = [
  {
    id: "conn-1",
    provider: "mock",
    institution_name: "Société Générale",
    institution_country: "FR",
    status: "ACTIVE",
    consent_expires_at: "2027-02-01T00:00:00Z",
    last_synced_at: "2026-11-22T03:00:00Z",
    days_until_expiry: 70,
    linked_accounts: [
      {
        id: "acc-sg",
        name: "SG",
        iban_masked: "FR76 •••• 4821",
        sync_enabled: true,
      },
    ],
    discovered_accounts: [],
    created_at: "2026-11-22T00:00:00Z",
  },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: "tx-imported",
    household_id: "h-1",
    account_id: "acc-sg",
    category_id: null,
    destination_account_id: null,
    description: "VIR EMPLOYEUR",
    amount: 2245.5,
    transaction_date: "2026-11-21",
    type: "INCOME",
    notes: null,
    state: "REALIZED",
    recurrence_frequency: "NONE",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: null,
    is_active: true,
    deleted_at: null,
    external_transaction_id: "eb_sal_1",
    import_source: "open_banking",
    created_at: "2026-11-21T00:00:00Z",
    updated_at: "2026-11-21T00:00:00Z",
  },
  {
    id: "tx-planned",
    household_id: "h-1",
    account_id: "acc-sg",
    category_id: null,
    destination_account_id: null,
    description: "Salaire CDI",
    amount: 2200,
    transaction_date: "2026-11-22",
    type: "INCOME",
    notes: null,
    state: "PROJECTED",
    recurrence_frequency: "MONTHLY",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: "tpl-1",
    is_active: true,
    deleted_at: null,
    external_transaction_id: null,
    import_source: "manual",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
];

describe("Open Banking UI — Connexions, Synchro manuelle & Fusion Timeline", () => {
  it("affiche les connexions bancaires dans AccountsView et déclenche la synchro manuelle", async () => {
    const user = userEvent.setup();
    const onSyncAll = vi.fn();

    render(
      <AccountsView
        isLoading={false}
        accounts={ACCOUNTS}
        bankConnections={CONNECTIONS}
        isSyncingBanks={false}
        includeInactive={false}
        onToggleIncludeInactive={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onStartConnectBank={vi.fn()}
        onSyncAllBanks={onSyncAll}
        onSyncBankConnection={vi.fn()}
        onDeleteBankConnection={vi.fn()}
      />
    );

    expect(screen.getByTestId("bank-connections-panel")).toBeInTheDocument();
    expect(screen.getByText("Société Générale")).toBeInTheDocument();
    expect(screen.getByText("Synchro banque")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /synchroniser maintenant/i })
    );
    expect(onSyncAll).toHaveBeenCalledTimes(1);
  });

  it("permet de fusionner une écriture bancaire importée avec une opération prévue dans TimelineView", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn();
    const onUnlink = vi.fn();

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
        onMergeBankTransaction={onMerge}
        onUnlinkBankTransaction={onUnlink}
      />
    );

    expect(screen.getByText("Banque")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /actions pour vir employeur/i })
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: /fusionner avec une opération prévue/i,
      })
    );

    // Choisir "Salaire CDI" dans la modale et confirmer
    const dialog = screen.getByRole("dialog", {
      name: /fusionner avec une opération déjà prévue/i,
    });
    await user.click(within(dialog).getByRole("button", { name: /salaire cdi/i }));
    await user.click(
      within(dialog).getByRole("button", { name: /fusionner et valider/i })
    );
    expect(onMerge).toHaveBeenCalledWith("tx-imported", "tx-planned");
  });
});
