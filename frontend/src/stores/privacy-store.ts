import { create } from "zustand";

const PRIVACY_STORAGE_KEY = "mimo_privacy_mode";

interface PrivacyState {
  isPrivate: boolean;
  togglePrivacy: () => void;
  setPrivate: (value: boolean) => void;
  hydrate: () => void;
}

export const usePrivacyStore = create<PrivacyState>((set) => ({
  isPrivate: false,
  togglePrivacy: () =>
    set((state) => {
      const next = !state.isPrivate;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
      }
      return { isPrivate: next };
    }),
  setPrivate: (value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(value));
    }
    set({ isPrivate: value });
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (saved === "true") {
      set({ isPrivate: true });
    }
  },
}));
