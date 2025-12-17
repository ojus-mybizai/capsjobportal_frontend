"use client";

import clsx from "clsx";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70";

  const variants = {
    primary:
      "bg-[var(--accent)] text-white shadow-sm hover:bg-[#2493c3] border border-transparent",
    outline:
      "border border-[var(--border)] bg-[var(--bg)] text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-700 hover:bg-slate-100",
    danger:
      "bg-[var(--danger)] text-white shadow-sm hover:bg-[#d03e3e] border border-transparent",
  };

  const sizes = {
    sm: "h-7 px-2 text-xs",
    md: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-sm",
  };

  return (
    <button
      className={clsx(base, variants[variant] || variants.primary, sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
