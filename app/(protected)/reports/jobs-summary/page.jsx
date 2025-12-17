"use client";

import { useEffect, useMemo, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { jobsSummary } from "@/services/reports";
import { downloadCsv } from "@/utils/csv";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Button from "@/components/ui/Button";

export default function JobsSummaryReportPage() {
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageMetadata("Reports - Jobs summary", "High-level summary of jobs");
  }, [setPageMetadata]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await jobsSummary();
        if (!active) return;
        setSummary(result || null);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load jobs summary",
          description:
            (error && error.message) ||
            "An error occurred while loading jobs summary data.",
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

  const statusData = useMemo(() => {
    if (!summary) return [];
    const source = Array.isArray(summary?.byStatus)
      ? summary.byStatus
      : Array.isArray(summary)
      ? summary
      : [];

    return source.map((item) => ({
      name: item.status || item.label || item.name || "Unknown",
      value:
        typeof item.count === "number"
          ? item.count
          : typeof item.total === "number"
          ? item.total
          : typeof item.value === "number"
          ? item.value
          : 0,
    }));
  }, [summary]);

  const companyData = useMemo(() => {
    if (!summary) return [];
    const source = Array.isArray(summary?.byCompany)
      ? summary.byCompany
      : Array.isArray(summary?.companies)
      ? summary.companies
      : [];

    return source.map((item) => ({
      name: item.company || item.name || "Company",
      value:
        typeof item.openJobs === "number"
          ? item.openJobs
          : typeof item.count === "number"
          ? item.count
          : typeof item.value === "number"
          ? item.value
          : 0,
    }));
  }, [summary]);

  const headlineMetrics = useMemo(() => {
    if (!summary || typeof summary !== "object") return [];
    const entries = Object.entries(summary).filter(
      ([, value]) => typeof value === "number"
    );
    return entries.slice(0, 4).map(([key, value]) => ({ key, value }));
  }, [summary]);

  function handleExport() {
    const rows = statusData.length ? statusData : companyData;
    if (!rows.length) {
      pushToast({
        title: "No data to export",
        description: "There is no chart data available for CSV export yet.",
      });
      return;
    }
    downloadCsv("jobs-summary.csv", rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          {loading ? "Loading jobs summary..." : null}
        </div>
        <Button size="sm" variant="outline" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {headlineMetrics.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {headlineMetrics.map((m) => (
            <div
              key={m.key}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs shadow-sm"
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {m.key}
              </div>
              <div className="mt-1 text-xl font-semibold text-[var(--text)]">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Jobs by status
            </span>
          </div>
          {statusData.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No status breakdown data available yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Open jobs by company
            </span>
          </div>
          {companyData.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No company breakdown data available yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companyData}
                  margin={{ top: 10, right: 16, bottom: 40, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                  <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
