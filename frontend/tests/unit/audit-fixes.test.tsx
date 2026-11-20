import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimelineView } from "@/components/features/timeline/timeline-view";
import { ValidationModal } from "@/components/features/timeline/validation-modal";
import { ProjectionView } from "@/components/features/projection/projection-view";
import { AccountsView } from "@/components/features/accounts/accounts-view";
import type { Account } from "@/types/account";
import type { Transaction } from "@/types/transaction";

const ACCOUNTS: Account[] = [
  {
    id: "acc-1",
    household_id: "h-1",
    name: "BoursoBank Courant",
    type: "CHECKING",
    initial_balance: 2000,
    current_balance: 3200,
    currency: "EUR",
    is_active: true,
    logo_url: "boursorama",
    closed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const PENDING_TX: Transaction = {
  id: "tx-pending",
  household_id: "h-1",
  account_id: "acc-1",
  category_id: null,
  destination_account_id: null,
  description: "Facture Électricité",
  amount: -95.5,
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
};

describe("Audit Fixes — Contrats, ValidationModal, ConfirmDialog & Simulateur", () => {
  it("envoie un montant négatif à la création d'une dépense dans TimelineView et demande confirmation avant suppression", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onDelete = vi.fn();

    render(
      <TimelineView
        isLoading={false}
        year={2026}
        month={11}
        onChangeMonth={vi.fn()}
        transactions={[PENDING_TX]}
        templates={[]}
        accounts={ACCOUNTS}
        categories={[]}
        onCreateTransaction={onCreate}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={onDelete}
        onValidateTransaction={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />
    );

    // Création d'une dépense -> doit envoyer amount = -42.5
    await user.click(screen.getByRole("button", { name: /nouvelle transaction/i }));
    await user.type(screen.getByLabelText(/libellé/i), "Restaurant");
    await user.type(screen.getByLabelText(/montant \(€\)/i), "42.5");
    await user.click(screen.getByRole("button", { name: /^enregistrer$/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Restaurant",
        type: "EXPENSE",
        amount: -42.5,
      }),
      false
    );

    // Suppression -> ConfirmDialog doit bloquer la suppression immédiate
    await user.click(
      screen.getByRole("button", { name: /actions pour facture électricité/i })
    );
    await user.click(screen.getByRole("menuitem", { name: /supprimer/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByText(/supprimer cette transaction/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /déplacer vers la corbeille/i })
    );
    expect(onDelete).toHaveBeenCalledWith("tx-pending");
  });

  it("permet dans ValidationModal d'ajuster le montant réel ou de reporter une opération PENDING", async () => {
    const user = userEvent.setup();
    const onValidate = vi.fn();
    const onPostpone = vi.fn();

    const { unmount } = render(
      <ValidationModal
        transaction={PENDING_TX}
        onClose={vi.fn()}
        onValidate={onValidate}
        onPostpone={onPostpone}
      />
    );

    const amountInput = screen.getByLabelText(/montant réel constaté/i);
    await user.clear(amountInput);
    await user.type(amountInput, "102.4");
    await user.click(
      screen.getByRole("button", { name: /confirmer la validation/i })
    );

    expect(onValidate).toHaveBeenCalledWith("tx-pending", -102.4);
    unmount();

    // Test report
    render(
      <ValidationModal
        transaction={PENDING_TX}
        onClose={vi.fn()}
        onValidate={onValidate}
        onPostpone={onPostpone}
      />
    );
    await user.click(screen.getByRole("button", { name: /^reporter$/i }));
    const dateInput = screen.getByLabelText(/nouvelle date prévue/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-11-28");
    await user.click(
      screen.getByRole("button", { name: /reporter l'opération/i })
    );

    expect(onPostpone).toHaveBeenCalledWith("tx-pending", "2026-11-28");
  });

  it("envoie payment_type DIRECT au simulateur et permet de valider la simulation", async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn().mockResolvedValue({
      feasibility_status: "SUCCESS",
      feasibility_message: "Projet 100% faisable !",
      min_projected_balance: 1800,
      lowest_balance_month: "12/2026",
      monthly_comparisons: [],
    });
    const onCommit = vi.fn();

    render(
      <ProjectionView
        isLoading={false}
        horizonMonths={12}
        onChangeHorizon={vi.fn()}
        projections={[]}
        accounts={ACCOUNTS}
        onSimulatePurchase={onSimulate}
        onCommitSimulation={onCommit}
      />
    );

    await user.click(screen.getByRole("button", { name: /simuler un achat/i }));
    await user.type(screen.getByLabelText(/nom du projet/i), "Vélo électrique");
    await user.type(screen.getByLabelText(/montant total/i), "1200");
    await user.click(
      screen.getByRole("button", { name: /lancer la simulation/i })
    );

    expect(onSimulate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Vélo électrique",
        payment_type: "DIRECT",
        total_amount: 1200,
      })
    );

    expect(
      await screen.findByText(/projet 100% faisable/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider et planifier/i })
    );
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Vélo électrique",
        payment_type: "DIRECT",
      })
    );
  });

  it("demande confirmation avant de clôturer un compte dans AccountsView", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <AccountsView
        isLoading={false}
        accounts={ACCOUNTS}
        includeInactive={false}
        onToggleIncludeInactive={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /actions pour boursobank courant/i })
    );
    await user.click(screen.getByRole("menuitem", { name: /supprimer/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/clôturer ce compte/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /clôturer le compte/i })
    );
    expect(onDelete).toHaveBeenCalledWith("acc-1");
  });
});
