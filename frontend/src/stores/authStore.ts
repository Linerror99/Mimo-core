/**
 * Zustand Authentication Store
 * 
 * Manages user authentication state, tokens, and auth operations
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  household_id: string | null;
  created_at: string;
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
          
          // Save tokens to localStorage for axios interceptor
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          
          // Save tokens to state
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
          
          // Fetch user profile with the new token
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
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
          if (accessToken) {
            await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
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
        const { refreshToken } = get();
        const localRefreshToken = localStorage.getItem('refresh_token');
        const refreshToUse = localRefreshToken || refreshToken;
        
        try {
          if (!refreshToUse) {
            throw new Error('No refresh token available');
          }
          
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToUse }),
          });
          
          if (!response.ok) {
            // Refresh token is invalid, logout user
            get().logout();
            throw new Error('Session expired');
          }
          
          const data = await response.json();
          
          // Update both state and localStorage
          localStorage.setItem('access_token', data.access_token);
          
          set({
            accessToken: data.access_token,
          });
        } catch (error) {
          console.error('Token refresh error:', error);
          await get().logout();
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
          set({ isAuthenticated: false, user: null });
          return;
        }
        
        // Sync localStorage tokens to state if they differ
        if (localAccessToken && localAccessToken !== accessToken) {
          set({ accessToken: localAccessToken, refreshToken: localRefreshToken });
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            headers: {
              'Authorization': `Bearer ${tokenToUse}`,
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
          console.error('Auth check error:', error);
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
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
