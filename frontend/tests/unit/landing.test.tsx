import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "@/app/page";

describe("LandingPage — Vitrine Mimo Finance", () => {
  it("affiche le hero, les CTA connexion/inscription, les garanties DSP2 et les liens légaux", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /pilotez votre trésorerie au centime près/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("link", { name: /connexion|se connecter/i })[0]
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getAllByRole("link", {
        name: /créer un compte|démarrer gratuitement/i,
      })[0]
    ).toHaveAttribute("href", "/register");

    expect(screen.getByText(/100 % lecture seule/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /politique de confidentialité/i })
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getAllByRole("link", { name: /conditions d'utilisation/i })[0]
    ).toHaveAttribute("href", "/terms");
  });
});
