"use client";

import clsx from "clsx";

export default function Spinner({ size = 14, label, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-xs text-slate-500",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="animate-spin text-[var(--accent)]"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
