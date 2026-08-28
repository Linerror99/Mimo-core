import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
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
  const [scrollY, setScrollY] = useState(0)
  const featuresRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('.scroll-reveal')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

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
    { value: '100%', label: 'Sécurisé' }
  ]

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 transition-all">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/mimo-logo.jpg" alt="Mimo Finance" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
              <span className="text-xl font-bold text-foreground">Mimo Finance</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex hover:scale-105 transition-transform"
              >
                Se connecter
              </Button>
              <Button 
                onClick={() => navigate('/register')}
                className="group hover:scale-105 transition-transform"
              >
                S'inscrire
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        >
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse animation-delay-200" />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse animation-delay-100" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo Hero */}
            <div className="mb-8 animate-fade-in">
              <div className="inline-block relative">
                <img 
                  src="/mimo-logo.jpg" 
                  alt="Mimo Finance" 
                  className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shadow-2xl hover:scale-110 transition-transform duration-500"
                  style={{
                    transform: `translateY(${scrollY * -0.1}px)`,
                  }}
                />
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-2xl -z-10 animate-pulse" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-fade-in backdrop-blur-sm">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Nouvelle génération de gestion financière</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in-up leading-tight">
              Prenez le contrôle de vos{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient">
                finances personnelles
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-100 leading-relaxed">
              Mimo Finance vous aide à gérer votre budget, suivre vos dépenses et atteindre vos objectifs financiers en toute simplicité.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-200">
              <Button 
                size="lg" 
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto group text-lg px-10 py-6 hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto text-lg px-10 py-6 hover:scale-105 transition-all backdrop-blur-sm"
              >
                Se connecter
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-300">
              {stats.map((stat, index) => (
                <div key={index} className="text-center backdrop-blur-sm bg-card/50 rounded-2xl p-6 hover:scale-105 transition-transform">
                  <div className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary rounded-full p-1">
            <div className="w-1 h-3 bg-primary rounded-full mx-auto animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="relative py-32 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 scroll-reveal opacity-0 translate-y-20 transition-all duration-700">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Des fonctionnalités puissantes pour une gestion financière complète et simplifiée
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="scroll-reveal opacity-0 translate-y-20 transition-all duration-700 bg-card rounded-2xl p-8 border border-border hover:border-primary/50 hover:shadow-2xl group cursor-pointer hover:scale-105"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="container mx-auto px-4 py-32">
        <div className="max-w-5xl mx-auto scroll-reveal opacity-0 scale-95 transition-all duration-700">
          <div className="relative bg-gradient-to-br from-primary via-primary to-accent rounded-3xl p-12 lg:p-20 text-center overflow-hidden shadow-2xl">
            {/* Animated background */}
            <div className="absolute inset-0 bg-grid-white/10" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse animation-delay-200" />
            
            <div className="relative z-10">
              <div className="mb-8">
                <img 
                  src="/mimo-logo.jpg" 
                  alt="Mimo Finance" 
                  className="w-24 h-24 rounded-2xl object-cover shadow-2xl mx-auto hover:scale-110 transition-transform"
                />
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                Prêt à transformer votre vie financière ?
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                Rejoignez Mimo Finance dès aujourd'hui et commencez à gérer vos finances comme un pro.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto group text-lg px-10 py-6 hover:scale-105 transition-all shadow-xl"
                >
                  Créer mon compte
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 text-lg px-10 py-6 backdrop-blur-sm hover:scale-105 transition-all"
                >
                  J'ai déjà un compte
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/mimo-logo.jpg" alt="Mimo Finance" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-sm text-muted-foreground">
              © 2025 Mimo Finance. Tous droits réservés.
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Confidentialité
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Conditions
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
