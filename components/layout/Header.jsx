"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { debounce } from "@/utils/debounce";
import { useMemo } from "react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const pageTitle = useUIStore((state) => state.pageTitle);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        const params = new URLSearchParams(window.location.search);
        if (value) params.set("q", value);
        else params.delete("q");
        router.push(`${pathname}?${params.toString()}`);
      }, 300),
    [router, pathname]
  );

  function handleSearchChange(e) {
    debouncedSearch(e.target.value);
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-xs text-slate-500 hover:bg-slate-100 md:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          ☰
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--text)]">
            {pageTitle || "CAPS Portal"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden max-w-xs flex-1 items-center md:flex">
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-1.5 text-xs outline-none ring-0 focus:border-[var(--accent)]"
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-xs text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
          >
            🔔
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]"
            aria-label="Quick create"
          >
            +
          </button>

          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
              {user && user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden flex-col md:flex">
              <span className="text-xs font-medium text-[var(--text)]">
                {user && user.name ? user.name : "User"}
              </span>
              <span className="text-[10px] uppercase text-slate-500">
                {user && user.role ? user.role : "viewer"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 text-[10px] text-slate-500 hover:text-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
