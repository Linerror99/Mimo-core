import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MimoAuthCard } from "@/components/features/auth/mimo-auth-card";

describe("MimoAuthCard — Authentification Style GitHub", () => {
  it("valide les champs obligatoires et soumet la connexion", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onRegister = vi.fn();

    render(
      <MimoAuthCard onLoginSubmit={onLogin} onRegisterSubmit={onRegister} />
    );

    await user.click(screen.getByRole("button", { name: /se connecter/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /veuillez saisir votre adresse e-mail/i
    );
    expect(onLogin).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/adresse e-mail/i), "alex@mimo.fr");
    await user.type(screen.getByLabelText(/^mot de passe$/i), "SuperSecret123!");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(onLogin).toHaveBeenCalledWith({
      email: "alex@mimo.fr",
      password: "SuperSecret123!",
    });
  });

  it("bascule en mode inscription et affiche l'indicateur de robustesse du mot de passe", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onRegister = vi.fn();

    render(
      <MimoAuthCard onLoginSubmit={onLogin} onRegisterSubmit={onRegister} />
    );

    await user.click(screen.getByRole("button", { name: /inscription/i }));
    await user.type(screen.getByLabelText(/prénom/i), "Alex");
    await user.type(screen.getByLabelText(/^nom$/i), "Martin");
    await user.type(screen.getByLabelText(/adresse e-mail/i), "alex@mimo.fr");
    await user.type(screen.getByLabelText(/^mot de passe$/i), "StrongPass1!");

    expect(screen.getByText(/robustesse/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /créer mon compte/i }));

    expect(onRegister).toHaveBeenCalledWith({
      firstName: "Alex",
      lastName: "Martin",
      email: "alex@mimo.fr",
      password: "StrongPass1!",
    });
  });
});
