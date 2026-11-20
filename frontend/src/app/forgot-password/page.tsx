"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth-service";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      toast.success("Code de réinitialisation envoyé par e-mail.");
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer le code pour le moment."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 6) {
      setError("Veuillez saisir le code à 6 chiffres reçu par e-mail.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyResetCode(email.trim(), code.trim());
      if (!res.valid) {
        setError(res.message || "Code invalide ou expiré.");
      } else {
        setStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), newPassword);
      toast.success("Mot de passe réinitialisé avec succès.");
      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Échec de la réinitialisation du mot de passe."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 dark:bg-[#09090B]">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-[#121215]">
        <Link
          href="/login"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>

        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Réinitialiser le mot de passe
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Étape {step} sur 3 —{" "}
          {step === 1
            ? "Saisissez votre adresse e-mail"
            : step === 2
              ? "Vérifiez le code reçu par e-mail"
              : "Définissez votre nouveau mot de passe"}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestCode} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="fp-email"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Envoi en cours..." : "Recevoir le code par e-mail"}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="fp-code"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Code à 6 chiffres
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="fp-code"
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm tracking-widest dark:border-zinc-800 dark:bg-[#18181B]"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Vérification..." : "Vérifier le code"}
            </Button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="fp-new-pwd"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Nouveau mot de passe
              </label>
              <input
                id="fp-new-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
              />
            </div>
            <div>
              <label
                htmlFor="fp-confirm-pwd"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="fp-confirm-pwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <CheckCircle2 className="h-4 w-4" />
              {loading ? "Enregistrement..." : "Mettre à jour le mot de passe"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
