"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MimoAuthCard } from "@/components/features/auth/mimo-auth-card";
import { useAuthStore } from "@/stores/auth-store";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isLoading } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

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
      toast.success("Connexion réussie");
      router.push(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    } catch {
      setErrorMessage(
        "Adresse e-mail ou mot de passe incorrect. Veuillez réessayer."
      );
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
      toast.success("Compte créé avec succès");
      router.push("/dashboard");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Impossible de créer votre compte pour le moment."
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 dark:bg-[#09090B]">
      <MimoAuthCard
        initialMode="login"
        onLoginSubmit={handleLogin}
        onRegisterSubmit={handleRegister}
        errorMessage={errorMessage}
        isSubmitting={isLoading}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#09090B]">
          <div className="h-[380px] w-full max-w-md animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
