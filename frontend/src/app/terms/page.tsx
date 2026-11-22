import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Mimo Finance",
  description:
    "Conditions Générales d'Utilisation (CGU) de Mimo Finance, application de gestion budgétaire, projections de trésorerie et synchronisation Open Banking DSP2.",
};

const LAST_UPDATED = "22 novembre 2026";

const SECTIONS = [
  { id: "objet", label: "1. Objet et champ d'application" },
  { id: "service", label: "2. Description des fonctionnalités" },
  { id: "open-banking", label: "3. Connexion bancaire Open Banking (DSP2)" },
  { id: "compte", label: "4. Compte utilisateur & Mode Couple" },
  { id: "conseil", label: "5. Absence de conseil financier" },
  { id: "propriete", label: "6. Propriété des données & propriété intellectuelle" },
  { id: "securite", label: "7. Disponibilité, sécurité & responsabilité" },
  { id: "resiliation", label: "8. Suspension, suppression et réversibilité" },
  { id: "droit", label: "9. Évolutions & droit applicable" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] dark:bg-[#09090B] dark:text-[#FAFAFA]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-[#121215]/95">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mimo-logo.jpg"
              alt="Logo Mimo Finance"
              className="h-8 w-8 rounded-lg border border-violet-500/20 object-cover"
            />
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Mimo Finance
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/privacy"
              className="text-slate-500 transition-colors hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
            >
              Politique de confidentialité
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à l&apos;application
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
        {/* Hero */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-[#121215]">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <FileText className="h-3.5 w-3.5" />
            Conditions Générales d&apos;Utilisation (CGU)
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-zinc-50">
            Conditions d&apos;utilisation de Mimo Finance
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-zinc-400">
            Dernière mise à jour :{" "}
            <strong className="font-medium text-slate-800 dark:text-zinc-200">
              {LAST_UPDATED}
            </strong>{" "}
            · Version 2.0 (incluant la synchronisation bancaire DSP2 / Open
            Banking en lecture seule).
          </p>

          {/* Summary Pillars */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <Landmark className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Lecture seule DSP2
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Aucune initiation de paiement ni accès à vos mots de passe
                bancaires.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <Scale className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Aide à la décision uniquement
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Les projections et simulateurs sont informatifs et ne
                constituent pas un conseil financier.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Propriété intégrale
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Vous restez seul propriétaire de vos données, révocables et
                supprimables à tout moment.
              </p>
            </div>
          </div>
        </div>

        {/* Body + TOC */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <nav
              aria-label="Sommaire des CGU"
              className="sticky top-20 rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#121215]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Sommaire
              </p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-md px-2 py-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-violet-400"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600 sm:p-8 lg:col-span-3 dark:border-zinc-800 dark:bg-[#121215] dark:text-zinc-300">
            <section id="objet" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                1. Objet et champ d&apos;application
              </h2>
              <p>
                Les présentes Conditions Générales d&apos;Utilisation (« CGU »)
                encadrent l&apos;accès et l&apos;utilisation de l&apos;application web{" "}
                <strong>Mimo Finance</strong>, dédiée au suivi budgétaire
                personnel et de foyer, à la planification de projets, au suivi
                d&apos;objectifs d&apos;épargne et à la projection de trésorerie.
              </p>
              <p>
                L&apos;accès au service implique l&apos;acceptation pleine et entière des
                présentes CGU ainsi que de la{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-violet-600 underline hover:opacity-80 dark:text-violet-400"
                >
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            <section id="service" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                2. Description des fonctionnalités
              </h2>
              <p>Mimo Finance met à disposition des utilisateurs :</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  La gestion multi-comptes (comptes courants, livrets,
                  investissements, espèces) et le suivi consolidé du patrimoine
                  net ;
                </li>
                <li>
                  Une timeline chronologique (vue liste groupée par jour et vue
                  calendrier) incluant le solde prévisionnel en fin de journée,
                  les opérations récurrentes et la validation manuelle ou
                  automatique ;
                </li>
                <li>
                  Des outils de planification : simulations de projets
                  (« What-If »), objectifs d&apos;épargne, simulateur d&apos;achat et
                  projections de trésorerie jusqu&apos;à 5 ans ;
                </li>
                <li>
                  Un mode foyer partagé (« Mode Couple ») permettant de
                  distinguer les opérations personnelles et communes ;
                </li>
                <li>
                  Une option facultative d&apos;agrégation bancaire en lecture seule
                  conforme à la directive européenne DSP2 (PSD2).
                </li>
              </ul>
            </section>

            <section id="open-banking" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                3. Connexion bancaire Open Banking (DSP2 / PSD2)
              </h2>
              <p>
                Lorsque vous activez volontairement la synchronisation
                bancaire, la connexion à votre établissement bancaire est opérée
                via un prestataire d&apos;agrégation agréé au titre de la directive
                européenne DSP2 (notamment <strong>Enable Banking Oy</strong>,
                prestataire d&apos;information sur les comptes — AISP).
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong>Accès strictement en lecture seule :</strong> Mimo
                    Finance consulte uniquement vos soldes et vos opérations
                    comptabilisées. L&apos;application ne peut jamais initier de
                    virement, modifier un plafond ou effectuer une opération
                    bancaire.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong>Aucun mot de passe bancaire stocké :</strong>{" "}
                    l&apos;authentification forte (SCA / biométrie) s&apos;effectue
                    directement auprès de votre banque. Seul un jeton de session
                    technique à durée limitée est conservé.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong>Consentement limité et révocable :</strong> votre
                    autorisation est valable pour une durée maximale de 90 à 180
                    jours selon votre banque. Vous pouvez révoquer la connexion
                    à tout moment en un clic depuis la page <em>Comptes</em> ou
                    directement depuis votre espace bancaire.
                  </span>
                </li>
              </ul>
            </section>

            <section id="compte" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                4. Compte utilisateur & Mode Couple
              </h2>
              <p>
                Vous êtes responsable de la confidentialité de vos identifiants
                Mimo Finance et de toute activité réalisée depuis votre session.
                En cas d&apos;utilisation du <strong>Mode Couple</strong>, vous
                reconnaissez partager volontairement avec votre partenaire
                invité les comptes, opérations et projets rattachés au foyer
                commun. Chaque membre peut dissoudre le foyer commun à tout
                moment depuis <em>Paramètres → Foyer & Mode Couple</em>.
              </p>
            </section>

            <section id="conseil" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                5. Absence de conseil financier, fiscal ou en investissement
              </h2>
              <p>
                Mimo Finance est un outil technique de visualisation et
                d&apos;organisation budgétaire personnelle. Les indicateurs (reste à
                vivre, projections à 6 mois ou 5 ans, simulations What-If,
                rapprochements automatiques) sont calculés à partir des données
                que vous saisissez ou synchronisez et ont une{" "}
                <strong>valeur strictement indicative</strong>.
              </p>
              <p>
                Ils ne constituent en aucun cas un conseil en investissement,
                un conseil juridique, fiscal ou bancaire, ni une garantie
                d&apos;absence de découvert. Seul le relevé officiel émis par votre
                établissement bancaire fait foi.
              </p>
            </section>

            <section id="propriete" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                6. Propriété des données & propriété intellectuelle
              </h2>
              <p>
                Vous conservez l&apos;entière propriété de toutes les données
                financières, libellés, notes et justificatifs enregistrés dans
                votre espace. Le code source, l&apos;interface, les éléments
                graphiques et la marque <strong>Mimo Finance</strong> demeurent
                protégés au titre de la propriété intellectuelle.
              </p>
            </section>

            <section id="securite" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                7. Disponibilité, sécurité & limitation de responsabilité
              </h2>
              <p>
                Mimo Finance met en œuvre les bonnes pratiques de sécurité
                applicative (chiffrement TLS en transit, hachage sécurisé des
                mots de passe, cookies de session{" "}
                <code className="font-mono text-xs">HttpOnly</code>, cloisonnement
                strict des données par foyer). Toutefois, le service est fourni
                « en l&apos;état », sans garantie d&apos;absence totale d&apos;interruption,
                notamment en cas de maintenance ou d&apos;indisponibilité des API
                des établissements bancaires tiers.
              </p>
            </section>

            <section id="resiliation" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                8. Suspension, suppression et réversibilité
              </h2>
              <p>
                Vous pouvez à tout moment exporter vos rapports PDF, révoquer
                vos connexions bancaires ou demander la suppression intégrale de
                votre compte et des données associées. La déconnexion d&apos;une
                banque stoppe immédiatement toute nouvelle synchronisation tout
                en préservant votre historique local sauf suppression explicite
                de votre part.
              </p>
            </section>

            <section id="droit" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                9. Évolutions & droit applicable
              </h2>
              <p>
                Les présentes CGU peuvent évoluer pour refléter de nouvelles
                fonctionnalités ou exigences réglementaires (notamment DSP2 et
                RGPD). La date de dernière mise à jour figure en haut de cette
                page. Les présentes CGU sont régies par le droit français et le
                droit de l&apos;Union européenne.
              </p>
            </section>
          </article>
        </div>

        {/* Footer */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Mimo Finance — Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Politique de confidentialité
            </Link>
            <Link href="/login" className="hover:underline">
              Se connecter
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
