import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, UserCheck, AlertTriangle } from 'lucide-react';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/mimo-logo.jpg" alt="Logo Mimo Finance" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Mimo Finance
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileText className="w-3.5 h-3.5" /> Conditions Légales
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Conditions Générales d'Utilisation (CGU)
          </h1>
          <p className="text-slate-400 text-sm">
            En vigueur au : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* 1. Objet et acceptation */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            1. Objet et champ d'application
          </h2>
          <p>
            Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation des services de l'application <strong>Mimo Finance</strong>. Toute inscription et toute utilisation de la plateforme implique l'acceptation sans réserve des présentes conditions par l'utilisateur.
          </p>
        </section>

        {/* 2. Nature du service & Avertissement financier */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            2. Avertissement légal : Outil d'aide à la décision
          </h2>
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-sm space-y-2">
            <p>
              <strong>Important :</strong> Mimo Finance est un logiciel d'organisation budgétaire, de suivi de dépenses et de projection prévisionnelle purement déclaratif et automatisé.
            </p>
            <p>
              Mimo Finance ne constitue <strong>en aucun cas un service de conseil en investissement financier</strong> (CIF), de gestion de patrimoine agréée ou d'établissement de crédit au sens du Code monétaire et financier. Les projections financières et le calcul du "Safe-to-Spend" sont fournis à titre indicatif sur la base des données saisies par l'utilisateur.
            </p>
          </div>
        </section>

        {/* 3. Inscription et responsabilité du compte */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            3. Compte utilisateur et sécurité
          </h2>
          <p>
            L'utilisateur est seul responsable de la confidentialité de ses identifiants de connexion (email et mot de passe). Toute opération réalisée depuis son compte est présumée effectuée par lui. En cas de suspicion de compromission, l'utilisateur doit réinitialiser immédiatement son mot de passe depuis l'interface dédiée.
          </p>
        </section>

        {/* 4. Disponibilité du service */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            4. Disponibilité et maintenance
          </h2>
          <p>
            Nous nous efforçons d'assurer une disponibilité 24/7 de Mimo Finance. Toutefois, l'accès au service peut être momentanément suspendu ou restreint pour des raisons de maintenance, de mise à jour ou d'améliorations de sécurité, sans que notre responsabilité ne puisse être engagée.
          </p>
        </section>

        {/* 5. Propriété intellectuelle */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            5. Propriété intellectuelle
          </h2>
          <p>
            L'ensemble des marques, logos, visuels, algorithmes de projection financière, chartes graphiques et codes sources de Mimo Finance sont la propriété exclusive de leurs auteurs respectifs et protégés par le droit de la propriété intellectuelle.
          </p>
        </section>

        {/* 6. Contact */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500">
          Pour toute réclamation ou question juridique : <a href="mailto:contact@mimofinance.com" className="text-purple-400 underline">contact@mimofinance.com</a>
        </div>
      </main>
    </div>
  );
}

export default TermsPage;
