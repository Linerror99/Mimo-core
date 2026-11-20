import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-12 dark:bg-[#09090B]">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 dark:border-zinc-800 dark:bg-[#121215]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Politique de confidentialité
        </h1>
        <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-zinc-400">
          <p>
            Mimo Finance traite vos données financières exclusivement pour vous
            fournir vos tableaux de bord, votre timeline, vos projections et la
            synchronisation de votre foyer en mode couple.
          </p>
          <p>
            Les sessions sont sécurisées via cookies <code className="font-mono">HttpOnly</code>{" "}
            et révocation instantanée côté serveur. Aucune donnée n&apos;est vendue ou
            partagée à des tiers publicitaires.
          </p>
        </div>
      </div>
    </div>
  );
}
