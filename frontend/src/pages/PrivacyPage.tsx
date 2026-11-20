import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Database, Eye, Trash2, Mail } from 'lucide-react';

export function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Conformité RGPD & Vie Privée
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Politique de Confidentialité
          </h1>
          <p className="text-slate-400 text-sm">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-3 text-slate-300 text-sm sm:text-base leading-relaxed">
          <p>
            Chez <strong>Mimo Finance</strong>, la confidentialité et la sécurité de vos données financières et personnelles constituent notre priorité absolue. Nous appliquons rigoureusement les principes du <strong>Règlement Général sur la Protection des Données (RGPD)</strong> de l'Union Européenne.
          </p>
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 text-sm flex items-start gap-3">
            <Lock className="w-5 h-5 shrink-0 text-purple-400 mt-0.5" />
            <span>
              <strong>Engagement ferme :</strong> Nous ne vendons, ne louons et ne transmettons JAMAIS vos données financières ou personnelles à des tiers, des courtiers de données ou des régies publicitaires.
            </span>
          </div>
        </section>

        {/* 1. Données collectées */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            1. Données collectées
          </h2>
          <div className="grid gap-3 text-sm text-slate-300">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <strong className="text-white block mb-1">Informations de compte</strong>
              Adresse email, prénom, nom, avatar de profil, mot de passe (stocké de façon irréversible sous forme d'empreinte chiffrée Bcrypt).
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <strong className="text-white block mb-1">Données financières déclaratives</strong>
              Comptes financiers créés, montants de soldes, transactions ponctuelles et récurrentes, catégories, objectifs d'épargne et projets.
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <strong className="text-white block mb-1">Données techniques et de sécurité</strong>
              Journaux d'accès réseau, horodatage des connexions, jetons de session d'authentification sécurisés (JWT protégés en cookies HttpOnly).
            </div>
          </div>
        </section>

        {/* 2. Finalités du traitement */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            2. Pourquoi traitons-nous vos données ?
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
            <li>Calculer vos projections financières futures et votre reste à vivre (Safe-to-Spend) au jour le jour.</li>
            <li>Permettre la synchronisation de budget en couple ou en foyer si vous invitez un partenaire.</li>
            <li>Assurer la sécurité de votre compte, prévenir les attaques par force brute et les accès frauduleux.</li>
            <li>Générer vos rapports et exports financiers (PDF, tableurs) à votre demande expresse.</li>
          </ul>
        </section>

        {/* 3. Sécurité et Chiffrement */}
        <section className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            3. Sécurité et conservation des données
          </h2>
          <p>
            Vos données sont hébergées sur une infrastructure infonuagique hautement sécurisée (Google Cloud Platform, région Europe-West / Belgique et France), répondant aux normes ISO/IEC 27001, SOC 1, 2, 3 et aux exigences de souveraineté des données européennes.
          </p>
          <p>
            Toutes les communications entre votre appareil et nos serveurs sont protégées par le protocole de chiffrement <strong>TLS 1.3 / HTTPS</strong> avec redirection stricte (HSTS). Les mots de passe sont hachés avec la méthode de pointe <strong>Bcrypt (12 tours)</strong>.
          </p>
        </section>

        {/* 4. Vos droits RGPD */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            4. Vos droits sur vos données
          </h2>
          <p className="text-sm text-slate-300">
            Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants, exerçables à tout moment depuis votre interface ou par simple contact :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
            <li><strong>Droit d'accès et d'export :</strong> Vous pouvez exporter toutes vos données financières à tout instant.</li>
            <li><strong>Droit de rectification :</strong> Modification immédiate de vos données de profil et transactions.</li>
            <li><strong>Droit à l'effacement (« Droit à l'oubli ») :</strong> Vous disposez d'un système de Corbeille avec suppression définitive irréversible. Vous pouvez également demander la suppression intégrale de votre compte et de toutes les données associées.</li>
          </ul>
        </section>

        {/* 5. Contact */}
        <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            Contact Délégué à la Protection des Données (DPO)
          </h2>
          <p className="text-sm text-slate-300">
            Pour toute question relative à vos données personnelles ou pour exercer vos droits, contactez-nous directement par email :
          </p>
          <a href="mailto:privacy@mimofinance.com" className="inline-block text-purple-400 hover:text-purple-300 font-medium text-sm">
            privacy@mimofinance.com
          </a>
        </section>
      </main>
    </div>
  );
}

export default PrivacyPage;
