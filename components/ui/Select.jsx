"use client";

import clsx from "clsx";

export default function Select({ className, children, ...props }) {
  return (
    <select
      className={clsx(
        "w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
