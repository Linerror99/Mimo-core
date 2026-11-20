"use client";

import React, { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query-client";
import { usePrivacyStore } from "@/stores/privacy-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const isPrivate = usePrivacyStore((s) => s.isPrivate);
  const hydratePrivacy = usePrivacyStore((s) => s.hydrate);
  const togglePrivacy = usePrivacyStore((s) => s.togglePrivacy);

  useEffect(() => {
    hydratePrivacy();
  }, [hydratePrivacy]);

  useEffect(() => {
    document.body.classList.toggle("privacy-mode", isPrivate);
  }, [isPrivate]);

  // Raccourci clavier 'H' pour basculer le mode discret (comme l'ancien Mimo)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "h") {
        togglePrivacy();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePrivacy]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          className:
            "border border-slate-200 bg-white text-slate-900 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-100",
        }}
      />
    </QueryClientProvider>
  );
}
