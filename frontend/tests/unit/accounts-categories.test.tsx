import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountsView } from "@/components/features/accounts/accounts-view";
import { CategoriesView } from "@/components/features/categories/categories-view";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";

const SAMPLE_ACCOUNTS: Account[] = [
  {
    id: "a-1",
    household_id: "h-1",
    name: "Livret A",
    type: "SAVINGS",
    initial_balance: 5000,
    current_balance: 8200,
    currency: "EUR",
    is_active: true,
    closed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const SAMPLE_CATEGORIES: Category[] = [
  {
    id: "c-1",
    household_id: "h-1",
    name: "Logement",
    type: "EXPENSE",
    icon: null,
    color: "#7C3AED",
    parent_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "c-2",
    household_id: "h-1",
    name: "Salaire",
    type: "INCOME",
    icon: null,
    color: "#10B981",
    parent_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("AccountsView & CategoriesView", () => {
  it("crée un compte avec solde initial mais verrouille le solde lors de l'édition d'un compte existant", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onUpdate = vi.fn();

    render(
      <AccountsView
        isLoading={false}
        accounts={SAMPLE_ACCOUNTS}
        includeInactive={false}
        onToggleIncludeInactive={vi.fn()}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );

    // Création
    await user.click(screen.getByRole("button", { name: /nouveau compte/i }));
    expect(screen.getByLabelText(/solde initial/i)).not.toBeDisabled();
    await user.type(screen.getByLabelText(/nom du compte/i), "PEA Bourse");
    await user.click(screen.getByRole("button", { name: /créer le compte/i }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "PEA Bourse", type: "CHECKING" })
    );

    // Modification d'un compte existant : le solde est verrouillé (disabled)
    await user.click(screen.getByRole("button", { name: /actions pour livret a/i }));
    await user.click(screen.getByRole("menuitem", { name: /modifier/i }));
    expect(screen.getByLabelText(/solde actuel \(verrouillé\)/i)).toBeDisabled();
    await user.clear(screen.getByLabelText(/nom du compte/i));
    await user.type(screen.getByLabelText(/nom du compte/i), "Livret A Plus");
    await user.click(screen.getByRole("button", { name: /^enregistrer$/i }));
    expect(onUpdate).toHaveBeenCalledWith("a-1", {
      name: "Livret A Plus",
      type: "SAVINGS",
    });
  });

  it("bascule entre les catégories Dépenses et Revenus", async () => {
    const user = userEvent.setup();

    render(
      <CategoriesView
        isLoading={false}
        categories={SAMPLE_CATEGORIES}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Logement")).toBeInTheDocument();
    expect(screen.queryByText("Salaire")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /revenus/i }));
    expect(screen.getByText("Salaire")).toBeInTheDocument();
  });
});
