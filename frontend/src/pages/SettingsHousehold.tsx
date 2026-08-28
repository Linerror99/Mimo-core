import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home, UserPlus, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import householdService from '@/services/householdService'
import apiClient from '@/services/api'
import type { Household, HouseholdMember } from '@/services/householdService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const getAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_BASE_URL}${avatarUrl}`;
}

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface SettingsHouseholdProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function SettingsHousehold({ navigate, onLogout }: SettingsHouseholdProps) {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isDissolving, setIsDissolving] = useState(false)

  // Charger les données du household au montage
  useEffect(() => {
    loadHouseholdData()
  }, [])

  const loadHouseholdData = async () => {
    setIsLoading(true)
    try {
      // Récupérer d'abord l'utilisateur courant pour avoir son ID
      const userResponse = await apiClient.get('/users/me')
      const currentUser = userResponse.data
      setCurrentUserId(currentUser.id)
      
      // Récupérer le household et ses membres
      const data = await householdService.getCurrentHousehold()
      setHousehold(data.household)
      setMembers(data.members)
    } catch (error) {
      console.error('Failed to load household data:', error)
      toast.error('Erreur de chargement des données du foyer')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Invitation envoyée à ${inviteEmail}`)
    setInviteEmail('')
  }

  const handleDissolve = async () => {
    if (!household) {
      toast.error('Aucun foyer à dissoudre')
      return
    }

    setIsDissolving(true)
    try {
      const result = await householdService.dissolveHousehold(household.id)
      
      toast.success('Foyer dissous avec succès', {
        description: `Vous avez maintenant un compte individuel. Balance initiale: ${result.new_households[0].initial_balance.toFixed(2)}€`,
      })
      
      // TODO: Refresh user context to update household status
      // For now, we could navigate to dashboard or reload
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error('Failed to dissolve household:', error)
      toast.error('Échec de la dissolution', {
        description: error.response?.data?.detail || 'Une erreur est survenue lors de la dissolution du foyer',
      })
    } finally {
      setIsDissolving(false)
    }
  }

  return (
    <Layout currentPage="settings-household" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Paramètres du Foyer</h1>
          <p className="text-muted-foreground">Gérez votre foyer et vos partenaires</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : household && household.type === 'couple' ? (
          <>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{household.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Créé le {new Date(household.created_at).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Membres</h3>
                  <div className="space-y-2">
                    {members.length > 0 ? (
                      members.map((member) => {
                        const isCurrentUser = member.id === currentUserId
                        const initials = `${member.first_name[0]}${member.last_name[0]}`.toUpperCase()
                        
                        return (
                          <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                            <Avatar className="w-10 h-10">
                              {member.avatar_url && <AvatarImage src={getAvatarUrl(member.avatar_url)} alt={`${member.first_name} ${member.last_name}`} />}
                              <AvatarFallback className={isCurrentUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            {isCurrentUser && (
                              <div className="ml-auto">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Vous</span>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">Chargement des membres...</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-destructive/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Zone de Danger</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    La dissolution du foyer est irréversible. Les transactions communes seront conservées mais ne
                    pourront plus être modifiées.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDissolving}>
                        {isDissolving ? 'Dissolution en cours...' : 'Dissoudre le foyer'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Cela dissoudra votre foyer et séparera toutes les finances
                          communes. Les deux partenaires pourront continuer à utiliser Mimo Finance de manière
                          indépendante.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDissolving}>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDissolve} 
                          disabled={isDissolving}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {isDissolving ? 'Dissolution en cours...' : 'Oui, dissoudre le foyer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-6">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <UserPlus className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Créer un Foyer</h2>
                <p className="text-muted-foreground mb-6">
                  Invitez votre partenaire pour gérer vos finances ensemble
                </p>
                <form onSubmit={handleInvite} className="max-w-md mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email du partenaire</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="partenaire@exemple.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Envoyer l'invitation
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
