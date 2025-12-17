"use client";

export default function Table({ columns, rows, renderActions, className }) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]${
        className ? ` ${className}` : ""
      }`}
    >
      <div className="w-full overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-[var(--bg-muted)] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="border-b border-[var(--border)] px-3 py-2 font-medium">
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="border-b border-[var(--border)] px-3 py-2" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-3 py-6 text-center text-xs text-slate-500"
                >
                  No records found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id || JSON.stringify(row)} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 align-top text-xs text-slate-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-3 py-2 text-right text-xs text-slate-500">
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
