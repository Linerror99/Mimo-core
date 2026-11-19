"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface MimoAuthCardProps {
  initialMode?: "login" | "register";
  onLoginSubmit: (values: LoginFormValues) => Promise<void> | void;
  onRegisterSubmit: (values: RegisterFormValues) => Promise<void> | void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
}

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Faible", "Moyen", "Bon", "Robuste"];
  return { score, label: labels[Math.max(0, score - 1)] || "Faible" };
}

export function MimoAuthCard({
  initialMode = "login",
  onLoginSubmit,
  onRegisterSubmit,
  errorMessage = null,
  isSubmitting = false,
}: MimoAuthCardProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const activeError = validationError || errorMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (mode === "login") {
      if (!email.trim() || !password) {
        setValidationError(
          "Veuillez saisir votre adresse e-mail et votre mot de passe."
        );
        return;
      }
      await onLoginSubmit({ email: email.trim(), password });
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setValidationError("Veuillez renseigner tous les champs obligatoires.");
      return;
    }
    if (password.length < 8) {
      setValidationError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }
    await onRegisterSubmit({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-[#121215]">
      {/* Header & Mode Switch */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A] text-xs font-bold text-white dark:bg-[#F8FAFC] dark:text-[#09090B]">
              MF
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Mimo Finance
            </span>
          </Link>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setValidationError(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setValidationError(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-slate-600 dark:text-zinc-400"
              )}
            >
              Inscription
            </button>
          </div>
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          {mode === "login"
            ? "Se connecter à votre espace"
            : "Créer votre compte Mimo"}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          {mode === "login"
            ? "Accédez à votre timeline financière, vos projections et votre foyer."
            : "Centralisez vos comptes et projetez votre trésorerie jusqu'à 5 ans."}
        </p>
      </div>

      {/* OWASP Alert */}
      {activeError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{activeError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mode === "register" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="auth-first-name"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Prénom
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                <input
                  id="auth-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="auth-last-name"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Nom
              </label>
              <input
                id="auth-last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Martin"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
          >
            Adresse e-mail
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="auth-password"
              className="text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Mot de passe
            </label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Mot de passe oublié ?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              id="auth-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Minimalist 4-bar password strength meter on register */}
          {mode === "register" && password.length > 0 && (
            <div className="mt-2">
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      strength.score >= bar
                        ? strength.score <= 1
                          ? "bg-rose-500"
                          : strength.score <= 2
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        : "bg-slate-200 dark:bg-zinc-800"
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                Robustesse : <span className="font-medium">{strength.label}</span>
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting
            ? "Traitement en cours..."
            : mode === "login"
              ? "Se connecter"
              : "Créer mon compte"}
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-500 dark:border-zinc-800/80 dark:text-zinc-400">
        Session chiffrée par cookie <code className="font-mono">HttpOnly</code>.{" "}
        <Link href="/privacy" className="underline hover:text-slate-700 dark:hover:text-zinc-200">
          Confidentialité
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline hover:text-slate-700 dark:hover:text-zinc-200">
          Conditions
        </Link>
      </div>
    </div>
  );
}
