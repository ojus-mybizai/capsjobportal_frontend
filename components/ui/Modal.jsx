"use client";

import { useEffect } from "react";
import clsx from "clsx";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape" && open) {
        onClose && onClose();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-3xl",
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={clsx(
          "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 shadow-lg",
          sizes[size]
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          )}
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
