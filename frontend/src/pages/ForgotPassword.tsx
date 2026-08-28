import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Eye, EyeOff, CheckCircle2, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

export function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<'request' | 'verify' | 'new_password' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const passwordStrength = () => {
    if (!newPassword) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    if (strength <= 1) return { strength, label: 'Faible', color: 'bg-destructive' };
    if (strength === 2) return { strength, label: 'Moyen', color: 'bg-amber-500' };
    if (strength === 3) return { strength, label: 'Bon', color: 'bg-emerald-500' };
    return { strength, label: 'Excellent', color: 'bg-emerald-500' };
  };

  // Etape 1 : Demande d'envoi du code
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Veuillez renseigner votre adresse email');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(cleanEmail);
      setStep('verify');
      setResendCooldown(45);
      toast.success('Code de vérification envoyé à votre adresse email !');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setResendCooldown(45);
      toast.success('Un nouveau code à 6 chiffres vous a été envoyé !');
    } catch (err: any) {
      toast.error('Impossible de renvoyer le code');
    } finally {
      setIsLoading(false);
    }
  };

  // Etape 2 : Validation du code uniquement
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Veuillez saisir le code complet à 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyResetCode(email.trim(), cleanCode);
      setStep('new_password');
      toast.success('Code validé avec succès ! Définissez maintenant votre nouveau mot de passe.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Code invalide ou expiré');
    } finally {
      setIsLoading(false);
    }
  };

  // Etape 3 : Enregistrement du nouveau mot de passe
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez renseigner votre nouveau mot de passe');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), newPassword);
      setStep('success');
      toast.success('Mot de passe mis à jour avec succès !');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = passwordStrength();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      {/* Bouton retour vers la page de connexion */}
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200 backdrop-blur-sm transition-all hover:scale-105"
      >
        <ArrowLeft className="w-4 h-4 text-slate-600" />
        <span>Retour à la connexion</span>
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden shadow-sm">
            <img src="/mimo-logo.jpg" alt="Mimo Finance" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {step === 'success'
              ? 'Mot de passe sécurisé'
              : step === 'new_password'
              ? 'Nouveau mot de passe'
              : step === 'verify'
              ? 'Validation du code'
              : 'Mot de passe oublié'}
          </h1>
          <p className="text-slate-500 text-sm">
            {step === 'request' && 'Étape 1/3 : Saisissez votre email pour recevoir le code de sécurité.'}
            {step === 'verify' && `Étape 2/3 : Entrez le code à 6 chiffres envoyé à ${email}.`}
            {step === 'new_password' && 'Étape 3/3 : Choisissez votre nouveau mot de passe sécurisé.'}
            {step === 'success' && 'Votre compte est prêt avec votre nouveau mot de passe.'}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          {/* ETAPE 1 : Demande de code par email */}
          {step === 'request' && (
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    required
                    className="pl-10"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoading}>
                {isLoading ? 'Envoi du code...' : 'Recevoir le code de sécurité'}
              </Button>
            </form>
          )}

          {/* ETAPE 2 : Vérification du code à 6 chiffres SEUL */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="truncate max-w-[200px] font-medium">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Changer
                </button>
              </div>

              <div className="space-y-2 text-center">
                <Label htmlFor="code" className="text-sm font-semibold text-slate-800">
                  Code de sécurité à 6 chiffres
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  autoFocus
                  required
                  className="text-center font-mono text-2xl font-bold tracking-[0.4em] py-5 rounded-xl border-slate-300"
                />
              </div>

              <Button type="submit" className="w-full mt-3" size="lg" disabled={isLoading || code.length !== 6}>
                {isLoading ? 'Vérification en cours...' : 'Vérifier le code →'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-primary hover:underline'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0
                      ? `Renvoyer un nouveau code (${resendCooldown}s)`
                      : 'Renvoyer un code par email'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ETAPE 3 : Définition du nouveau mot de passe */}
          {step === 'new_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Force : {strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.strength / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full mt-3" size="lg" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
              </Button>
            </form>
          )}

          {/* ETAPE 4 : Succès */}
          {step === 'success' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-600">
                Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter à votre compte Mimo Finance.
              </p>
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              Vous vous souvenez de votre mot de passe ? Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
