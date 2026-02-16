"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { useInterviewsStore } from "@/stores/interviews";
import { listCompanies, listCompanyOptions } from "@/services/companies";
import { listJobs, listJobOptions } from "@/services/jobs";
import { listCandidates, listCandidateOptions } from "@/services/candidates";
import { deleteInterview } from "@/services/interviews";
import PaginatedTable from "@/components/table/PaginatedTable";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusPill from "@/components/ui/StatusPill";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "REJECTED_BY_EMPLOYER", label: "Rejected by employer" },
  { value: "REJECTED_BY_CANDIDATE", label: "Rejected by candidate" },
  { value: "JOINED", label: "Joined" },
];

export default function InterviewsPage() {
  return (
    <Suspense>
      <InterviewsPageInner />
    </Suspense>
  );
}

function InterviewsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const items = useInterviewsStore((state) => state.items);
  const total = useInterviewsStore((state) => state.total);
  const list = useInterviewsStore((state) => state.list);

  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirmRow, setConfirmRow] = useState(null);

  const companyIdParam = searchParams.get("company_id") || "";
  const jobIdParam = searchParams.get("job_id") || "";
  const candidateIdParam = searchParams.get("candidate_id") || "";
  const statusParam = searchParams.get("status") || "";
  const qParam = searchParams.get("q") || "";
  const fromDateParam = searchParams.get("from_date") || "";
  const toDateParam = searchParams.get("to_date") || "";
  const createdFromParam = searchParams.get("created_from") || "";
  const createdToParam = searchParams.get("created_to") || "";
  const isActiveParam = searchParams.get("is_active") || "";
  const sortByParam = searchParams.get("sort_by") || "";
  const orderParam = searchParams.get("order") || "";
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const searchParamsString = searchParams.toString();

  const [query, setQuery] = useState(qParam);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeFilters = useMemo(() => {
    const items = [];
    if (companyIdParam) items.push({ key: "company_id", label: "Company", value: companyIdParam });
    if (jobIdParam) items.push({ key: "job_id", label: "Job", value: jobIdParam });
    if (candidateIdParam) items.push({ key: "candidate_id", label: "Candidate", value: candidateIdParam });
    if (statusParam) items.push({ key: "status", label: "Status", value: statusParam });
    if (qParam) items.push({ key: "q", label: "Remarks", value: qParam });
    if (fromDateParam) items.push({ key: "from_date", label: "From date", value: fromDateParam });
    if (toDateParam) items.push({ key: "to_date", label: "To date", value: toDateParam });
    if (createdFromParam) items.push({ key: "created_from", label: "Created from", value: createdFromParam });
    if (createdToParam) items.push({ key: "created_to", label: "Created to", value: createdToParam });
    if (isActiveParam) items.push({ key: "is_active", label: "Active", value: isActiveParam });
    if (sortByParam) items.push({ key: "sort_by", label: "Sort by", value: sortByParam });
    if (orderParam) items.push({ key: "order", label: "Order", value: orderParam });
    return items;
  }, [
    companyIdParam,
    jobIdParam,
    candidateIdParam,
    statusParam,
    qParam,
    fromDateParam,
    toDateParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
  ]);

  const filtersKey = [
    companyIdParam,
    jobIdParam,
    candidateIdParam,
    statusParam,
    qParam,
    fromDateParam,
    toDateParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
  ].join("|");

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const hasAdvanced =
      !!qParam ||
      !!createdFromParam ||
      !!createdToParam ||
      !!isActiveParam ||
      !!sortByParam ||
      !!orderParam;
    if (hasAdvanced) setShowAdvanced(true);
  }, [qParam, createdFromParam, createdToParam, isActiveParam, sortByParam, orderParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (query || "").trim();
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("q", next);
      else params.delete("q");
      params.set("page", "1");
      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [query, router, pathname, searchParamsString]);

  function patchParams(patch, { resetPage = true } = {}) {
    const params = new URLSearchParams(searchParamsString);
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value == null || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    if (resetPage) params.set("page", "1");
    const qs = params.toString();
    if (qs === searchParamsString) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearSingleFilter(key) {
    if (key === "company_id") patchParams({ company_id: "", job_id: "" });
    else if (key === "job_id") setParam("job_id", "");
    else if (key === "candidate_id") setParam("candidate_id", "");
    else setParam(key, "");
    if (key === "q") setQuery("");
  }

  function setParam(key, value, { resetPage = true } = {}) {
    patchParams({ [key]: value }, { resetPage });
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParamsString);
    [
      "company_id",
      "job_id",
      "candidate_id",
      "status",
      "q",
      "from_date",
      "to_date",
      "created_from",
      "created_to",
      "is_active",
      "sort_by",
      "order",
      "page",
    ].forEach((k) => params.delete(k));
    const qs = params.toString();
    if (qs === searchParamsString) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function handleDeleteInterview(row) {
    const id = row && row.id != null ? String(row.id) : "";
    if (!id) return;

    setConfirmRow(row);
  }

  async function confirmDelete() {
    const row = confirmRow;
    const id = row && row.id != null ? String(row.id) : "";
    if (!id) {
      setConfirmRow(null);
      return;
    }

    try {
      await deleteInterview(id);
      pushToast({
        title: "Interview deleted",
        description: "The interview was deleted successfully.",
      });
      setRefreshTick(Date.now());
    } catch (error) {
      pushToast({
        title: "Failed to delete interview",
        description:
          (error && error.message) || "An error occurred while deleting the interview.",
      });
    }
    setConfirmRow(null);
  }

  useEffect(() => {
    setPageMetadata("Interviews", "Browse and manage interviews");
  }, [setPageMetadata]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        await list({
          page,
          limit: PAGE_SIZE,
          company_id: companyIdParam || undefined,
          job_id: jobIdParam || undefined,
          candidate_id: candidateIdParam || undefined,
          status: statusParam || undefined,
          q: qParam || undefined,
          from_date: fromDateParam ? `${fromDateParam}T00:00:00` : undefined,
          to_date: toDateParam ? `${toDateParam}T23:59:59` : undefined,
          created_from: createdFromParam ? `${createdFromParam}T00:00:00` : undefined,
          created_to: createdToParam ? `${createdToParam}T23:59:59` : undefined,
          is_active:
            isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined,
          sort_by: sortByParam || undefined,
          order: orderParam || undefined,
        });
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load interviews",
          description:
            (error && error.message) ||
            "An error occurred while loading interviews.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [page, filtersKey, refreshTick, list, pushToast]);

  async function loadCompanyOptions({ query, limit }) {
    // Use lightweight /options endpoint for dropdown
    return await listCompanyOptions({ q: query || "", limit: limit || 20 });
  }

  async function loadJobOptions({ query, limit }) {
    // Use lightweight /options endpoint for dropdown
    return await listJobOptions({
      q: query || "",
      company_id: companyIdParam || undefined,
      limit: limit || 20,
    });
  }

  async function loadCandidateOptions({ query, limit }) {
    // Use lightweight /options endpoint for dropdown
    return await listCandidateOptions({ q: query || "", limit: limit || 20 });
  }

  function truncateRemark(text, maxWords = 50) {
    if (!text || typeof text !== "string") return "-";
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return `${words.slice(0, maxWords).join(" ")}…`;
  }

  const columns = [
    {
      key: "candidate_name",
      label: "Candidate",
      render: (value, row) => {
        const id = row?.candidate_id;
        const name = value || row?.candidate_name || "-";
        return id ? (
          <Link href={`/candidates/${encodeURIComponent(String(id))}`} className="text-[var(--accent)] hover:underline">
            {name}
          </Link>
        ) : (
          name
        );
      },
    },
    {
      key: "job_title",
      label: "Job",
      render: (value, row) => {
        const id = row?.job_id;
        const title = value || row?.job_title || "-";
        return id ? (
          <Link href={`/jobs/${encodeURIComponent(String(id))}`} className="text-[var(--accent)] hover:underline">
            {title}
          </Link>
        ) : (
          title
        );
      },
    },
    {
      key: "company_name",
      label: "Company",
      render: (value, row) => {
        const id = row?.company_id;
        const name = value || row?.company_name || "-";
        return id ? (
          <Link href={`/companies/${encodeURIComponent(String(id))}`} className="text-[var(--accent)] hover:underline">
            {name}
          </Link>
        ) : (
          name
        );
      },
    },
    {
      key: "interview_date",
      label: "Interview date",
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY") : "Not set",
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (value) => {
        const display = truncateRemark(value || "");
        return display === "-" ? "-" : <span title={value}>{display}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusPill status={value} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-xl bg-[var(--bg)] p-5 ring-1 ring-[var(--border)] shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--bg-muted)]/60 via-transparent to-[var(--bg-muted)]/60 opacity-0 transition-opacity duration-500 hover:opacity-100" />
        <div className="flex flex-col gap-4 relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Interview filters</div>
              <div className="text-base font-semibold text-slate-800">Narrow down interviews</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "Hide advanced" : "Advanced"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  clearFilters();
                }}
              >
                Clear all
              </Button>
              <Link href="/interviews/new">
                <Button size="sm">Schedule interview</Button>
              </Link>
            </div>
          </div>

          {activeFilters.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-muted)]/70 p-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Active
              </span>
              {activeFilters.map((f) => (
                <button
                  key={`${f.key}-${f.value}`}
                  type="button"
                  onClick={() => clearSingleFilter(f.key)}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition"
                  title="Remove filter"
                >
                  <span className="text-slate-500">{f.label}:</span>
                  <span>{f.value}</span>
                  <span className="text-slate-400">×</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-muted)]/40 px-3 py-2 text-xs text-slate-500">
              No active filters. Refine the list below.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Company</div>
              <AsyncSearchSelect
                value={companyIdParam}
                onChange={(v) => {
                  patchParams({ company_id: v || "", job_id: "" });
                }}
                placeholder="All companies"
                searchPlaceholder="Search companies..."
                loadOptions={loadCompanyOptions}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.name || `Company #${c.id}`}
                allowClear
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Job</div>
              <AsyncSearchSelect
                value={jobIdParam}
                onChange={(v) => {
                  setParam("job_id", v || "");
                }}
                disabled={!companyIdParam}
                placeholder={companyIdParam ? "All jobs" : "Select company first"}
                searchPlaceholder="Search jobs..."
                loadOptions={loadJobOptions}
                getOptionValue={(j) => j.id}
                getOptionLabel={(j) => j.name || `Job #${j.id}`}
                allowClear={!!companyIdParam}
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Candidate</div>
              <AsyncSearchSelect
                value={candidateIdParam}
                onChange={(v) => {
                  setParam("candidate_id", v || "");
                }}
                placeholder="All candidates"
                searchPlaceholder="Search candidates..."
                loadOptions={loadCandidateOptions}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.full_name || c.name || c.candidate_name || `Candidate #${c.id}`}
                allowClear
              />
            </div>

            <div className="md:col-span-1.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Status</div>
              <Select
                value={statusParam}
                onChange={(e) => {
                  setParam("status", e.target.value);
                }}
              >
                {STATUS_FILTERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Interview from</div>
              <Input
                type="date"
                value={fromDateParam}
                onChange={(e) => {
                  setParam("from_date", e.target.value);
                }}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Interview to</div>
              <Input
                type="date"
                value={toDateParam}
                onChange={(e) => {
                  setParam("to_date", e.target.value);
                }}
              />
            </div>
          </div>

          {showAdvanced ? (
            <div className="grid gap-3 md:grid-cols-12 md:items-end pt-2 border-t border-dashed border-[var(--border)]">
              <div className="md:col-span-4 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Search remarks</div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="q…"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Created from</div>
                <Input
                  type="date"
                  value={createdFromParam}
                  onChange={(e) => setParam("created_from", e.target.value)}
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Created to</div>
                <Input
                  type="date"
                  value={createdToParam}
                  onChange={(e) => setParam("created_to", e.target.value)}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Active</div>
                <Select value={isActiveParam} onChange={(e) => setParam("is_active", e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Sort by</div>
                <Select value={sortByParam} onChange={(e) => setParam("sort_by", e.target.value)}>
                  <option value="">created_at</option>
                  <option value="updated_at">updated_at</option>
                  <option value="interview_date">interview_date</option>
                  <option value="status">status</option>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Order</div>
                <Select value={orderParam} onChange={(e) => setParam("order", e.target.value)}>
                  <option value="">desc</option>
                  <option value="asc">asc</option>
                  <option value="desc">desc</option>
                </Select>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-xs text-slate-500">{loading ? "Loading…" : null}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Showing page {page}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{activeFilters.length} active filters</span>
            </div>
          </div>
        </div>
      </div>

      <PaginatedTable
        columns={columns}
        rows={items || []}
        page={page}
        limit={PAGE_SIZE}
        total={total || 0}
        onPageChange={(nextPage) => {
          const params = new URLSearchParams(searchParamsString);
          params.set("page", String(nextPage));
          const qs = params.toString();
          if (qs === searchParamsString) return;
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }}
        renderActions={(row) => (
          <div className="flex items-center justify-end gap-2">
            <Link href={`/interviews/${row.id}`}>
              <Button variant="outline" size="sm" className="gap-1">
                ✏️ <span>Edit</span>
              </Button>
            </Link>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="gap-1"
              onClick={() => handleDeleteInterview(row)}
            >
              🗑 <span>Delete</span>
            </Button>
          </div>
        )}
      />

      {confirmRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--panel)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[var(--border)]">
            <div className="text-[18px] font-semibold text-[var(--text)]">Delete interview?</div>
            <div className="mt-2 text-[14px] text-[var(--muted-text)]">
              This action cannot be undone.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmRow(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDelete}>
                Confirm delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
