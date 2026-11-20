import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { usePrivacyStore } from "@/stores/privacy-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("AppShell — Logo, Avatar Header, Floutage Privacy, Projets/Objectifs séparés & Ctrl+K", () => {
  it("affiche le logo Mimo, les liens séparés Projets & Objectifs, le profil en haut à droite et ouvre le menu burger", async () => {
    usePrivacyStore.setState({ isPrivate: false });
    const user = userEvent.setup();

    render(
      <AppShell activePath="/dashboard" initialTotalBalance={12450.5}>
        <div>Contenu Mimo</div>
      </AppShell>
    );

    expect(screen.getByAltText(/logo mimo finance/i)).toHaveAttribute(
      "src",
      "/mimo-logo.jpg"
    );
    expect(screen.getByRole("link", { name: /^projets$/i })).toHaveAttribute(
      "href",
      "/projects"
    );
    expect(screen.getByRole("link", { name: /^objectifs$/i })).toHaveAttribute(
      "href",
      "/goals"
    );
    expect(
      screen.getByRole("button", { name: /menu profil utilisateur/i })
    ).toBeInTheDocument();

    expect(screen.getByTestId("sidebar-total-balance")).toHaveTextContent(
      /12[\s\u202f]?450,50\s*€/
    );

    const burgerBtn = screen.getByRole("button", {
      name: /ouvrir le menu de navigation/i,
    });
    await user.click(burgerBtn);
    expect(screen.getByTestId("mobile-navigation-drawer")).toBeInTheDocument();
  });

  it("floute les montants en mode discret (CSS blur, sans remplacer par des points) et ouvre la Command Palette", async () => {
    usePrivacyStore.setState({ isPrivate: false });
    const user = userEvent.setup();

    render(
      <AppShell activePath="/dashboard" initialTotalBalance={5000}>
        <div>Contenu</div>
      </AppShell>
    );

    await user.click(
      screen.getByRole("button", { name: /masquer les montants/i })
    );
    const balanceEl = screen.getByTestId("sidebar-total-balance");
    expect(balanceEl).toHaveTextContent(/5[\s\u202f]?000,00\s*€/);
    expect(balanceEl.className).toContain("blur-");

    await user.click(
      screen.getByRole("button", { name: /recherche et actions rapides/i })
    );
    expect(
      screen.getByPlaceholderText(/rechercher une page, un compte/i)
    ).toBeInTheDocument();
  });
});
