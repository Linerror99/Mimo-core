import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          Conditions d&apos;utilisation
        </h1>
        <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-zinc-400">
          <p>
            Mimo Finance est un outil d&apos;aide à la gestion budgétaire et de
            projection personnelle. Les simulations financières et projections
            fournies ont une valeur informative et ne constituent pas un conseil
            en investissement.
          </p>
          <p>
            Vous restez pleinement propriétaire des données saisies dans votre
            espace personnel ou partagé.
          </p>
        </div>
      </div>
    </div>
  );
}
