const colorMap = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Not verified": "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  FREE: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function StatusPill({ status }) {
  const label = status || "-";
  const colorClass = colorMap[label] || "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}
