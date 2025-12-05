import { ReactNode } from 'react'
import { Home, List, TrendingUp, CreditCard, Folder, Target, Settings, Trash2, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  { id: 'categories' as Page, label: 'Catégories', icon: Folder },
  { id: 'goals' as Page, label: 'Objectifs', icon: Target },
  { id: 'trash' as Page, label: 'Corbeille', icon: Trash2 },
]

export function Layout({ children, currentPage, navigate, onLogout }: LayoutProps) {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()

  const Sidebar = () => (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-2">
          <span className="text-xl font-bold text-primary-foreground">M</span>
        </div>
        <span className="text-lg font-semibold">Mimo Finance</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">
                  {user ? `${user.first_name} ${user.last_name}` : 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email || 'user@mimo.fr'}</p>
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
      <main className={`flex-1 ${isMobile ? 'pb-20' : ''}`}>{children}</main>
      {isMobile && <BottomNav />}
    </div>
  )
}
