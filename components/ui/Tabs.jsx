"use client";

import clsx from "clsx";

export default function Tabs({
  items,
  value,
  onChange,
  className,
  tabClassName,
  ...props
}) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1",
        className
      )}
      role="tablist"
      {...props}
    >
      {safeItems.map((item) => {
        const key = String(item.value);
        const selected = String(value) === key;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange && onChange(item.value)}
            className={clsx(
              "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              selected
                ? "bg-[var(--accent)] text-white"
                : "text-slate-700 hover:bg-slate-100",
              tabClassName
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
