import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("AppShell — Navigation Responsive, Privacy Mode, Sidebar & Ctrl+K", () => {
  it("affiche le patrimoine net en police tabulaire et ouvre le menu burger sur mobile", async () => {
    const user = userEvent.setup();

    render(
      <AppShell activePath="/dashboard" initialTotalBalance={12450.5}>
        <div>Contenu Mimo</div>
      </AppShell>
    );

    expect(screen.getByTestId("sidebar-total-balance")).toHaveTextContent(
      /12[\s\u202f]?450,50\s*€/
    );

    const burgerBtn = screen.getByRole("button", {
      name: /ouvrir le menu de navigation/i,
    });
    await user.click(burgerBtn);
    expect(screen.getByTestId("mobile-navigation-drawer")).toBeInTheDocument();
  });

  it("permet de réduire la sidebar, masquer les montants et ouvrir la Command Palette", async () => {
    const user = userEvent.setup();

    render(
      <AppShell activePath="/dashboard" initialTotalBalance={5000}>
        <div>Contenu</div>
      </AppShell>
    );

    // Collapse sidebar
    await user.click(
      screen.getByRole("button", { name: /réduire la barre latérale/i })
    );
    expect(
      screen.getByRole("button", { name: /étendre la barre latérale/i })
    ).toBeInTheDocument();

    // Expand sidebar back to check privacy mask
    await user.click(
      screen.getByRole("button", { name: /étendre la barre latérale/i })
    );
    await user.click(
      screen.getByRole("button", { name: /masquer les montants/i })
    );
    expect(screen.getByTestId("sidebar-total-balance")).toHaveTextContent(
      "•••• €"
    );

    // Command palette
    await user.click(
      screen.getByRole("button", { name: /recherche et actions rapides/i })
    );
    expect(
      screen.getByPlaceholderText(/rechercher une page, un compte/i)
    ).toBeInTheDocument();
  });
});
