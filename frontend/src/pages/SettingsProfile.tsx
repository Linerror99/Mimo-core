import { useState, useEffect, useRef } from 'react'
import { Layout } from '@/components/Layout'
import { SettingsHeader } from '@/components/SettingsHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { avatarService } from '@/services/avatarService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings'
  | 'settings-profile'
  | 'settings-household'
  | 'settings-invitations'
  | 'trash'
  | 'notifications'

interface SettingsProfileProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

// Helper pour construire l'URL complète de l'avatar
const getAvatarUrl = (avatarUrl: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_BASE_URL}${avatarUrl}`;
}

export function SettingsProfile({ navigate, onLogout }: SettingsProfileProps) {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore()
  const routerNavigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Charger les données de l'utilisateur
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!firstName || !lastName) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      await updateProfile(firstName, lastName)
      toast.success('Profil mis à jour avec succès')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil'
      toast.error(errorMessage)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation de taille (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 2MB)')
      return
    }

    // Validation de type
    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const result = await avatarService.upload(file)
      
      // Mettre à jour l'utilisateur dans le store
      const updatedUser = { ...user!, avatar_url: result.avatar_url }
      useAuthStore.setState({ user: updatedUser })
      
      toast.success('Photo de profil mise à jour')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Erreur lors de l\'upload de la photo')
    } finally {
      setIsUploadingAvatar(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarDelete = async () => {
    if (!user?.avatar_url) return

    try {
      await avatarService.delete()
      
      // Mettre à jour l'utilisateur dans le store
      const updatedUser = { ...user, avatar_url: null }
      useAuthStore.setState({ user: updatedUser })
      
      toast.success('Photo de profil supprimée')
    } catch (error) {
      console.error('Error deleting avatar:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Layout currentPage="settings-profile" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <SettingsHeader
          currentTab="profile"
          navigate={navigate}
          title="Paramètres du Profil"
          description="Gérez vos informations personnelles et votre sécurité"
        />

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Photo de Profil</h2>
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              {user?.avatar_url && <AvatarImage src={getAvatarUrl(user.avatar_url)} alt="Avatar" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {user?.first_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={triggerFileInput}
                  disabled={isUploadingAvatar}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingAvatar ? 'Upload en cours...' : 'Changer la photo'}
                </Button>
                {user?.avatar_url && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="text-destructive"
                    onClick={handleAvatarDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">JPG, PNG max 2MB</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Informations Personnelles</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
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
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
