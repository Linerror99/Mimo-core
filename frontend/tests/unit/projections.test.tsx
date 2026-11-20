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
});
