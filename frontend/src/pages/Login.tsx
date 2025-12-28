import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export function Login() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    
    try {
      await login(email, password)
      toast.success('Connexion réussie !')
      navigate('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden">
            <img src="/mimo-logo.jpg" alt="Mimo Finance" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Bon retour !</h1>
          <p className="text-muted-foreground">Connectez-vous à votre compte Mimo Finance</p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-lg border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-foreground cursor-pointer">
                  Se souvenir de moi
                </label>
              </div>
              <button type="button" className="text-sm text-primary hover:underline">
                Mot de passe oublié ?
              </button>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">OU</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-6"
            onClick={() => navigate('/register')}
          >
            Créer un compte
          </Button>
        </div>
      </div>
    </div>
  )
}
