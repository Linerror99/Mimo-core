import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 dark:bg-[#09090B]">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-[#121215]">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          Erreur 404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Page introuvable
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
          La route demandée n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-[#0F172A] px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-[#F8FAFC] dark:text-[#09090B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
