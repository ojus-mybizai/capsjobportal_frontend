"use client";

import clsx from "clsx";

const COLOR_CLASSES = [
  "from-amber-400 via-orange-500 to-rose-500", // warm: overview/data
  "from-sky-400 via-sky-500 to-blue-600", // cool: activity
  "from-emerald-400 via-emerald-500 to-teal-600", // success
  "from-violet-400 via-purple-500 to-fuchsia-600", // insights
  "from-cyan-400 via-blue-500 to-indigo-600", // misc
];

const COLOR_MAP = {
  overview: COLOR_CLASSES[0],
  "data-overview": COLOR_CLASSES[0],
  data: COLOR_CLASSES[0],
  summary: COLOR_CLASSES[0],
  activity: COLOR_CLASSES[1],
  timeline: COLOR_CLASSES[1],
  success: COLOR_CLASSES[2],
  finance: COLOR_CLASSES[2],
  insights: COLOR_CLASSES[3],
  reports: COLOR_CLASSES[3],
};

function getColorClass(item, index) {
  const key = String(item?.value || "").toLowerCase();
  return COLOR_MAP[key] || COLOR_CLASSES[index % COLOR_CLASSES.length];
}

export default function Tabs({ items = [], value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-gradient-to-r from-[var(--bg-muted)] via-white to-[var(--bg-muted)] p-2 shadow-sm">
      {items.map((item, index) => {
        const active = item.value === value;
        const colorClass = getColorClass(item, index);
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange && onChange(item.value)}
            className={clsx(
              "group relative overflow-hidden rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              "ring-1 ring-[var(--border)]",
              active
                ? "text-slate-900 bg-white shadow-md ring-[var(--accent)]"
                : "text-slate-700 bg-white/80 hover:text-slate-900"
            )}
          >
            <span
              className={clsx(
                "absolute inset-0 -z-[1] bg-gradient-to-r opacity-0 transition-opacity duration-200",
                colorClass,
                active ? "opacity-70" : "group-hover:opacity-80"
              )}
              aria-hidden="true"
            />
            <span className="relative">{item.label || item.value}</span>
          </button>
        );
      })}
    </div>
  );
}
