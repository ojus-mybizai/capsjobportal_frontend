export default function PaginatedTable({
  columns = [],
  rows = [],
  page = 1,
  limit = 10,
  total = 0,
  onPageChange,
  renderActions,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-semibold text-slate-700">
                  {col.label}
                </th>
              ))}
              {renderActions ? (
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row, idx) => (
              <tr key={row.id ?? idx} className="hover:bg-slate-50">
                {columns.map((col) => {
                  const value = row[col.key];
                  return (
                    <td key={col.key} className="px-3 py-2 text-slate-800">
                      {col.render ? col.render(value, row) : value ?? "-"}
                    </td>
                  );
                })}
                {renderActions ? (
                  <td className="px-3 py-2">
                    <div className="flex justify-end">{renderActions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No data
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-700">
        <div>
          Page {page} of {totalPages} • Showing {rows.length} of {total}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
