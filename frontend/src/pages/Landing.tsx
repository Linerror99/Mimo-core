import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  TrendingUp, 
  PiggyBank, 
  Target, 
  CalendarClock,
  Users,
  Shield,
  Sparkles,
  ChevronRight
} from 'lucide-react'

export function Landing() {
  const navigate = useNavigate()

  const features = [
    {
      icon: TrendingUp,
      title: 'Suivi en temps réel',
      description: 'Visualisez vos finances instantanément avec des graphiques intuitifs'
    },
    {
      icon: PiggyBank,
      title: 'Gestion des comptes',
      description: 'Centralisez tous vos comptes bancaires en un seul endroit'
    },
    {
      icon: Target,
      title: 'Objectifs financiers',
      description: 'Définissez et atteignez vos objectifs d\'épargne facilement'
    },
    {
      icon: CalendarClock,
      title: 'Transactions récurrentes',
      description: 'Automatisez vos revenus et dépenses régulières'
    },
    {
      icon: Users,
      title: 'Gestion familiale',
      description: 'Gérez les finances de votre foyer en mode solo, individuel ou couple'
    },
    {
      icon: Shield,
      title: 'Sécurité maximale',
      description: 'Vos données sont protégées avec un chiffrement de bout en bout'
    }
  ]

  const stats = [
    { value: '100%', label: 'Gratuit' },
    { value: '24/7', label: 'Disponible' },
    { value: '🔒', label: 'Sécurisé' }
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl">
              <span className="text-xl font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-xl font-bold text-foreground">Mimo Finance</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex"
            >
              Se connecter
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              className="group"
            >
              S'inscrire
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Nouvelle génération de gestion financière</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in-up">
            Prenez le contrôle de vos{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              finances personnelles
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-100">
            Mimo Finance vous aide à gérer votre budget, suivre vos dépenses et atteindre vos objectifs financiers en toute simplicité.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-200">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto group text-lg px-8"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-lg px-8"
            >
              Se connecter
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20 animate-fade-in-up animation-delay-300">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-secondary/20 -mx-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Des fonctionnalités puissantes pour une gestion financière complète et simplifiée
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-10 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_70%)]" />
            
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                Prêt à transformer votre vie financière ?
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                Rejoignez Mimo Finance dès aujourd'hui et commencez à gérer vos finances comme un pro.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto group text-lg px-8"
                >
                  Créer mon compte
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 text-lg px-8"
                >
                  J'ai déjà un compte
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2025 Mimo Finance. Tous droits réservés.
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Confidentialité
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Conditions
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
