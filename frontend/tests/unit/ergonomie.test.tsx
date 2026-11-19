import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountsView } from "@/components/features/accounts/accounts-view";
import { GoalsView } from "@/components/features/goals/goals-view";
import { TimelineView } from "@/components/features/timeline/timeline-view";
import { ProjectsView } from "@/components/features/projects/projects-view";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";
import type { ProjectDetail } from "@/types/project";
import type { Transaction } from "@/types/transaction";

const ACCOUNTS: Account[] = [
  {
    id: "acc-1",
    household_id: "h-1",
    name: "BoursoBank",
    type: "CHECKING",
    initial_balance: 1000,
    current_balance: 1250,
    currency: "EUR",
    is_active: true,
    closed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    household_id: "h-1",
    name: "Logement",
    type: "EXPENSE",
    icon: null,
    color: "#7C3AED",
    parent_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: "tx-proj",
    household_id: "h-1",
    account_id: "acc-1",
    category_id: "cat-1",
    destination_account_id: null,
    description: "[Japon] Billets avion",
    amount: -950,
    transaction_date: "2026-11-19",
    type: "EXPENSE",
    notes: null,
    state: "PENDING",
    recurrence_frequency: "NONE",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: null,
    project_id: "proj-1",
    project_name: "Japon",
    is_active: true,
    deleted_at: null,
    created_at: "2026-11-19T00:00:00Z",
    updated_at: "2026-11-19T00:00:00Z",
  },
  {
    id: "tx-other",
    household_id: "h-1",
    account_id: "acc-2",
    category_id: null,
    destination_account_id: null,
    description: "Autre compte",
    amount: -25,
    transaction_date: "2026-11-18",
    type: "EXPENSE",
    notes: null,
    state: "REALIZED",
    recurrence_frequency: "NONE",
    recurrence_end_date: null,
    parent_transaction_id: null,
    recurring_template_id: null,
    is_active: true,
    deleted_at: null,
    created_at: "2026-11-18T00:00:00Z",
    updated_at: "2026-11-18T00:00:00Z",
  },
];

const PROJECT_DETAIL: ProjectDetail = {
  id: "proj-1",
  household_id: "h-1",
  created_by: "u-1",
  name: "Vacances Japon",
  description: "Séjour Tokyo",
  color: "#7C3AED",
  icon: "Plane",
  target_start_date: "2026-12-01",
  target_end_date: "2026-12-15",
  total_budget: 3000,
  status: "DRAFT",
  total_planned_amount: 950,
  items_count: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  items: [
    {
      id: "item-1",
      project_id: "proj-1",
      name: "Billets avion",
      amount: 950,
      planned_date: "2026-12-01",
      account_id: "acc-1",
      category_id: "cat-1",
      owner_user_id: null,
      transaction_id: null,
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("Ergonomie & Rapidité — Rapprochement, Filtres URL, Actions groupées & Décalage Projet", () => {
  it("permet de rapprocher le solde réel d'un compte et propose le lien direct vers la Timeline filtrée", async () => {
    const user = userEvent.setup();
    const onReconcile = vi.fn();

    render(
      <AccountsView
        isLoading={false}
        accounts={ACCOUNTS}
        includeInactive={false}
        onToggleIncludeInactive={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReconcileBalance={onReconcile}
      />
    );

    const timelineLink = screen.getByRole("link", {
      name: /voir les opérations/i,
    });
    expect(timelineLink).toHaveAttribute("href", "/timeline?account_id=acc-1");

    await user.click(screen.getByRole("button", { name: /rapprocher boursobank/i }));
    const input = screen.getByLabelText(/solde réel constaté/i);
    await user.clear(input);
    await user.type(input, "1300");
    await user.click(screen.getByRole("button", { name: /recaler le solde/i }));

    expect(onReconcile).toHaveBeenCalledWith(ACCOUNTS[0], 1300);
  });

  it("pré-filtre la Timeline via initialAccountFilter, affiche le badge Projet cliquable et valide une sélection multiple", async () => {
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
        categories={CATEGORIES}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onValidateTransaction={onValidate}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
        initialAccountFilter="acc-1"
      />
    );

    expect(screen.getByText("[Japon] Billets avion")).toBeInTheDocument();
    expect(screen.queryByText("Autre compte")).not.toBeInTheDocument();

    const projectBadgeLink = screen.getByRole("link", { name: /japon/i });
    expect(projectBadgeLink).toHaveAttribute("href", "/projects/proj-1");

    await user.click(
      screen.getByRole("checkbox", { name: /sélectionner \[japon\] billets avion/i })
    );
    expect(screen.getByTestId("timeline-bulk-bar")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider la sélection/i })
    );
    expect(onValidate).toHaveBeenCalledWith("tx-proj");
  });

  it("permet de décaler globalement les dates d'un projet de +1 semaine", async () => {
    const user = userEvent.setup();
    const onShiftDates = vi.fn();

    render(
      <ProjectsView
        isLoading={false}
        projects={[PROJECT_DETAIL]}
        selectedProject={PROJECT_DETAIL}
        simulation={null}
        accounts={ACCOUNTS}
        categories={CATEGORIES}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onDuplicateProject={vi.fn()}
        onAddProjectItem={vi.fn()}
        onUpdateProjectItem={vi.fn()}
        onDeleteProjectItem={vi.fn()}
        onCommitProject={vi.fn()}
        onRollbackProject={vi.fn()}
        onShiftProjectDates={onShiftDates}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /décaler les dates du projet/i })
    );
    await user.click(screen.getByRole("button", { name: /\+ 1 semaine/i }));

    expect(onShiftDates).toHaveBeenCalledWith("proj-1", { days: 7 });
  });

  it("affiche le Simulateur d'achat & d'objectif dans GoalsView et permet de simuler puis valider", async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn().mockResolvedValue({
      feasibility_status: "SUCCESS",
      feasibility_message: "Achat 100% viable !",
      min_projected_balance: 2100,
      lowest_balance_month: "12/2026",
      schedule: [
        { date: "2026-12-01", amount: 800, label: "Canapé (Paiement comptant)" },
      ],
      monthly_comparisons: [],
    });
    const onCommit = vi.fn();

    render(
      <GoalsView
        isLoading={false}
        goals={[]}
        accounts={ACCOUNTS}
        safeToSpend={null}
        onCreateGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onSimulatePurchase={onSimulate}
        onCommitSimulation={onCommit}
      />
    );

    expect(screen.getByTestId("purchase-simulator-card")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /ouvrir le simulateur/i })
    );
    await user.type(screen.getByLabelText(/nom de l'achat/i), "Canapé");
    await user.type(screen.getByLabelText(/montant total/i), "800");
    await user.click(
      screen.getByRole("button", { name: /simuler l'impact/i })
    );

    expect(onSimulate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Canapé",
        payment_type: "DIRECT",
        total_amount: 800,
      })
    );
    expect(await screen.findByText(/achat 100% viable/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider et intégrer/i })
    );
    expect(onCommit).toHaveBeenCalled();
  });

  it("permet de choisir directement le mois/année et recherche dans tout l'historique (allTransactions)", async () => {
    const user = userEvent.setup();
    const onChangeMonth = vi.fn();
    const olderTx: Transaction = {
      ...TRANSACTIONS[1],
      id: "tx-march",
      description: "Facture Garagiste Mars",
      transaction_date: "2026-03-14",
    };

    render(
      <TimelineView
        isLoading={false}
        year={2026}
        month={11}
        onChangeMonth={onChangeMonth}
        transactions={[TRANSACTIONS[0]]}
        allTransactions={[TRANSACTIONS[0], olderTx]}
        templates={[]}
        accounts={ACCOUNTS}
        categories={CATEGORIES}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onValidateTransaction={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDeleteTemplate={vi.fn()}
      />
    );

    // Changement direct du mois & année
    await user.selectOptions(screen.getByLabelText(/choisir le mois/i), "3");
    expect(onChangeMonth).toHaveBeenCalledWith(2026, 3);
    await user.selectOptions(screen.getByLabelText(/choisir l'année/i), "2027");
    expect(onChangeMonth).toHaveBeenCalledWith(2027, 11);

    // Recherche globale -> trouve la transaction de mars présente uniquement dans allTransactions
    expect(screen.queryByText("Facture Garagiste Mars")).not.toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText(/rechercher par libellé/i),
      "Garagiste"
    );
    expect(screen.getByText("Facture Garagiste Mars")).toBeInTheDocument();
    expect(
      screen.getByTestId("timeline-global-scope-banner")
    ).toBeInTheDocument();
  });
});
