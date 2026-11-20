import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectsView } from "@/components/features/projects/projects-view";
import { GoalsView } from "@/components/features/goals/goals-view";
import type { Goal } from "@/types/goal";
import type { Project, ProjectDetail, ProjectSimulation } from "@/types/project";

const SAMPLE_PROJECT: Project = {
  id: "p-1",
  household_id: "h-1",
  created_by: "u-1",
  name: "Voyage Japon",
  description: "2 semaines Tokyo / Kyoto",
  color: "#7c3aed",
  icon: "Plane",
  status: "DRAFT",
  total_budget: 4000,
  total_planned_amount: 3500,
  items_count: 1,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

const SAMPLE_DETAIL: ProjectDetail = {
  ...SAMPLE_PROJECT,
  items: [
    {
      id: "it-1",
      project_id: "p-1",
      name: "Billets A/R",
      amount: 1400,
      planned_date: "2027-04-01",
      account_id: "acc-1",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ],
};

const SAMPLE_SIMULATION: ProjectSimulation = {
  project_id: "p-1",
  project_name: "Voyage Japon",
  is_viable: true,
  status: "DRAFT",
  total_cost: 3500,
  current_balance: 10000,
  projected_min_balance_baseline: 9000,
  projected_min_balance_whatif: 5500,
  warnings: [],
  timeline: [
    {
      date: "2027-04-01",
      baseline_balance: 9000,
      whatif_balance: 5500,
      impact: -3500,
      accounts: {},
    },
  ],
};

const SAMPLE_GOALS: Goal[] = [
  {
    id: "g-1",
    household_id: null,
    user_id: "u-1",
    created_by: "u-1",
    name: "Épargne de précaution",
    description: "Matelas 6 mois",
    target_amount: 10000,
    current_amount: 6000,
    monthly_contribution: 250,
    progress_percentage: 60,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("ProjectsView & GoalsView — Pages séparées avec dispositions d'origine", () => {
  it("affiche la vue dédiée d'un projet (Dépenses + onglet Simulation What-If) et permet de valider", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();

    render(
      <ProjectsView
        isLoading={false}
        projects={[SAMPLE_PROJECT]}
        selectedProject={SAMPLE_DETAIL}
        simulation={SAMPLE_SIMULATION}
        accounts={[]}
        categories={[]}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onDuplicateProject={vi.fn()}
        onAddProjectItem={vi.fn()}
        onUpdateProjectItem={vi.fn()}
        onDeleteProjectItem={vi.fn()}
        onCommitProject={onCommit}
        onRollbackProject={vi.fn()}
      />
    );

    expect(screen.getByText("Billets A/R")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /simulation what-if/i })
    );
    expect(screen.getByTestId("whatif-simulation-panel")).toBeInTheDocument();
    expect(screen.getByText(/projet viable financièrement/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider et intégrer au budget/i })
    );
    expect(onCommit).toHaveBeenCalledWith("p-1");
  });

  it("affiche la page dédiée Objectifs d'épargne avec détails & versements", async () => {
    const user = userEvent.setup();
    const onSelectDetail = vi.fn();

    render(
      <GoalsView
        isLoading={false}
        goals={SAMPLE_GOALS}
        accounts={[]}
        safeToSpend={null}
        onSelectGoalForDetail={onSelectDetail}
        onCreateGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
      />
    );

    expect(screen.getByText("Épargne de précaution")).toBeInTheDocument();
    await user.click(screen.getByText("Épargne de précaution"));
    expect(onSelectDetail).toHaveBeenCalledWith(SAMPLE_GOALS[0]);
    expect(screen.getByText(/historique des versements/i)).toBeInTheDocument();
  });
});
