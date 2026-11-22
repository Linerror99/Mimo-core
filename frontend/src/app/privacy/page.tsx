import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  EyeOff,
  Lock,
  Server,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Mimo Finance",
  description:
    "Politique de confidentialité et protection des données personnelles (RGPD & DSP2) de Mimo Finance.",
};

const LAST_UPDATED = "22 novembre 2026";

const SECTIONS = [
  { id: "engagement", label: "1. Notre engagement vie privée" },
  { id: "donnees", label: "2. Données collectées" },
  { id: "finalites", label: "3. Finalités et bases légales (RGPD)" },
  { id: "open-banking", label: "4. Traitement Open Banking (DSP2)" },
  { id: "hebergement", label: "5. Hébergement, sécurité & sous-traitants" },
  { id: "cookies", label: "6. Cookies & sessions" },
  { id: "conservation", label: "7. Durée de conservation" },
  { id: "droits", label: "8. Vos droits RGPD" },
  { id: "contact", label: "9. Contact & réclamations" },
];

export default function PrivacyPage() {
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
              href="/terms"
              className="text-slate-500 transition-colors hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
            >
              Conditions d&apos;utilisation
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Conformité RGPD & DSP2 (PSD2)
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-zinc-50">
            Politique de confidentialité
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-zinc-400">
            Dernière mise à jour :{" "}
            <strong className="font-medium text-slate-800 dark:text-zinc-200">
              {LAST_UPDATED}
            </strong>{" "}
            · Nous protégeons vos données financières avec la plus stricte
            sobriété et transparence.
          </p>

          {/* Privacy Pillars */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <EyeOff className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Zéro revente de données
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Aucune publicité, aucun courtier de données, aucun tracking tiers.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Zéro mot de passe bancaire
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Synchronisation DSP2 en lecture seule via jeton révocable.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <Server className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Hébergement en Europe
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Infrastructure Google Cloud située en Union européenne
                (europe-west1).
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <Database className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-zinc-100">
                Contrôle total
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Déconnexion bancaire, export et suppression immédiats sur demande.
              </p>
            </div>
          </div>
        </div>

        {/* Body + TOC */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <nav
              aria-label="Sommaire de la politique de confidentialité"
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
            <section id="engagement" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                1. Notre engagement vie privée
              </h2>
              <p>
                La présente Politique de confidentialité décrit de manière claire
                comment <strong>Mimo Finance</strong> collecte, utilise, protège
                et conserve vos données personnelles conformément au Règlement
                Général sur la Protection des Données (<strong>RGPD</strong> —
                Règlement UE 2016/679) et à la directive européenne sur les
                services de paiement (<strong>DSP2</strong>).
              </p>
              <p>
                <strong>Principe fondamental :</strong> vos données financières
                ne sont jamais vendues, louées, profilées à des fins
                commerciales ni partagées avec des régies publicitaires.
              </p>
            </section>

            <section id="donnees" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                2. Catégories de données collectées
              </h2>
              <p>
                Nous collectons strictement les données nécessaires au
                fonctionnement de votre espace budgétaire (principe de
                minimisation) :
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Données d&apos;identité & compte :</strong> prénom, nom,
                  adresse e-mail, mot de passe chiffré (hachage{" "}
                  <code className="font-mono text-xs">bcrypt</code> 12 tours),
                  avatar optionnel ;
                </li>
                <li>
                  <strong>Données budgétaires saisies :</strong> comptes,
                  soldes, catégories, transactions, récurrences, projets
                  What-If, objectifs d&apos;épargne et justificatifs déposés ;
                </li>
                <li>
                  <strong>Données Open Banking (uniquement sur consentement explicite) :</strong>{" "}
                  identifiant technique de session bancaire, nom de
                  l&apos;établissement, IBAN masqué (ex.{" "}
                  <code className="font-mono text-xs">FR76 •••• 1234</code>),
                  soldes et écritures comptabilisées (date, montant, libellé,
                  référence immuable anti-doublon) ;
                </li>
                <li>
                  <strong>Journaux techniques de sécurité :</strong> adresse IP
                  horodatée et statut des requêtes API pour prévenir les abus et
                  assurer l&apos;intégrité du service.
                </li>
              </ul>
            </section>

            <section id="finalites" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                3. Finalités et bases légales (Article 6 du RGPD)
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                      <th className="px-3.5 py-2.5">Finalité</th>
                      <th className="px-3.5 py-2.5">Base légale RGPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    <tr>
                      <td className="px-3.5 py-2.5">
                        Gestion du compte, tableaux de bord, timeline, projets
                        et projections
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-zinc-200">
                        Exécution du service (Art. 6.1.b)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5">
                        Synchronisation bancaire Open Banking DSP2 (lecture
                        seule)
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-zinc-200">
                        Consentement explicite (Art. 6.1.a)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3.5 py-2.5">
                        Sécurisation des sessions, lutte contre les accès non
                        autorisés
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-zinc-200">
                        Intérêt légitime (Art. 6.1.f)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="open-banking" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                4. Traitement spécifique Open Banking (DSP2)
              </h2>
              <p>
                Pour la synchronisation bancaire, Mimo Finance s&apos;appuie sur{" "}
                <strong>Enable Banking Oy</strong> (établissement agréé AISP en
                Union européenne). Les échanges avec Enable Banking sont signés
                cryptographiquement par clé asymétrique{" "}
                <code className="font-mono text-xs">RSA / JWT RS256</code> sur
                canal chiffré HTTPS/TLS.
              </p>
              <p>
                Les données bancaires importées sont strictement isolées au sein
                de votre foyer, ne sont jamais transmises à un autre utilisateur
                (hors partenaire explicitement accepté en Mode Couple) et
                l&apos;IBAN complet n&apos;est pas conservé en clair dans votre interface
                (seule une forme masquée est stockée).
              </p>
            </section>

            <section id="hebergement" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                5. Hébergement, sécurité & sous-traitants
              </h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Hébergement applicatif & base de données :</strong>{" "}
                  Google Cloud Platform, région{" "}
                  <strong>europe-west1 (Belgique, UE)</strong> — chiffrement au
                  repos et en transit (TLS 1.2/1.3).
                </li>
                <li>
                  <strong>Agrégation bancaire DSP2 (optionnelle) :</strong>{" "}
                  Enable Banking Oy (Finlande, UE) — uniquement si vous
                  connectez un compte bancaire.
                </li>
                <li>
                  <strong>Mesures techniques :</strong> mots de passe hachés
                  bcrypt, authentification JWT à durée courte, jetons de
                  rafraîchissement en cookie{" "}
                  <code className="font-mono text-xs">HttpOnly</code> avec
                  liste noire Redis à la déconnexion, accès aux justificatifs
                  protégé par authentification.
                </li>
              </ul>
            </section>

            <section id="cookies" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                6. Cookies et traceurs
              </h2>
              <p>
                Mimo Finance utilise exclusivement des{" "}
                <strong>cookies strictement nécessaires</strong> au
                fonctionnement technique de l&apos;authentification et de la
                navigation :
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <code className="font-mono text-xs">refresh_token</code>{" "}
                  (cookie <code className="font-mono text-xs">HttpOnly</code>,{" "}
                  <code className="font-mono text-xs">Secure</code>) : maintien
                  sécurisé de votre session sans exposer le jeton au JavaScript ;
                </li>
                <li>
                  <code className="font-mono text-xs">mimo_session</code> :
                  indicateur technique non sensible de session active pour la
                  redirection des pages protégées.
                </li>
              </ul>
              <p>
                <strong>Aucun cookie publicitaire, social ou analytique tiers</strong>{" "}
                n&apos;est déposé sur votre navigateur.
              </p>
            </section>

            <section id="conservation" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                7. Durée de conservation
              </h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Données du compte et historique budgétaire :</strong>{" "}
                  conservés tant que votre compte est actif, et supprimés dans
                  un délai maximal de 30 jours après clôture définitive ;
                </li>
                <li>
                  <strong>Connexions Open Banking :</strong> jeton de session
                  supprimé immédiatement dès que vous cliquez sur{" "}
                  <em>Déconnecter</em> dans la page <em>Comptes</em> (ou
                  automatiquement expiré à la fin du consentement de 90 à 180
                  jours) ;
                </li>
                <li>
                  <strong>Corbeille :</strong> les opérations supprimées
                  restent restaurables jusqu&apos;à purge manuelle de la corbeille.
                </li>
              </ul>
            </section>

            <section id="droits" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                8. Vos droits (RGPD)
              </h2>
              <p>
                Conformément au RGPD, vous disposez à tout moment des droits
                suivants sur vos données personnelles :
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Droit d&apos;accès et de rectification :</strong>{" "}
                  consultez et modifiez vos informations directement depuis{" "}
                  <em>Paramètres</em> ;
                </li>
                <li>
                  <strong>Droit de retrait du consentement :</strong> révoquez
                  à tout moment l&apos;accès Open Banking depuis <em>Comptes</em> ;
                </li>
                <li>
                  <strong>Droit à l&apos;effacement (« droit à l&apos;oubli ») :</strong>{" "}
                  demandez la suppression complète de votre compte et de vos
                  données ;
                </li>
                <li>
                  <strong>Droit à la portabilité et à la limitation :</strong>{" "}
                  exportez vos données et rapports depuis l&apos;application.
                </li>
              </ul>
            </section>

            <section id="contact" className="scroll-mt-20 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
                9. Contact & réclamations
              </h2>
              <p>
                Pour exercer vos droits RGPD ou pour toute question relative à
                la sécurité et à la protection de vos données, vous pouvez
                contacter l&apos;administrateur de Mimo Finance à l&apos;adresse{" "}
                <a
                  href="mailto:privacy@mimofinance.com"
                  className="font-medium text-violet-600 underline hover:opacity-80 dark:text-violet-400"
                >
                  privacy@mimofinance.com
                </a>
                .
              </p>
              <p>
                Si vous estimez, après nous avoir contactés, que vos droits ne
                sont pas respectés, vous disposez également du droit d&apos;introduire
                une réclamation auprès de la{" "}
                <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique et
                des Libertés — cnil.fr).
              </p>
            </section>
          </article>
        </div>

        {/* Footer */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Mimo Finance — Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Conditions d&apos;utilisation
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
