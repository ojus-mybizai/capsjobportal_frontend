"use client";

export default function Table({ columns = [], rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-sm">
      <table className="min-w-full divide-y divide-[var(--border)] text-sm">
        <thead className="bg-[var(--bg-muted)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-semibold text-slate-700">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx} className="bg-[var(--bg)]">
              {columns.map((col) => {
                const value = row[col.key];
                return (
                  <td key={col.key} className="px-3 py-2 text-slate-800">
                    {col.render ? col.render(value, row) : value ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-4 text-center text-xs text-slate-500"
              >
                No data
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
