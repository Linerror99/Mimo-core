/**
 * Zustand Authentication Store
 * 
 * Manages user authentication state, tokens, and auth operations
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from '@/utils/toast';
import logger from '@/utils/logger';
import { API_BASE_URL } from '@/config/api';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  household_id: string | null;
  avatar_url: string | null;
  created_at: string;
  is_in_couple: boolean;
}

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Login action
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            credentials: 'include', // Receive and send HttpOnly cookies
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Invalid credentials');
          }
          
          const data = await response.json();
          
          // Save access token to localStorage for axios interceptor
          localStorage.setItem('access_token', data.access_token);
          // Clean legacy refresh_token from localStorage for security (handled via HttpOnly cookie)
          localStorage.removeItem('refresh_token');
          
          // Save access token to state
          set({
            accessToken: data.access_token,
            refreshToken: null,
          });
          
          // Fetch user profile with the new token
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
            },
          });
          
          if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
          }
          
          const user = await userResponse.json();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      
      // Register action
      register: async (email: string, password: string, firstName: string, lastName: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              first_name: firstName,
              last_name: lastName,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');
          }
          
          // Don't set user or isAuthenticated here
          // Auto-login after registration will handle it
          await get().login(email, password);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      // Logout action
      logout: async () => {
        const { accessToken } = get();
        
        try {
          await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            },
          });
        } catch (error) {
          logger.error('Logout error', error);
        } finally {
          // Clear localStorage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          
          // Clear state regardless of API call success
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },
      
      // Update profile action
      updateProfile: async (firstName: string, lastName: string) => {
        const { accessToken } = get();
        set({ isLoading: true, error: null });
        
        try {
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          
          const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Update failed');
          }
          
          const updatedUser = await response.json();
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Update failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      // Change password action
      changePassword: async (oldPassword: string, newPassword: string) => {
        const { accessToken } = get();
        set({ isLoading: true, error: null });
        
        try {
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          
          const response = await fetch(`${API_BASE_URL}/api/v1/users/me/password`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              old_password: oldPassword,
              new_password: newPassword,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Password change failed');
          }
          
          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Password change failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      // Refresh access token
      refreshAccessToken: async () => {
        const localRefreshToken = localStorage.getItem('refresh_token');
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Automatically sends HttpOnly refresh cookie
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(localRefreshToken ? { refresh_token: localRefreshToken } : {}),
          });
          
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              // Refresh token is invalid or expired, logout user
              await get().logout();
              throw new Error('Session expired');
            } else {
              // Server or temporary error (500, 502, 503, 504), do NOT logout
              throw new Error(`Refresh failed with status ${response.status}`);
            }
          }
          
          const data = await response.json();
          
          // Update access token
          localStorage.setItem('access_token', data.access_token);
          
          set({
            accessToken: data.access_token,
          });
        } catch (error) {
          logger.error('Token refresh error', error);
          // Do not logout here: if status was 401/403, logout was already called above.
          // Network errors (Failed to fetch) must NOT wipe tokens.
          throw error;
        }
      },
      
      // Check authentication status
      checkAuth: async () => {
        // First check localStorage (in case Zustand persist hasn't loaded yet)
        const localAccessToken = localStorage.getItem('access_token');
        const localRefreshToken = localStorage.getItem('refresh_token');
        
        // Get current state
        const { accessToken, refreshToken } = get();
        
        // Use localStorage tokens if available, otherwise use state
        const tokenToUse = localAccessToken || accessToken;
        const refreshToUse = localRefreshToken || refreshToken;
        
        if (!tokenToUse) {
          // If no access token, attempt silent refresh using HttpOnly cookie before giving up
          try {
            await get().refreshAccessToken();
            const refreshedToken = get().accessToken;
            if (!refreshedToken) {
              set({ isAuthenticated: false, user: null });
              return;
            }
          } catch (_) {
            set({ isAuthenticated: false, user: null });
            return;
          }
        }
        
        const activeToken = get().accessToken || tokenToUse;
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${activeToken}`,
            },
          });
          
          if (!response.ok) {
            // Try to refresh token
            await get().refreshAccessToken();
            return;
          }
          
          const user = await response.json();
          
          set({
            user,
            isAuthenticated: true,
          });
        } catch (error) {
          logger.error('Auth check error', error);
          await get().logout();
        }
      },
      
      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);
