import Skeleton from "@/components/ui/Skeleton";

export default function PaginatedTable({
  columns = [],
  rows = [],
  page = 1,
  limit = 10,
  total = 0,
  loading = false,
  onPageChange,
  renderActions,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showSkeleton = loading && rows.length === 0;
  const showOverlayBar = loading && rows.length > 0;
  const skeletonRowCount = Math.min(Math.max(limit, 4), 8);

  return (
    <div className="space-y-4">
      <div className="relative overflow-x-auto rounded-lg ring-1 ring-slate-100">
        {showOverlayBar ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-t-lg bg-slate-100">
            <div className="h-full w-1/2 animate-[loading-bar_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
          </div>
        ) : null}
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
          <tbody
            className={
              "divide-y divide-slate-200 bg-white transition-opacity duration-200 " +
              (showOverlayBar ? "opacity-60" : "opacity-100")
            }
          >
            {showSkeleton
              ? Array.from({ length: skeletonRowCount }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-3">
                        <Skeleton className="h-3.5 w-3/4" />
                      </td>
                    ))}
                    {renderActions ? (
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-3.5 w-12" />
                          <Skeleton className="h-3.5 w-12" />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              : rows.map((row, idx) => (
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
            {!showSkeleton && rows.length === 0 ? (
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
            disabled={page <= 1 || loading}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
