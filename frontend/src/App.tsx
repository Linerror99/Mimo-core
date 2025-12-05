import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Timeline } from './pages/TimelinePage'
import { Projection } from './pages/Projection'
import AccountsPage from './pages/AccountsPage'
import CategoriesPage from './pages/CategoriesPage'
import RecurringPage from './pages/RecurringPage'
import ProjectionPage from './pages/ProjectionPage'
import { Goals } from './pages/Goals'
import { SettingsProfile } from './pages/SettingsProfile'
import { SettingsHousehold } from './pages/SettingsHousehold'
import { Trash } from './pages/TrashPage'
import { Toaster } from '@/components/ui/sonner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

type Page = 
  | 'login' 
  | 'register' 
  | 'dashboard' 
  | 'timeline' 
  | 'projection' 
  | 'accounts' 
  | 'categories' 
  | 'recurring'
  | 'projections'
  | 'goals' 
  | 'settings-profile' 
  | 'settings-household' 
  | 'trash'

// Helper component to handle legacy navigation
function LegacyNavigationWrapper({ children }: { children: React.ReactElement }) {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleNavigate = (page: Page) => {
    navigate(`/${page}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return children({ navigate: handleNavigate, onLogout: handleLogout })
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <Dashboard navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/timeline" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <Timeline navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/projection" 
        element={
          <ProtectedRoute>
            <ProjectionPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/accounts" 
        element={
          <ProtectedRoute>
            <AccountsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/categories" 
        element={
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/recurring" 
        element={
          <ProtectedRoute>
            <RecurringPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/projections" 
        element={
          <ProtectedRoute>
            <ProjectionPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/goals" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <Goals navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <SettingsProfile navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings-profile" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <SettingsProfile navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings-household" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <SettingsHousehold navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/trash" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <Trash navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  )
}

export default App
