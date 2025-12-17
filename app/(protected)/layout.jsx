"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function ProtectedLayout({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-muted)]">
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-slate-600 shadow-sm">
            Loading your workspace...
          </div>
        </div>
      }
    >
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </Suspense>
  );
}

function ProtectedLayoutInner({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!isAuthenticated) {
      const qs = searchParams ? searchParams.toString() : "";
      const next = `${pathname}${qs ? `?${qs}` : ""}`;
      const nextParam = encodeURIComponent(next);
      router.replace(`/login?next=${nextParam}`);
    }
  }, [hydrated, loading, isAuthenticated, pathname, router, searchParams]);

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-muted)]">
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-muted)]">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
