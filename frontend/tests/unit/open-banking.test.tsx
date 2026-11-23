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

  it("permet de modifier sync_from_date et de délier un compte synchronisé dans AccountsView", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onUnlinkBankAccount = vi.fn().mockResolvedValue(undefined);

    const syncedAccounts: Account[] = [
      {
        ...ACCOUNTS[0],
        sync_from_date: "2026-11-18",
      },
    ];

    render(
      <AccountsView
        isLoading={false}
        accounts={syncedAccounts}
        bankConnections={CONNECTIONS}
        isSyncingBanks={false}
        includeInactive={false}
        onToggleIncludeInactive={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onStartConnectBank={vi.fn()}
        onSyncAllBanks={vi.fn()}
        onSyncBankConnection={vi.fn()}
        onDeleteBankConnection={vi.fn()}
        onUnlinkBankAccount={onUnlinkBankAccount}
      />
    );

    // Ouvrir le menu ⋯ du compte SG -> Modifier -> changer sync_from_date
    await user.click(screen.getByRole("button", { name: /actions pour sg/i }));
    await user.click(screen.getByRole("menuitem", { name: /modifier/i }));

    const dateInput = screen.getByLabelText(
      /importer les opérations banque à partir du/i
    );
    expect(dateInput).toHaveValue("2026-11-18");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-11-10");
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onUpdate).toHaveBeenCalledWith(
      "acc-sg",
      expect.objectContaining({ sync_from_date: "2026-11-10" })
    );

    // Ouvrir le menu ⋯ -> Délier la synchro banque
    await user.click(screen.getByRole("button", { name: /actions pour sg/i }));
    await user.click(
      screen.getByRole("menuitem", { name: /délier la synchro banque/i })
    );
    expect(onUnlinkBankAccount).toHaveBeenCalledWith("acc-sg");
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

  it("affiche en priorité un virement interne ou une opération réalisée proche (même avec 35+ projections futures)", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn();

    const futureProjected: Transaction[] = Array.from({ length: 35 }, (_, i) => ({
      id: `tx-future-${i}`,
      household_id: "h-1",
      account_id: "acc-sg",
      category_id: null,
      destination_account_id: null,
      description: `Abonnement futur ${i}`,
      amount: -19.99,
      transaction_date: `2027-0${(i % 9) + 1}-15`,
      type: "EXPENSE",
      notes: null,
      state: "PROJECTED",
      recurrence_frequency: "MONTHLY",
      recurrence_end_date: null,
      parent_transaction_id: null,
      recurring_template_id: "tpl-future",
      is_active: true,
      deleted_at: null,
      external_transaction_id: null,
      import_source: "manual",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    }));

    const importedDebit: Transaction = {
      id: "tx-bank-95",
      household_id: "h-1",
      account_id: "acc-sg",
      category_id: null,
      destination_account_id: null,
      description: "000001 VIR INSTANTANE EMIS LOGITEL",
      amount: -95,
      transaction_date: "2026-11-20",
      type: "EXPENSE",
      notes: null,
      state: "REALIZED",
      recurrence_frequency: "NONE",
      recurrence_end_date: null,
      parent_transaction_id: null,
      recurring_template_id: null,
      is_active: true,
      deleted_at: null,
      external_transaction_id: "eb_vir_95",
      import_source: "open_banking",
      created_at: "2026-11-20T00:00:00Z",
      updated_at: "2026-11-20T00:00:00Z",
    };

    const manualTransfer: Transaction = {
      id: "tx-transfer-95",
      household_id: "h-1",
      account_id: "acc-sg",
      category_id: null,
      destination_account_id: "acc-bnp",
      description: "Virement SG -BNP",
      amount: -95,
      transaction_date: "2026-11-19",
      type: "TRANSFER",
      notes: null,
      state: "REALIZED",
      recurrence_frequency: "NONE",
      recurrence_end_date: null,
      parent_transaction_id: null,
      recurring_template_id: null,
      is_active: true,
      deleted_at: null,
      external_transaction_id: null,
      import_source: "manual",
      created_at: "2026-11-19T00:00:00Z",
      updated_at: "2026-11-19T00:00:00Z",
    };

    render(
      <TimelineView
        isLoading={false}
        year={2026}
        month={11}
        onChangeMonth={vi.fn()}
        transactions={[importedDebit, manualTransfer]}
        allTransactions={[importedDebit, manualTransfer, ...futureProjected]}
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
        onUnlinkBankTransaction={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /actions pour 000001 vir instantane emis logitel/i,
      })
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: /fusionner avec une opération prévue/i,
      })
    );

    const dialog = screen.getByRole("dialog", {
      name: /fusionner avec une opération déjà prévue/i,
    });
    expect(within(dialog).getByText("Virement SG -BNP")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Correspondance probable")
    ).toBeInTheDocument();

    // Recherche par montant ("95") ou date FR ("19/11")
    const searchInput = within(dialog).getByPlaceholderText(
      /rechercher par libellé, montant/i
    );
    await user.type(searchInput, "19/11");
    expect(within(dialog).getByText("Virement SG -BNP")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /virement sg -bnp/i })
    );
    await user.click(
      within(dialog).getByRole("button", { name: /fusionner et valider/i })
    );
    expect(onMerge).toHaveBeenCalledWith("tx-bank-95", "tx-transfer-95");
  });

  it("affiche Banque 1/2 et 2/2 sur les virements et permet de relier la 2e banque ou une paire inter-banques", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn();

    const twoAccounts: Account[] = [
      ...ACCOUNTS,
      {
        id: "acc-bnp",
        household_id: "h-1",
        name: "BNP",
        type: "CHECKING",
        initial_balance: 500,
        current_balance: 800,
        currency: "EUR",
        is_active: true,
        closed_at: null,
        sync_enabled: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const txs: Transaction[] = [
      {
        id: "tx-tr-half",
        household_id: "h-1",
        account_id: "acc-sg",
        category_id: null,
        destination_account_id: "acc-bnp",
        description: "Virement SG -> BNP",
        amount: -95,
        transaction_date: "2026-11-19",
        type: "TRANSFER",
        notes: null,
        state: "REALIZED",
        recurrence_frequency: "NONE",
        recurrence_end_date: null,
        parent_transaction_id: null,
        recurring_template_id: null,
        is_active: true,
        deleted_at: null,
        external_transaction_id: "sg_tx_95",
        destination_external_transaction_id: null,
        import_source: "open_banking",
        created_at: "2026-11-19T00:00:00Z",
        updated_at: "2026-11-19T00:00:00Z",
      },
      {
        id: "tx-tr-full",
        household_id: "h-1",
        account_id: "acc-sg",
        category_id: null,
        destination_account_id: "acc-bnp",
        description: "Virement déjà complet",
        amount: -50,
        transaction_date: "2026-11-18",
        type: "TRANSFER",
        notes: null,
        state: "REALIZED",
        recurrence_frequency: "NONE",
        recurrence_end_date: null,
        parent_transaction_id: null,
        recurring_template_id: null,
        is_active: true,
        deleted_at: null,
        external_transaction_id: "sg_tx_50",
        destination_external_transaction_id: "bnp_tx_50",
        import_source: "open_banking",
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-18T00:00:00Z",
      },
      {
        id: "tx-bnp-credit",
        household_id: "h-1",
        account_id: "acc-bnp",
        category_id: null,
        destination_account_id: null,
        description: "VIR RECU DE SG",
        amount: 95,
        transaction_date: "2026-11-20",
        type: "INCOME",
        notes: null,
        state: "REALIZED",
        recurrence_frequency: "NONE",
        recurrence_end_date: null,
        parent_transaction_id: null,
        recurring_template_id: null,
        is_active: true,
        deleted_at: null,
        external_transaction_id: "bnp_tx_95",
        destination_external_transaction_id: null,
        import_source: "open_banking",
        created_at: "2026-11-20T00:00:00Z",
        updated_at: "2026-11-20T00:00:00Z",
      },
    ];

    render(
      <TimelineView
        isLoading={false}
        year={2026}
        month={11}
        onChangeMonth={vi.fn()}
        transactions={txs}
        allTransactions={txs}
        templates={[]}
        accounts={twoAccounts}
        categories={[]}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onValidateTransaction={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onMergeBankTransaction={onMerge}
        onUnlinkBankTransaction={vi.fn()}
      />
    );

    expect(screen.getByText("Banque 1/2")).toBeInTheDocument();
    expect(screen.getByText("Banque 2/2")).toBeInTheDocument();

    // Ouvrir Fusionner sur le crédit BNP (+95€) -> le virement SG -> BNP (1/2 lié) doit apparaître !
    await user.click(
      screen.getByRole("button", { name: /actions pour vir recu de sg/i })
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: /fusionner avec une opération prévue/i,
      })
    );

    const dialog = screen.getByRole("dialog", {
      name: /fusionner avec une opération déjà prévue/i,
    });
    expect(within(dialog).getByText("Virement SG -> BNP")).toBeInTheDocument();
    expect(within(dialog).getByText("Virement (1/2 lié)")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /virement sg -> bnp/i })
    );
    await user.click(
      within(dialog).getByRole("button", { name: /fusionner et valider/i })
    );
    expect(onMerge).toHaveBeenCalledWith("tx-bnp-credit", "tx-tr-half");
  });
});
