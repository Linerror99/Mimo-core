import { ReactNode, useState } from 'react'
import { Home, List, TrendingUp, CreditCard, Folder, Target, Settings, Trash2, LogOut, User, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuthStore } from '@/stores/authStore'
import { NotificationBell } from '@/components/NotificationBell'
import { ValidationModal } from '@/components/ValidationModal'
import { Notification } from '@/types/notification'

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

interface LayoutProps {
  children: ReactNode
  currentPage: Page
  navigate: (page: Page) => void
  onLogout: () => void
}

const menuItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: Home },
  { id: 'timeline' as Page, label: 'Timeline', icon: List },
  { id: 'projection' as Page, label: 'Projection', icon: TrendingUp },
  { id: 'accounts' as Page, label: 'Comptes', icon: CreditCard },
  { id: 'goals' as Page, label: 'Objectifs', icon: Target },
  { id: 'categories' as Page, label: 'Catégories', icon: Folder },
  { id: 'trash' as Page, label: 'Corbeille', icon: Trash2 },
]

export function Layout({ children, currentPage, navigate, onLogout }: LayoutProps) {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification)
    setIsValidationModalOpen(true)
  }

  const handleValidationComplete = () => {
    setIsValidationModalOpen(false)
    setSelectedNotification(null)
  }

  const Sidebar = () => {
    const { user } = useAuthStore()
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const getAvatarUrl = (avatarUrl: string | null) => {
      if (!avatarUrl) return undefined
      if (avatarUrl.startsWith('http')) return avatarUrl
      return `${API_BASE_URL}${avatarUrl}`
    }

    return (
    <aside className="sticky top-0 h-screen w-64 bg-background border-r border-border flex flex-col justify-between shrink-0 z-30">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <img src="/mimo-logo.jpg" alt="Mimo Finance" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
              <span className="text-lg font-bold text-foreground">Mimo Finance</span>
            </div>
            <NotificationBell onNotificationClick={handleNotificationClick} />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border bg-background shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
              <Avatar className="w-9 h-9">
                {user?.avatar_url && <AvatarImage src={getAvatarUrl(user.avatar_url)} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {user ? `${user.first_name} ${user.last_name}` : 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@mimo.fr'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('settings-profile')}>
              <User className="w-4 h-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('settings-household')}>
              <Settings className="w-4 h-4 mr-2" />
              Foyer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/settings/invitations'}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invitations
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
  }

  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {menuItems.slice(0, 4).map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 min-w-[44px] ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-4 py-2 min-w-[44px] text-muted-foreground">
              <Settings className="w-6 h-6" />
              <span className="text-xs">Plus</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {menuItems.slice(4).map((item) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem key={item.id} onClick={() => navigate(item.id)}>
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('settings-profile')}>
              <User className="w-4 h-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('settings-household')}>
              <Settings className="w-4 h-4 mr-2" />
              Foyer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {!isMobile && <Sidebar />}
      <main className={`flex-1 min-w-0 ${isMobile ? 'pb-20' : ''}`}>{children}</main>
      {isMobile && <BottomNav />}
      {selectedNotification && (
        <ValidationModal
          notification={selectedNotification}
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          onSuccess={handleValidationComplete}
        />
      )}
    </div>
  )
}
