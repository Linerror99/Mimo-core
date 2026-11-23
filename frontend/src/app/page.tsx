import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Landmark,
    label: "Open Banking DSP2",
    sub: "Enable Banking · Banques européennes",
  },
  {
    icon: ShieldCheck,
    label: "100 % lecture seule",
    sub: "Aucun virement ni débit possible",
  },
  {
    icon: Lock,
    label: "Chiffrement bancaire",
    sub: "TLS 1.3 · Fernet AES · bcrypt 12",
  },
  {
    icon: Building2,
    label: "Hébergement Europe",
    sub: "Google Cloud · europe-west1 · RGPD",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Centralisez vos comptes",
    description:
      "Connectez votre banque en lecture seule (DSP2) ou suivez vos comptes manuellement. Vos opérations comptabilisées se synchronisent toutes les 6h.",
  },
  {
    step: "02",
    title: "Unifiez présent & futur",
    description:
      "Programmez vos loyers, salaires, virements et projets. Mimo rapproche automatiquement chaque écriture bancaire avec vos échéances prévues.",
  },
  {
    step: "03",
    title: "Décidez avec 5 ans d'avance",
    description:
      "Connaissez votre reste à vivre réel (Safe-to-Spend), testez un achat en simulation What-If et anticipez chaque creux de trésorerie.",
  },
];

const SECURITY_GUARANTEES = [
  {
    title: "Accès strictement en lecture seule",
    description:
      "Conformément à la directive européenne DSP2, Mimo ne peut jamais initier de paiement, de prélèvement ou de virement sur vos comptes.",
  },
  {
    title: "Zéro identifiant bancaire stocké",
    description:
      "L'authentification forte (3DS / biométrie) s'effectue directement sur l'espace officiel de votre banque. Consentement révocable à tout moment.",
  },
  {
    title: "Chiffrement bout-en-bout & au repos",
    description:
      "Sessions bancaires chiffrées en base (Fernet AES), cookies HttpOnly, protection anti brute-force et secrets isolés dans GCP Secret Manager.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-violet-500/20 selection:text-violet-900 dark:bg-[#09090B] dark:text-[#FAFAFA] dark:selection:text-violet-200">
      {/* Top Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[520px] overflow-hidden"
      >
        <div className="mx-auto h-full max-w-6xl bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.14),_transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.22),_transparent_65%)]" />
      </div>

      {/* Sticky Glassmorphic Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mimo-logo.jpg"
              alt="Logo Mimo Finance"
              className="h-8 w-8 rounded-lg border border-violet-500/25 object-cover shadow-sm"
            />
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
              Mimo Finance
            </span>
          </Link>

          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-6 text-xs font-medium text-slate-600 dark:text-zinc-400 md:flex"
          >
            <a
              href="#fonctionnalites"
              className="transition-colors hover:text-slate-950 dark:hover:text-zinc-100"
            >
              Fonctionnalités
            </a>
            <a
              href="#comment-ca-marche"
              className="transition-colors hover:text-slate-950 dark:hover:text-zinc-100"
            >
              Comment ça marche
            </a>
            <a
              href="#securite"
              className="transition-colors hover:text-slate-950 dark:hover:text-zinc-100"
            >
              Sécurité DSP2
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:text-sm"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-xs font-medium text-white shadow-sm shadow-violet-600/20 transition-all hover:bg-violet-700 dark:hover:bg-violet-500 sm:text-sm"
            >
              Créer un compte
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 lg:px-6 lg:pb-24 lg:pt-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Hero Copy */}
            <div className="lg:col-span-6">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/[0.07] px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Open Banking DSP2 · Projections 5 ans · Mode Couple
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50 sm:text-5xl sm:leading-[1.1]">
                Pilotez votre trésorerie au centime près,{" "}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                  sur 5 ans.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-zinc-400">
                Mimo Finance remplace vos tableurs par une timeline bancaire
                vivante. Synchronisez vos comptes en lecture seule, anticipez
                chaque échéance et simulez vos projets avant de dépenser.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700 dark:hover:bg-violet-500"
                >
                  Démarrer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-100 dark:hover:bg-zinc-800/80"
                >
                  Accéder à mon espace
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Synchro bancaire DSP2 lecture seule
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Zéro publicité · Zéro revente de données
                </span>
              </div>
            </div>

            {/* Hero Interactive-looking Product Preview */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-2xl shadow-slate-900/[0.06] backdrop-blur dark:border-zinc-800 dark:bg-[#121215]/95 dark:shadow-black/40">
                {/* Window Chrome */}
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
                    <span className="ml-2 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                      Timeline &amp; Trésorerie · Vue consolidée
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    <RefreshCw className="h-2.5 w-2.5" />
                    Synchro DSP2 active
                  </span>
                </div>

                {/* KPI Preview Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Patrimoine net
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold text-slate-950 tabular-money dark:text-zinc-50">
                      18 420,50 €
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      +640,00 € ce mois
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3.5 dark:border-violet-500/25 dark:bg-violet-500/[0.08]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300">
                      Reste à vivre (Safe-to-Spend)
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold text-slate-950 tabular-money dark:text-zinc-50">
                      1 285,00 €
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                      Après charges &amp; épargne prévues
                    </p>
                  </div>
                </div>

                {/* Mini 5-Year Trajectory Sparkline */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Projection trésorerie (12 mois)
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      0 mois déficitaire
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 320 68"
                    className="h-16 w-full overflow-visible"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="mimoArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,54 C40,48 64,44 102,38 C142,32 168,36 205,24 C242,14 276,16 320,6 L320,68 L0,68 Z"
                      fill="url(#mimoArea)"
                    />
                    <path
                      d="M0,54 C40,48 64,44 102,38 C142,32 168,36 205,24 C242,14 276,16 320,6"
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                    />
                    <circle cx="320" cy="6" r="3.5" fill="#7C3AED" />
                  </svg>
                </div>

                {/* Mini Timeline Rows */}
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-zinc-800/80 dark:border-zinc-800/80">
                  {[
                    {
                      title: "Salaire mensuel",
                      meta: "Banque · Auto-rapproché",
                      badge: "Réalisée",
                      badgeCls:
                        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      amount: "+2 850,00 €",
                      amountCls: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      title: "Loyer appartement",
                      meta: "Récurrence · Échéance du jour",
                      badge: "En attente",
                      badgeCls:
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      amount: "-920,00 €",
                      amountCls: "text-rose-600 dark:text-rose-400",
                    },
                    {
                      title: "Projet Vacances Japon",
                      meta: "Enveloppe What-If · Mois prochain",
                      badge: "Projetée",
                      badgeCls:
                        "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300",
                      amount: "-450,00 €",
                      amountCls: "text-slate-700 dark:text-zinc-300",
                    },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-slate-900 dark:text-zinc-100">
                            {row.title}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${row.badgeCls}`}
                          >
                            {row.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                          {row.meta}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-xs font-semibold tabular-money ${row.amountCls}`}
                      >
                        {row.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="border-y border-slate-200/80 bg-white/70 py-8 dark:border-zinc-800/80 dark:bg-[#121215]/50">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-violet-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-violet-400">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                      {item.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bento Features Grid */}
        <section
          id="fonctionnalites"
          className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Conçu pour la clarté financière
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50 sm:text-3xl">
              Chaque euro passé, présent et futur à sa juste place.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              Une architecture pensée comme un outil professionnel, sans la
              complexité d&apos;un logiciel comptable.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Bento 1 - Timeline & Calendar */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121215] lg:col-span-7">
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-zinc-50">
                  Timeline unifiée &amp; vue Calendrier
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                  Visualisez votre solde jour après jour, passez en un clic de
                  la vue liste groupée au calendrier mensuel et repérez
                  immédiatement les jours sous tension.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-7 gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center dark:border-zinc-800/80 dark:bg-zinc-900/50">
                {[
                  { d: "Lun", v: "1 420 €", cls: "text-emerald-600 dark:text-emerald-400" },
                  { d: "Mar", v: "1 385 €", cls: "text-emerald-600 dark:text-emerald-400" },
                  { d: "Mer", v: "465 €", cls: "text-slate-700 dark:text-zinc-300" },
                  { d: "Jeu", v: "465 €", cls: "text-slate-700 dark:text-zinc-300" },
                  { d: "Ven", v: "48 €", cls: "text-amber-600 dark:text-amber-400" },
                  { d: "Sam", v: "2 898 €", cls: "text-emerald-600 dark:text-emerald-400" },
                  { d: "Dim", v: "2 840 €", cls: "text-emerald-600 dark:text-emerald-400" },
                ].map((cell) => (
                  <div
                    key={cell.d}
                    className="rounded-lg bg-white px-1 py-2 dark:bg-[#121215]"
                  >
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {cell.d}
                    </p>
                    <p
                      className={`mt-1 truncate font-mono text-[10px] font-semibold ${cell.cls}`}
                    >
                      {cell.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bento 2 - Open Banking */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121215] lg:col-span-5">
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Landmark className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-zinc-50">
                  Open Banking DSP2 &amp; Fusion intelligente
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                  Auto-rapprochement exact au centime près sur vos échéances et
                  virements prévus. Et si le montant varie, fusionnez en 1 clic
                  sans jamais créer de doublon.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Synchro auto 6h",
                  "Zéro doublon",
                  "Virements internes",
                  "Révocable à tout moment",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bento 3 - Projects & What-If */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121215] lg:col-span-5">
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-zinc-50">
                  Projets, Objectifs &amp; Simulation What-If
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                  Testez l&apos;impact réel d&apos;un voyage, de travaux ou
                  d&apos;un gros achat sur votre courbe de trésorerie avant de
                  l&apos;injecter dans votre timeline.
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-zinc-200">
                    Objectif Apport / Épargne
                  </span>
                  <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">
                    74 %
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" />
                </div>
              </div>
            </div>

            {/* Bento 4 - 5-Year Projections & Couple Mode */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#121215] lg:col-span-7">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-zinc-50">
                    Projections de 1 mois à 5 ans
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                    Détectez à l&apos;avance chaque mois déficitaire, exportez
                    vos rapports mensuels en PDF et suivez votre trajectoire
                    d&apos;épargne.
                  </p>
                </div>
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Users className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-zinc-50">
                    Mode Couple natif
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                    Trois portefeuilles distincts (Mon, Partenaire, Commun),
                    invitation par email en un clic et dissolution propre avec
                    historique préservé.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="comment-ca-marche"
          className="border-t border-slate-200/80 bg-white/60 py-16 dark:border-zinc-800/80 dark:bg-[#121215]/40 lg:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Prise en main rapide
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50 sm:text-3xl">
                Opérationnel en moins de 3 minutes.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121215]"
                >
                  <span className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-400">
                    ÉTAPE {item.step}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-950 dark:text-zinc-50">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Dark Showcase */}
        <section id="securite" className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0D0E14] p-8 text-white shadow-xl sm:p-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sécurité &amp; Confidentialité par conception
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Vos données financières méritent une sécurité de niveau bancaire.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Nous appliquons les standards OWASP, RGPD et la directive
                européenne DSP2 sur chaque couche de l&apos;application.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {SECURITY_GUARANTEES.map((g) => (
                <div
                  key={g.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <h3 className="text-sm font-semibold text-white">{g.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {g.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6 text-xs text-zinc-400">
              <Link
                href="/privacy"
                className="font-medium text-violet-300 transition-colors hover:text-violet-200 hover:underline"
              >
                Politique de confidentialité (RGPD &amp; DSP2) →
              </Link>
              <Link
                href="/terms"
                className="font-medium text-zinc-300 transition-colors hover:text-white hover:underline"
              >
                Conditions d&apos;utilisation →
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-600/[0.08] via-indigo-500/[0.05] to-transparent p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-zinc-50 sm:text-2xl">
                Prêt à reprendre le contrôle sur votre trésorerie ?
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Accédez à votre timeline financière et à vos projections en
                quelques secondes.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-100"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 dark:hover:bg-violet-500"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-8 dark:border-zinc-800/80 dark:bg-[#09090B]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 dark:text-zinc-400 lg:px-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mimo-logo.jpg"
              alt="Logo Mimo Finance"
              className="h-6 w-6 rounded-md border border-violet-500/20 object-cover"
            />
            <span>© {new Date().getFullYear()} Mimo Finance. Tous droits réservés.</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/login"
              className="hover:text-slate-900 dark:hover:text-zinc-200"
            >
              Connexion
            </Link>
            <Link
              href="/privacy"
              className="hover:text-slate-900 dark:hover:text-zinc-200"
            >
              Confidentialité
            </Link>
            <Link
              href="/terms"
              className="hover:text-slate-900 dark:hover:text-zinc-200"
            >
              Conditions d&apos;utilisation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
