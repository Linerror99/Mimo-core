import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FolderKanban,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const PILLARS = [
  {
    icon: CalendarClock,
    title: "Timeline financière continue",
    description:
      "Unifiez vos opérations réalisées, en attente de validation du jour et échéances projetées sur un même axe temporel.",
  },
  {
    icon: TrendingUp,
    title: "Projections de 1 mois à 5 ans",
    description:
      "Anticipez vos soldes mensuels, votre reste à vivre réel (Safe-to-Spend) et détectez chaque mois déficitaire avant qu'il n'arrive.",
  },
  {
    icon: FolderKanban,
    title: "Simulation What-If & Projets",
    description:
      "Testez l'impact d'un voyage, d'un achat ou de travaux sur votre trésorerie avant de l'injecter dans votre timeline.",
  },
  {
    icon: Users,
    title: "Mode Couple natif",
    description:
      "Trois portefeuilles tracés (Mon, Partenaire, Commun), invitation en un clic et dissolution propre avec historique archivé.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] dark:bg-[#09090B] dark:text-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-[#121215]/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A] text-xs font-bold text-white dark:bg-[#F8FAFC] dark:text-[#09090B]">
              MF
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Mimo Finance
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-[#F8FAFC] dark:text-[#09090B] dark:hover:bg-zinc-200"
            >
              Créer un compte
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Gestion financière personnelle & couple — Précision comptable
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
            Remplacez vos tableurs par une timeline financière claire sur 5 ans.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600 dark:text-zinc-400">
            Mimo Finance rassemble vos comptes, vos récurrences, vos projets
            What-If et vos finances de couple dans une interface sobre, rapide
            et pensée pour la prise de décision.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F172A] px-5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-[#F8FAFC] dark:text-[#09090B] dark:hover:bg-zinc-200"
            >
              Démarrer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Accéder à mon espace
            </Link>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Horizon de projection", value: "1 mois → 5 ans" },
            { label: "Portefeuilles en couple", value: "3 vues tracées" },
            { label: "Validation quotidienne", value: "Automatisée" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#121215]"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {stat.label}
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-slate-900 tabular-money dark:text-zinc-50">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Pillars Grid */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121215]"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 dark:text-zinc-400 lg:px-6">
          <span>© {new Date().getFullYear()} Mimo Finance.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-zinc-200">
              Confidentialité
            </Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-zinc-200">
              Conditions d&apos;utilisation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
