import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

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

interface SettingsProfileProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function SettingsProfile({ navigate, onLogout }: SettingsProfileProps) {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore()
  const routerNavigate = useNavigate()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name)
      setLastName(user.last_name)
      setEmail(user.email)
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile(firstName, lastName)
      toast.success('Profil mis à jour avec succès')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Mot de passe modifié avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe'
      toast.error(errorMessage)
    }
  }

  return (
    <Layout currentPage="settings-profile" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Paramètres du Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Photo de Profil</h2>
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">A</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline">Changer la photo</Button>
              <Button variant="ghost" className="text-destructive ml-2">
                Supprimer
              </Button>
              <p className="text-sm text-muted-foreground">JPG, PNG max 2MB</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Informations Personnelles</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  <User className="w-4 h-4 inline mr-2" />
                  Prénom
                </Label>
                <Input 
                  id="firstName" 
                  name="firstName"
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input 
                  id="lastName" 
                  name="lastName"
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
              <p className="text-sm text-muted-foreground">L'email ne peut pas être modifié</p>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Changer le Mot de Passe</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                name="oldPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Changement...' : 'Changer le mot de passe'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
