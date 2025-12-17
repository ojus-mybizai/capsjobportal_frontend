"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { placements } from "@/services/reports";
import Table from "@/components/table/Table";
import Button from "@/components/ui/Button";
import { downloadCsv } from "@/utils/csv";

export default function PlacementsReportPage() {
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageMetadata("Reports - Placements", "List of recorded placements");
  }, [setPageMetadata]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await placements({});
        if (!active) return;
        const items = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];
        const mapped = items.map((item, index) => ({
          id: item.id != null ? item.id : index + 1,
          data: JSON.stringify(item),
        }));
        setRows(mapped);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load placements",
          description:
            (error && error.message) ||
            "An error occurred while loading placements report.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [pushToast]);

  const columns = [
    { key: "id", label: "ID" },
    { key: "data", label: "Data" },
  ];

  function handleExport() {
    if (!rows.length) {
      pushToast({
        title: "No data to export",
        description: "There is no placements data available for CSV export.",
      });
      return;
    }
    downloadCsv("placements.csv", rows);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <div>{loading ? "Loading placements..." : null}</div>
        <Button size="sm" variant="outline" onClick={handleExport}>
          Export CSV
        </Button>
      </div>
      <Table columns={columns} rows={rows} />
    </div>
  );
}
