"use client";

import clsx from "clsx";

export default function Badge({ children, variant = "default", className }) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent",
    subtle: "bg-slate-50 text-slate-500 border-slate-100",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
