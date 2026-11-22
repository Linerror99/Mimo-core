"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MimoAuthCard } from "@/components/features/auth/mimo-auth-card";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const { login, register, isLoading } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setErrorMessage(null);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setErrorMessage("Adresse e-mail ou mot de passe incorrect.");
    }
  };

  const handleRegister = async ({
    email,
    password,
    firstName,
    lastName,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    setErrorMessage(null);
    try {
      await register(email, password, firstName, lastName);
      toast.success("Bienvenue sur Mimo Finance");
      router.push("/dashboard");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Impossible de créer le compte."
      );
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.10),_transparent_60%)] px-4 py-12 dark:bg-[#09090B] dark:bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.16),_transparent_60%)]">
      <MimoAuthCard
        initialMode="register"
        onLoginSubmit={handleLogin}
        onRegisterSubmit={handleRegister}
        errorMessage={errorMessage}
        isSubmitting={isLoading}
      />
    </div>
  );
}
