"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  let href = "";

  return (
    <nav
      className="mb-3 flex items-center gap-1 text-xs text-slate-500"
      aria-label="Breadcrumb"
    >
      <Link href="/dashboard" className="hover:text-slate-800">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        href += `/${segment}`;
        const isLast = index === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <span>/</span>
            {isLast ? (
              <span className="font-medium text-slate-700">
                {decodeURIComponent(segment)}
              </span>
            ) : (
              <Link href={href} className="hover:text-slate-800">
                {decodeURIComponent(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
