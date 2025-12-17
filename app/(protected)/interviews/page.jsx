"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { useInterviewsStore } from "@/stores/interviews";
import { getCompany, listCompanies } from "@/services/companies";
import { getJob, listJobs } from "@/services/jobs";
import { getCandidate, listCandidates } from "@/services/candidates";
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

  const companyIdParam = searchParams.get("company_id") || "";
  const jobIdParam = searchParams.get("job_id") || "";
  const candidateIdParam = searchParams.get("candidate_id") || "";
  const statusParam = searchParams.get("status") || "";
  const fromDateParam = searchParams.get("from_date") || "";
  const toDateParam = searchParams.get("to_date") || "";
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const filtersKey = [
    companyIdParam,
    jobIdParam,
    candidateIdParam,
    statusParam,
    fromDateParam,
    toDateParam,
  ].join("|");

  function setParam(key, value, { resetPage = true } = {}) {
    const params = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
    if (resetPage) params.set("page", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["company_id", "job_id", "candidate_id", "status", "from_date", "to_date", "page"].forEach(
      (k) => params.delete(k)
    );
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function handleDeleteInterview(row) {
    const id = row && row.id != null ? String(row.id) : "";
    if (!id) return;

    const confirmed =
      typeof window !== "undefined" &&
      window.confirm("Delete this interview? This action cannot be undone.");
    if (!confirmed) return;

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
  }

  const [companyMap, setCompanyMap] = useState({});
  const [jobMap, setJobMap] = useState({});
  const [candidateMap, setCandidateMap] = useState({});

  const companyMapRef = useRef(companyMap);
  const jobMapRef = useRef(jobMap);
  const candidateMapRef = useRef(candidateMap);

  useEffect(() => {
    companyMapRef.current = companyMap;
  }, [companyMap]);

  useEffect(() => {
    jobMapRef.current = jobMap;
  }, [jobMap]);

  useEffect(() => {
    candidateMapRef.current = candidateMap;
  }, [candidateMap]);

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
          from_date: fromDateParam ? `${fromDateParam}T00:00:00` : undefined,
          to_date: toDateParam ? `${toDateParam}T23:59:59` : undefined,
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

  useEffect(() => {
    let active = true;

    async function ensureRowLabels() {
      const rows = Array.isArray(items) ? items : [];

      const companyIds = Array.from(
        new Set(
          rows
            .map((r) => (r && r.company_id != null ? String(r.company_id) : ""))
            .filter(Boolean)
        )
      );

      const jobIds = Array.from(
        new Set(
          rows
            .map((r) => (r && r.job_id != null ? String(r.job_id) : ""))
            .filter(Boolean)
        )
      );

      const candidateIds = Array.from(
        new Set(
          rows
            .map((r) => (r && r.candidate_id != null ? String(r.candidate_id) : ""))
            .filter(Boolean)
        )
      );

      const missingCompanies = companyIds.filter((id) => !companyMapRef.current[id]);
      const missingJobs = jobIds.filter((id) => !jobMapRef.current[id]);
      const missingCandidates = candidateIds.filter((id) => !candidateMapRef.current[id]);

      await Promise.all([
        Promise.all(
          missingCompanies.map(async (id) => {
            try {
              const c = await getCompany(id);
              if (!active) return;
              setCompanyMap((prev) => ({
                ...prev,
                [id]: c?.name || c?.title || c?.company_name || `Company #${id}`,
              }));
            } catch {
              if (!active) return;
              setCompanyMap((prev) => ({ ...prev, [id]: `Company #${id}` }));
            }
          })
        ),
        Promise.all(
          missingJobs.map(async (id) => {
            try {
              const j = await getJob(id);
              if (!active) return;
              setJobMap((prev) => ({
                ...prev,
                [id]: j?.title || j?.name || `Job #${id}`,
              }));
            } catch {
              if (!active) return;
              setJobMap((prev) => ({ ...prev, [id]: `Job #${id}` }));
            }
          })
        ),
        Promise.all(
          missingCandidates.map(async (id) => {
            try {
              const c = await getCandidate(id);
              if (!active) return;
              setCandidateMap((prev) => ({
                ...prev,
                [id]:
                  c?.full_name || c?.name || c?.candidate_name || `Candidate #${id}`,
              }));
            } catch {
              if (!active) return;
              setCandidateMap((prev) => ({ ...prev, [id]: `Candidate #${id}` }));
            }
          })
        ),
      ]);
    }

    ensureRowLabels();
    return () => {
      active = false;
    };
  }, [items]);

  async function loadCompanyOptions({ query, limit }) {
    const result = await listCompanies({ page: 1, limit: limit || 20, q: query || "" });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
  }

  async function resolveCompanyLabel({ value }) {
    const company = await getCompany(value);
    if (!company) return "";
    return company.name || company.title || company.company_name || `Company #${value}`;
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

  async function resolveJobLabel({ value }) {
    const job = await getJob(value);
    if (!job) return "";
    return job.title || job.name || `Job #${value}`;
  }

  async function loadCandidateOptions({ query, limit }) {
    const result = await listCandidates({ page: 1, limit: limit || 20, q: query || "" });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
  }

  async function resolveCandidateLabel({ value }) {
    const candidate = await getCandidate(value);
    if (!candidate) return "";
    return (
      candidate.full_name ||
      candidate.name ||
      candidate.candidate_name ||
      `Candidate #${value}`
    );
  }

  const columns = [
    {
      key: "candidate_id",
      label: "Candidate",
      render: (value, row) => {
        const id = value || row.candidate_id;
        const label = id ? candidateMap[String(id)] : "";
        return label || (id ? `Candidate #${id}` : "-");
      },
    },
    {
      key: "job_id",
      label: "Job",
      render: (value, row) => {
        const id = value || row.job_id;
        const label = id ? jobMap[String(id)] : "";
        return label || (id ? `Job #${id}` : "-");
      },
    },
    {
      key: "company_id",
      label: "Company",
      render: (value, row) => {
        const id = value || row.company_id;
        const label = id ? companyMap[String(id)] : "";
        return label || (id ? `Company #${id}` : "-");
      },
    },
    {
      key: "interview_date",
      label: "Interview date",
      render: (value) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "Not set",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusPill status={value} />,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <div className="w-40">
            <AsyncSearchSelect
              value={companyIdParam}
              onChange={(v) => {
                setParam("company_id", v || "");
                setParam("job_id", "");
              }}
              placeholder="All companies"
              searchPlaceholder="Search companies..."
              loadOptions={loadCompanyOptions}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) =>
                c.name || c.title || c.company_name || `Company #${c.id}`
              }
              resolveSelectedLabel={resolveCompanyLabel}
              allowClear
            />
          </div>
          <div className="w-40">
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
              resolveSelectedLabel={resolveJobLabel}
              allowClear={!!companyIdParam}
            />
          </div>
          <div className="w-40">
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
              resolveSelectedLabel={resolveCandidateLabel}
              allowClear
            />
          </div>
          <div className="w-40">
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
          <div className="w-40">
            <Input
              type="date"
              value={fromDateParam}
              onChange={(e) => {
                setParam("from_date", e.target.value);
              }}
            />
          </div>
          <div className="w-auto px-1 text-slate-400">-</div>
          <div className="w-40">
            <Input
              type="date"
              value={toDateParam}
              onChange={(e) => {
                setParam("to_date", e.target.value);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearFilters()}
          >
            Clear
          </Button>
          {loading && <span>Loading interviews...</span>}
        </div>
        <Link href="/interviews/new">
          <Button size="sm">Schedule interview</Button>
        </Link>
      </div>

      <PaginatedTable
        columns={columns}
        rows={items || []}
        page={page}
        limit={PAGE_SIZE}
        total={total || 0}
        onPageChange={(nextPage) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("page", String(nextPage));
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }}
        renderActions={(row) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/interviews/${row.id}`}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View / Edit
            </Link>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleDeleteInterview(row)}
            >
              Delete
            </Button>
          </div>
        )}
      />
    </div>
  );
}
