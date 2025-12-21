"use client";

import clsx from "clsx";

export default function Tabs({ items = [], value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] p-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange && onChange(item.value)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            )}
          >
            {item.label || item.value}
          </button>
        );
      })}
    </div>
  );
}
