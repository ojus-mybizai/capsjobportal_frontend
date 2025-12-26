"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import Button from "@/components/ui/Button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Companies", href: "/companies" },
  { label: "Jobs", href: "/jobs" },
  { label: "Candidates", href: "/candidates" },
  { label: "Interviews", href: "/interviews" },
  {
    label: "Reports",
    href: "/reports",
  },
  { label: "Payments", href: "/payments" },
  { label: "Settings", href: "/settings" },
  {label: "Ai Search" , href:"/reports/ai-search"},
];

function SidebarLink({ item, active }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-300" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);

  const role = user && user.role;

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && role !== "admin") return false;
    return true;
  });

  return (
    <aside
      className={clsx(
        "hidden shrink-0 border-r border-[var(--border)] bg-[var(--bg)] transition-all duration-200 md:flex md:flex-col",
        sidebarOpen ? "w-60" : "w-0 overflow-hidden border-transparent"
      )}
      aria-label="Main navigation"
    >
      {sidebarOpen && (
        <>
          <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
              C
            </div>
            <div className="flex flex-1 items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--text)]">
                  CAPS Portal
                </span>
                <span className="text-xs text-slate-500">Job Placement</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 px-0 text-slate-500 hover:text-slate-800"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
              >
                «
              </Button>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map((item, idx) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const key = item.href ? `${item.href}-${idx}` : `${item.label}-${idx}`;
              return <SidebarLink key={key} item={item} active={active} />;
            })}
          </nav>
        </>
      )}
    </aside>
  );
}
