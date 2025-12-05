/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Check if we have tokens in localStorage
      const hasTokens = localStorage.getItem('access_token');
      
      if (hasTokens) {
        // We have tokens, verify them
        await checkAuth();
      }
      
      setIsChecking(false);
    };
    
    checkAuthentication();
  }, [checkAuth]);

  useEffect(() => {
    // Only redirect after we've finished checking
    if (!isChecking && !isAuthenticated) {
      navigate('/login');
    }
  }, [isChecking, isAuthenticated, navigate]);

  // Show nothing while checking authentication
  if (isChecking) {
    return null;
  }

  // After checking, if not authenticated, show nothing (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
