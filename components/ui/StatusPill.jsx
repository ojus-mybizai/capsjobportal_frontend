"use client";

import clsx from "clsx";

const STATUS_STYLES = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "open": "bg-emerald-50 text-emerald-700 border-emerald-100",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  applied: "bg-sky-50 text-sky-700 border-sky-100",
  shortlisted: "bg-indigo-50 text-indigo-700 border-indigo-100",
  interviewed: "bg-amber-50 text-amber-700 border-amber-100",
  selected: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
  scheduled: "bg-amber-50 text-amber-700 border-amber-100",
  "on hold": "bg-amber-50 text-amber-700 border-amber-100",
  joined: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "rejected by employer": "bg-rose-50 text-rose-700 border-rose-100",
  "rejected by candidate": "bg-rose-50 text-rose-700 border-rose-100",
  registered: "bg-sky-50 text-sky-700 border-sky-100",
  caps: "bg-indigo-50 text-indigo-700 border-indigo-100",
  joc: "bg-emerald-50 text-emerald-700 border-emerald-100",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "not verified": "bg-slate-100 text-slate-700 border-slate-200",
  free: "bg-slate-100 text-slate-700 border-slate-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-100",
  dropped: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function StatusPill({ status }) {
  if (!status) return null;
  const normalized = String(status)
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  const label = normalized.replace(/\b\w/g, (m) => m.toUpperCase());
  const style =
    STATUS_STYLES[normalized] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        style
      )}
    >
      {label}
    </span>
  );
}
