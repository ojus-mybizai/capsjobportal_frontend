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
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
        <Header />
        <main className="flex-1 ">
          <div className="mx-auto flex min-h-full flex-col gap-5 border border-slate-200 bg-white p-5 shadow-lg ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <Breadcrumbs />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
