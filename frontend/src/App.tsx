import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Timeline } from './pages/TimelinePage'
import { Projection } from './pages/Projection'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import RecurringPage from './pages/RecurringPage'
import { ProjectionPage } from './pages/ProjectionPage'
import { Goals } from './pages/Goals'
import { SettingsProfile } from './pages/SettingsProfile'
import { SettingsHousehold } from './pages/SettingsHousehold'
import Settings from './pages/Settings'
import { Trash } from './pages/TrashPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { Toaster } from '@/components/ui/sonner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { FeedbackProvider } from './context/FeedbackContext'
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
  | 'notifications'

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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
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
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <ProjectionPage navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/accounts" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <AccountsPage navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/categories" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <CategoriesPage navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
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
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <ProjectionPage navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
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
        path="/settings/invitations" 
        element={
          <ProtectedRoute>
            <Settings />
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

      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <LegacyNavigationWrapper>
              {({ navigate, onLogout }) => <NotificationsPage navigate={navigate} onLogout={onLogout} />}
            </LegacyNavigationWrapper>
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <FeedbackProvider>
        <AppRoutes />
        <Toaster />
      </FeedbackProvider>
    </BrowserRouter>
  )
}

export default App
