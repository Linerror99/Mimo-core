"use client";

import React, { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query-client";
import { usePrivacyStore } from "@/stores/privacy-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const hydratePrivacy = usePrivacyStore((s) => s.hydrate);

  useEffect(() => {
    hydratePrivacy();
  }, [hydratePrivacy]);

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
