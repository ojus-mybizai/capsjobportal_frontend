"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui";

export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) => {
      if (toast.duration === 0) return null;
      const timeout = toast.duration || 4000;
      return setTimeout(() => {
        dismissToast(toast.id);
      }, timeout);
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [toasts, dismissToast]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              {toast.title && (
                <div className="font-medium text-[var(--text)]">
                  {toast.title}
                </div>
              )}
              {toast.description && (
                <div className="mt-1 text-xs text-slate-600">
                  {toast.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-xs text-slate-500 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
