import { ReactNode, useState, useEffect, useRef } from 'react'
import '../styles/Layout.css'
import { Home, List, TrendingUp, CreditCard, Folder, Target, Trash2, LogOut, User, UserPlus, Settings, Menu, Moon, Sun, ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { NotificationBell } from '@/components/NotificationBell'
import { Notification } from '@/types/notification'

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
  const { user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mimo-sidebar-open')
      if (saved !== null) return saved === 'true'
      return window.innerWidth >= 1024
    }
    return true
  })

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })
  const sidebarRef = useRef<HTMLDivElement>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return undefined
    if (avatarUrl.startsWith('http')) return avatarUrl
    return `${API_BASE_URL}${avatarUrl}`
  }

  // Toggle sidebar and persist preference
  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev
      localStorage.setItem('mimo-sidebar-open', String(next))
      return next
    })
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('mimo-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('mimo-theme', 'light')
    }
  }

  // Load saved theme on mount (default to light)
  useEffect(() => {
    const savedTheme = localStorage.getItem('mimo-theme')
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDarkMode(false)
    }
  }, [])

  // Close sidebar on mobile outside click only
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth < 1024 && sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  const handleNotificationClick = (_notification: Notification) => {
    navigate('dashboard')
  }

  const handleNavClick = (page: Page) => {
    navigate(page)
    // On mobile (< 1024px) auto-close only if desired, otherwise keep open on desktop
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className={`mimo-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* ====== TOP HEADER BAR ====== */}
      <header className="mimo-header">
        <div className="mimo-header-left">
          <button
            className="mimo-hamburger"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="mimo-header-logo" onClick={() => navigate('dashboard')}>
            <img src="/mimo-logo.jpg" alt="Mimo Finance" className="mimo-header-logo-img" />
            <span className="mimo-header-logo-text">Mimo Finance</span>
          </div>
        </div>

        <div className="mimo-header-right">
          {/* Dark / Light Mode Toggle */}
          <button
            className="mimo-header-icon-btn"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          {/* Notifications */}
          <NotificationBell
            onNotificationClick={handleNotificationClick}
            onViewAll={() => navigate('notifications')}
          />

          {/* User Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mimo-user-trigger">
                <Avatar className="w-8 h-8">
                  {user?.avatar_url && <AvatarImage src={getAvatarUrl(user.avatar_url)} alt="Avatar" />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="mimo-user-name">
                  {user ? `${user.first_name}` : 'User'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Paramètres & Compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavClick('settings-profile')}>
                <User className="w-4 h-4 mr-2" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavClick('settings-household')}>
                <Settings className="w-4 h-4 mr-2" />
                Foyer & Membres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavClick('settings-invitations')}>
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
      </header>

      {/* ====== SIDEBAR OVERLAY (Mobile only) ====== */}
      {sidebarOpen && <div className="mimo-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ====== SIDEBAR ====== */}
      <aside
        ref={sidebarRef}
        className={`mimo-sidebar ${sidebarOpen ? 'open' : ''}`}
      >
        <nav className="mimo-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`mimo-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mimo-sidebar-footer">
          <button className="mimo-logout-btn" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ====== MAIN CONTENT ====== */}
      <main className="mimo-main">
        {children}
      </main>
    </div>
  )
}
