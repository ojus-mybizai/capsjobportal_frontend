"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { useInterviewsStore } from "@/stores/interviews";
import { listCompanies } from "@/services/companies";
import { listJobs } from "@/services/jobs";
import { listCandidates } from "@/services/candidates";
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
    const result = await listCompanies({ page: 1, limit: limit || 20, q: query || "" });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
  }

  async function loadJobOptions({ query, limit }) {
    const result = await listJobs({
      page: 1,
      limit: limit || 20,
      q: query || "",
      company_id: companyIdParam || undefined,
    });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
  }

  async function loadCandidateOptions({ query, limit }) {
    const result = await listCandidates({ page: 1, limit: limit || 20, q: query || "" });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
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
        value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "Not set",
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
      <div className="rounded-2xl bg-[var(--panel)] p-4 ring-1 ring-[var(--border)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3 text-[13px] text-[var(--muted-text)]">
          <div className="w-52 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <AsyncSearchSelect
              value={companyIdParam}
              onChange={(v) => {
                patchParams({ company_id: v || "", job_id: "" });
              }}
              placeholder="All companies"
              searchPlaceholder="Search companies..."
              loadOptions={loadCompanyOptions}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) =>
                c.name || c.title || c.company_name || `Company #${c.id}`
              }
              allowClear
            />
          </div>
          <div className="w-52 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
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
              getOptionLabel={(j) => j.title || j.name || `Job #${j.id}`}
              allowClear={!!companyIdParam}
            />
          </div>
          <div className="w-52 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <AsyncSearchSelect
              value={candidateIdParam}
              onChange={(v) => {
                setParam("candidate_id", v || "");
              }}
              placeholder="All candidates"
              searchPlaceholder="Search candidates..."
              loadOptions={loadCandidateOptions}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) =>
                c.full_name || c.name || c.candidate_name || `Candidate #${c.id}`
              }
              allowClear
            />
          </div>
          <div className="w-48 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
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
          <div className="w-44 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <Input
              type="date"
              value={fromDateParam}
              onChange={(e) => {
                setParam("from_date", e.target.value);
              }}
            />
          </div>
          <div className="w-auto px-1 text-[var(--muted-text)]">-</div>
          <div className="w-44 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <Input
              type="date"
              value={toDateParam}
              onChange={(e) => {
                setParam("to_date", e.target.value);
              }}
            />
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Less filters" : "More filters"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearFilters()}
          >
            Clear
          </Button>

          {loading && <span className="text-[13px] text-[var(--muted-text)]">Loading interviews...</span>}
            </div>
            <Link href="/interviews/new">
              <Button size="sm">Schedule interview</Button>
            </Link>
          </div>

          {showAdvanced ? (
            <div className="flex flex-col gap-3 rounded-xl bg-[var(--bg-muted)] p-3 md:flex-row md:flex-wrap md:items-end">
              <div className="min-w-[280px]">
                <div className="mb-1 text-[13px] font-medium text-[var(--muted-text)]">Search remarks</div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="q…"
                />
              </div>

              <div className="min-w-[170px]">
                <div className="mb-1 text-[13px] font-medium text-[var(--muted-text)]">Created from</div>
                <Input
                  type="date"
                  value={createdFromParam}
                  onChange={(e) => setParam("created_from", e.target.value)}
                />
              </div>

              <div className="min-w-[170px]">
                <div className="mb-1 text-[13px] font-medium text-[var(--muted-text)]">Created to</div>
                <Input
                  type="date"
                  value={createdToParam}
                  onChange={(e) => setParam("created_to", e.target.value)}
                />
              </div>

              <div className="min-w-[160px]">
                <div className="mb-1 text-[13px] font-medium text-[var(--muted-text)]">Active</div>
                <Select value={isActiveParam} onChange={(e) => setParam("is_active", e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>

              <div className="min-w-[200px]">
                <div className="mb-1 text-[13px] font-medium text-[var(--muted-text)]">Sort by</div>
                <Select value={sortByParam} onChange={(e) => setParam("sort_by", e.target.value)}>
                  <option value="">created_at</option>
                  <option value="updated_at">updated_at</option>
                  <option value="interview_date">interview_date</option>
                  <option value="status">status</option>
                </Select>
              </div>

              <div className="min-w-[140px]">
                <div className="mb-1 text-[13px] font-medium text-[var(--muted-text)]">Order</div>
                <Select value={orderParam} onChange={(e) => setParam("order", e.target.value)}>
                  <option value="">desc</option>
                  <option value="asc">asc</option>
                  <option value="desc">desc</option>
                </Select>
              </div>
            </div>
          ) : null}
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
