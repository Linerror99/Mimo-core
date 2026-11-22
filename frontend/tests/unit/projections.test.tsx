import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectionView } from "@/components/features/projection/projection-view";
import type { MonthlyProjection } from "@/types/projection";

const PROJECTIONS: MonthlyProjection[] = [
  {
    month: 11,
    year: 2026,
    income: 3000,
    expense: 2200,
    balance: 10800,
    treasury_balance: 4800,
    projections: [],
  },
  {
    month: 12,
    year: 2026,
    income: 3000,
    expense: 3600,
    balance: 10200,
    treasury_balance: 4200,
    projections: [],
  },
];

describe("ProjectionView — Horizon 5 ans & Détection des mois déficitaires", () => {
  it("affiche le nombre exact de mois déficitaires et change d'horizon", async () => {
    const user = userEvent.setup();
    const onChangeHorizon = vi.fn();

    render(
      <ProjectionView
        isLoading={false}
        horizonMonths={12}
        onChangeHorizon={onChangeHorizon}
        projections={PROJECTIONS}
        accounts={[]}
      />
    );

    expect(screen.getByTestId("deficit-months-count")).toHaveTextContent("1");
    expect(screen.getByText("Déficit")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "5 ans" }));
    expect(onChangeHorizon).toHaveBeenCalledWith(60);
  });

  it("permet de choisir une période personnalisée (Du -> Au) et d'exclure les revenus futurs", async () => {
    const user = userEvent.setup();
    const onChangeCustomRange = vi.fn();
    const onToggleExclude = vi.fn();

    render(
      <ProjectionView
        isLoading={false}
        horizonMonths="custom"
        onChangeHorizon={vi.fn()}
        customStartDate="2026-11-22"
        customEndDate="2027-05-25"
        onChangeCustomRange={onChangeCustomRange}
        excludeFutureIncome={false}
        onToggleExcludeFutureIncome={onToggleExclude}
        projections={[
          {
            month: 12,
            year: 2026,
            income: 2000,
            expense: 1500,
            balance: 8500,
            treasury_balance: 8500,
            min_balance: 6500,
            min_treasury_balance: 6500,
            projections: [],
          },
        ]}
        accounts={[]}
      />
    );

    expect(screen.getByLabelText("Du")).toHaveValue("2026-11-22");
    expect(screen.getByLabelText("Au")).toHaveValue("2027-05-25");

    await user.click(
      screen.getByRole("checkbox", {
        name: /sans revenus futurs/i,
      })
    );
    expect(onToggleExclude).toHaveBeenCalledWith(true);
  });
});
