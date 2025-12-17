"use client";

import Button from "@/components/ui/Button";
import Table from "./Table";

export default function PaginatedTable({
  columns,
  rows,
  page,
  limit,
  total,
  onPageChange,
  renderActions,
}) {
  const totalPages = total && limit ? Math.max(1, Math.ceil(total / limit)) : 1;

  return (
    <div className="space-y-3">
      <Table
        columns={columns}
        rows={rows}
        renderActions={renderActions}
        className="min-h-[60vh]"
      />
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div>
          {typeof total === "number" && total >= 0 && (
            <span>
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} of {total} records
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange && onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
