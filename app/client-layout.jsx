"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useMastersStore } from "@/stores/masters";
import { ToastContainer } from "@/components/ui/Toast";
import AppProviders from "./providers";
import QueryProvider from "./query-provider";

export default function ClientLayout({ children }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const preloadAllMasters = useMastersStore((state) => state.preloadAll);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    preloadAllMasters().catch(() => {});
  }, [hydrated, isAuthenticated, preloadAllMasters]);

  return (
    <QueryProvider>
      <AppProviders>
        {children}
        <ToastContainer />
      </AppProviders>
    </QueryProvider>
  );
}
