import { create } from "zustand";
import { authService } from "@/services/auth-service";
import { setStoredAccessToken } from "@/lib/api-client";
import type { User } from "@/types/auth";

function setSessionCookieFlag(active: boolean): void {
  if (typeof document === "undefined") return;
  if (active) {
    document.cookie = "mimo_session=1; Path=/; SameSite=Lax; Max-Age=604800";
  } else {
    document.cookie = "mimo_session=; Path=/; SameSite=Lax; Max-Age=0";
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await authService.login({ email, password });
      const user = await authService.getMe();
      setSessionCookieFlag(true);
      set({
        user,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setStoredAccessToken(null);
      setSessionCookieFlag(false);
      const msg =
        err instanceof Error
          ? err.message
          : "Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.";
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: msg,
      });
      throw err;
    }
  },

  register: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      await authService.login({ email, password });
      const user = await authService.getMe();
      setSessionCookieFlag(true);
      set({
        user,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible de créer votre compte.";
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      setSessionCookieFlag(false);
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    }
  },

  refreshUser: async () => {
    try {
      const user = await authService.getMe();
      setSessionCookieFlag(true);
      set({ user, isAuthenticated: true, isInitialized: true, error: null });
      return user;
    } catch {
      setSessionCookieFlag(false);
      set({ user: null, isAuthenticated: false, isInitialized: true });
      return null;
    }
  },

  setUser: (user) => {
    setSessionCookieFlag(Boolean(user));
    set({
      user,
      isAuthenticated: Boolean(user),
      isInitialized: true,
    });
  },

  clearError: () => set({ error: null }),
}));
