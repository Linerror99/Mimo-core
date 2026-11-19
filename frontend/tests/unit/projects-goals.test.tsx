import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectsView } from "@/components/features/projects/projects-view";
import type { Goal } from "@/types/goal";
import type { Project, ProjectDetail, ProjectSimulation } from "@/types/project";

const SAMPLE_PROJECT: Project = {
  id: "p-1",
  household_id: "h-1",
  created_by: "u-1",
  name: "Voyage Japon",
  description: "2 semaines Tokyo / Kyoto",
  color: "#2563EB",
  icon: "plane",
  status: "DRAFT",
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
    description: null,
    target_amount: 10000,
    current_amount: 6000,
    progress_percentage: 60,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("ProjectsView — Simulation What-If, Commit & Objectifs d'épargne", () => {
  it("affiche le verdict What-If, permet de valider le projet et bascule sur l'onglet Objectifs", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();

    render(
      <ProjectsView
        isLoading={false}
        projects={[SAMPLE_PROJECT]}
        selectedProject={SAMPLE_DETAIL}
        simulation={SAMPLE_SIMULATION}
        goals={SAMPLE_GOALS}
        accounts={[]}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onDuplicateProject={vi.fn()}
        onAddProjectItem={vi.fn()}
        onDeleteProjectItem={vi.fn()}
        onCommitProject={onCommit}
        onRollbackProject={vi.fn()}
        onCreateGoal={vi.fn()}
        onAddGoalContribution={vi.fn()}
        onDeleteGoal={vi.fn()}
      />
    );

    expect(screen.getByTestId("whatif-simulation-panel")).toBeInTheDocument();
    expect(screen.getByText(/projet viable financièrement/i)).toBeInTheDocument();
    expect(screen.getByText("Billets A/R")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /valider dans la timeline/i })
    );
    expect(onCommit).toHaveBeenCalledWith("p-1");

    await user.click(
      screen.getByRole("button", { name: /objectifs d'épargne/i })
    );
    expect(screen.getByText("Épargne de précaution")).toBeInTheDocument();
  });
});
