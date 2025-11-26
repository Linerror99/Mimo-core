import { useKV } from '@github/spark/hooks'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Timeline } from './pages/Timeline'
import { Projection } from './pages/Projection'
import { Accounts } from './pages/Accounts'
import { Categories } from './pages/Categories'
import { Goals } from './pages/Goals'
import { SettingsProfile } from './pages/SettingsProfile'
import { SettingsHousehold } from './pages/SettingsHousehold'
import { Trash } from './pages/Trash'
import { Toaster } from '@/components/ui/sonner'

type Page = 
  | 'login' 
  | 'register' 
  | 'dashboard' 
  | 'timeline' 
  | 'projection' 
  | 'accounts' 
  | 'categories' 
  | 'goals' 
  | 'settings-profile' 
  | 'settings-household' 
  | 'trash'

function App() {
  const [currentPage, setCurrentPage] = useKV<Page>('current-page', 'login')
  const [isAuthenticated, setIsAuthenticated] = useKV<boolean>('is-authenticated', false)

  const navigate = (page: Page) => {
    setCurrentPage(() => page)
  }

  const handleLogin = () => {
    setIsAuthenticated(() => true)
    setCurrentPage(() => 'dashboard')
  }

  const handleRegister = () => {
    setIsAuthenticated(() => true)
    setCurrentPage(() => 'dashboard')
  }

  const handleLogout = () => {
    setIsAuthenticated(() => false)
    setCurrentPage(() => 'login')
  }

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return (
        <>
          <Register onRegister={handleRegister} onNavigateToLogin={() => navigate('login')} />
          <Toaster />
        </>
      )
    }
    return (
      <>
        <Login onLogin={handleLogin} onNavigateToRegister={() => navigate('register')} />
        <Toaster />
      </>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard navigate={navigate} onLogout={handleLogout} />
      case 'timeline':
        return <Timeline navigate={navigate} onLogout={handleLogout} />
      case 'projection':
        return <Projection navigate={navigate} onLogout={handleLogout} />
      case 'accounts':
        return <Accounts navigate={navigate} onLogout={handleLogout} />
      case 'categories':
        return <Categories navigate={navigate} onLogout={handleLogout} />
      case 'goals':
        return <Goals navigate={navigate} onLogout={handleLogout} />
      case 'settings-profile':
        return <SettingsProfile navigate={navigate} onLogout={handleLogout} />
      case 'settings-household':
        return <SettingsHousehold navigate={navigate} onLogout={handleLogout} />
      case 'trash':
        return <Trash navigate={navigate} onLogout={handleLogout} />
      default:
        return <Dashboard navigate={navigate} onLogout={handleLogout} />
    }
  }

  return (
    <>
      {renderPage()}
      <Toaster />
    </>
  )
}

export default App
