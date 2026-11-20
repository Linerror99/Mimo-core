import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Timeline } from './pages/TimelinePage'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProjectionPage } from './pages/ProjectionPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsProfile } from './pages/SettingsProfile'
import { SettingsHousehold } from './pages/SettingsHousehold'
import Settings from './pages/Settings'
import { Trash } from './pages/TrashPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { Toaster } from '@/components/ui/sonner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { FeedbackProvider } from './context/FeedbackContext'
import { useAuthStore } from '@/stores/authStore'

// Helper wrapper to provide navigate and onLogout to existing authenticated pages
function AuthenticatedPage({ Component }: { Component: React.ComponentType<{ navigate: (page: any) => void; onLogout: () => void }> }) {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleNavigate = (page: string) => {
    navigate(`/${page}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return <Component navigate={handleNavigate} onLogout={handleLogout} />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected core pages */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={Dashboard} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/timeline" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={Timeline} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/projection" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={ProjectionPage} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/accounts" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={AccountsPage} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/categories" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={CategoriesPage} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/projects" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={ProjectsPage} />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/projects/:id" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={ProjectsPage} />
          </ProtectedRoute>
        } 
      />

      {/* Unified route: /goals redirects to /projects?tab=goals */}
      <Route path="/goals" element={<Navigate to="/projects?tab=goals" replace />} />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={SettingsProfile} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings/household" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={SettingsHousehold} />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/settings/invitations" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={Settings} />
          </ProtectedRoute>
        } 
      />

      {/* Redirect aliases for legacy settings routes */}
      <Route path="/settings-profile" element={<Navigate to="/settings" replace />} />
      <Route path="/settings-household" element={<Navigate to="/settings/household" replace />} />
      <Route path="/settings-invitations" element={<Navigate to="/settings/invitations" replace />} />
      
      <Route 
        path="/trash" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={Trash} />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <AuthenticatedPage Component={NotificationsPage} />
          </ProtectedRoute>
        } 
      />

      {/* Legacy aliases and removed routes */}
      <Route path="/projections" element={<Navigate to="/projection" replace />} />
      <Route path="/recurring" element={<Navigate to="/timeline" replace />} />

      {/* Public legal & info pages */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Wildcard 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FeedbackProvider>
          <AppRoutes />
          <Toaster />
        </FeedbackProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
