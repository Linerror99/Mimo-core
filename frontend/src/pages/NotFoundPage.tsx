import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleGoHome = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 animate-fade-in">
        {/* Logo and Error Badge */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img 
              src="/mimo-logo.jpg" 
              alt="Logo Mimo Finance" 
              className="w-20 h-20 rounded-2xl object-cover shadow-2xl border border-purple-500/30"
            />
            <div className="absolute -bottom-2 -right-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 p-1.5 rounded-full backdrop-blur-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Erreur 404
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
            Page introuvable
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            La page que vous cherchez n'existe pas, a été déplacée ou son URL a changé. Pas d'inquiétude, vos finances sont bien en sécurité !
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            {isAuthenticated ? "Retour au Dashboard" : "Retour à l'accueil"}
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Page précédente
          </button>
        </div>

        {/* Brand footer */}
        <div className="pt-8 text-xs text-slate-600">
          Mimo Finance &copy; {new Date().getFullYear()} &mdash; Tous droits réservés.
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
