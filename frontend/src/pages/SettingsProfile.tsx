import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Mail } from 'lucide-react'
import { toast } from 'sonner'

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
  const [firstName, setFirstName] = useState('Alex')
  const [lastName, setLastName] = useState('Dupont')
  const [email, setEmail] = useState('alex@mimo.fr')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Profil mis à jour avec succès')
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    toast.success('Mot de passe modifié avec succès')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
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
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit">Enregistrer les modifications</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Changer le Mot de Passe</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit">Changer le mot de passe</Button>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
