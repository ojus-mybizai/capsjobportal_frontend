 "use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";
import Table from "@/components/table/Table";
import Button from "@/components/ui/Button";
import { listJobs, getJob, listJobRelatedCandidates } from "@/services/jobs";
import { listCandidates, getCandidate, listCandidateRelatedJobs } from "@/services/candidates";
import dayjs from "dayjs";

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
  }
  return [];
}

function prettyExperience(value) {
  if (!value) return "-";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

export default function AISearchPage() {
  return (
    <Suspense>
      <AISearchInner />
    </Suspense>
  );
}

function AISearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setPageMetadata = useUIStore((s) => s.setPageMetadata);
  const pushToast = useUIStore((s) => s.pushToast);

  const jobIdParam = searchParams.get("job_id") || "";
  const candidateIdParam = searchParams.get("candidate_id") || "";

  const [jobId, setJobId] = useState(jobIdParam);
  const [candidateId, setCandidateId] = useState(candidateIdParam);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [relatedCandidates, setRelatedCandidates] = useState([]);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    setPageMetadata("AI Search", "Find best matches for jobs and candidates");
  }, [setPageMetadata]);

  useEffect(() => {
    setJobId(jobIdParam);
  }, [jobIdParam]);

  useEffect(() => {
    setCandidateId(candidateIdParam);
  }, [candidateIdParam]);

  const jobColumns = useMemo(
    () => [
      {
        key: "title",
        label: "Job",
        render: (_v, row) => {
          const id = row?.id != null ? String(row.id) : "";
          const title = row?.title || row?.name || `Job #${id || "-"}`;
          return id ? (
            <Link href={`/jobs/${id}`} className="text-xs font-medium text-[var(--accent)] hover:underline">
              {title}
            </Link>
          ) : (
            title
          );
        },
      },
      { key: "company_name", label: "Company", render: (v) => v || "-" },
      { key: "status", label: "Status", render: (v) => v || "-" },
      { key: "experience_level", label: "Experience", render: (v) => prettyExperience(v) },
      {
        key: "location_area_id",
        label: "Location",
        render: (_v, row) => row?.location_area_name || row?.location || "-",
      },
      {
        key: "expected_salary",
        label: "Salary",
        render: (_v, row) => {
          const min = row?.salary_min != null ? row.salary_min : null;
          const max = row?.salary_max != null ? row.salary_max : null;
          if (min == null && max == null) return "-";
          if (min != null && max != null) return `${min} - ${max}`;
          if (min != null) return `${min}`;
          return `${max}`;
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (_v, row) => {
          const id = row?.id != null ? String(row.id) : "";
          if (!id || !candidateId) return <span className="text-xs text-slate-400">Select candidate first</span>;
          return (
            <Link
              href={`/interviews/new?job_id=${id}&candidate_id=${candidateId}`}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Schedule interview
            </Link>
          );
        },
      },
    ],
    [candidateId]
  );

  const candidateColumns = useMemo(
    () => [
      {
        key: "full_name",
        label: "Candidate",
        render: (_v, row) => {
          const id = row?.id != null ? String(row.id) : "";
          const name = row?.full_name || row?.name || row?.candidate_name || `Candidate #${id || "-"}`;
          return id ? (
            <Link href={`/candidates/${id}`} className="text-xs font-medium text-[var(--accent)] hover:underline">
              {name}
            </Link>
          ) : (
            name
          );
        },
      },
      { key: "email", label: "Email", render: (v) => v || "-" },
      { key: "mobile_number", label: "Mobile", render: (v) => v || "-" },
      { key: "status", label: "Status", render: (v) => v || "-" },
      { key: "experience_level", label: "Experience", render: (v) => prettyExperience(v) },
      {
        key: "location_area_id",
        label: "Location",
        render: (_v, row) => row?.location_area_name || row?.location || "-",
      },
      {
        key: "expected_salary",
        label: "Expected salary",
        render: (v) => (v == null ? "-" : v),
      },
      {
        key: "actions",
        label: "Actions",
        render: (_v, row) => {
          const id = row?.id != null ? String(row.id) : "";
          if (!id || !jobId) return <span className="text-xs text-slate-400">Select job first</span>;
          return (
            <Link
              href={`/interviews/new?job_id=${jobId}&candidate_id=${id}`}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Schedule interview
            </Link>
          );
        },
      },
    ],
    [jobId]
  );

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "");
  }

  async function loadJobOptions({ query, limit }) {
    const result = await listJobs({ page: 1, limit: limit || 20, q: (query || "").trim() || undefined });
    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];
    return items;
  }

  async function loadCandidateOptions({ query, limit }) {
    const result = await listCandidates({ page: 1, limit: limit || 20, q: (query || "").trim() || undefined });
    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];
    return items;
  }

  async function resolveJobLabel({ value }) {
    if (!value) return "";
    try {
      const job = await getJob(value);
      return job?.title || job?.name || `Job #${value}`;
    } catch {
      return `Job #${value}`;
    }
  }

  async function resolveCandidateLabel({ value }) {
    if (!value) return "";
    try {
      const candidate = await getCandidate(value);
      return candidate?.full_name || candidate?.name || candidate?.candidate_name || `Candidate #${value}`;
    } catch {
      return `Candidate #${value}`;
    }
  }

  async function fetchRelatedCandidates(selectedJobId, includeInactiveFlag) {
    if (!selectedJobId) {
      setRelatedCandidates([]);
      return;
    }
    setLoadingCandidates(true);
    try {
      const result = await listJobRelatedCandidates(selectedJobId, {
        include_inactive_candidates: includeInactiveFlag || undefined,
      });
      setRelatedCandidates(toArray(result));
    } catch (error) {
      pushToast({
        title: "Failed to load related candidates",
        description: (error && error.message) || "Could not load related candidates",
      });
      setRelatedCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function fetchRelatedJobs(selectedCandidateId, includeClosedFlag) {
    if (!selectedCandidateId) {
      setRelatedJobs([]);
      return;
    }
    setLoadingJobs(true);
    try {
      const result = await listCandidateRelatedJobs(selectedCandidateId, {
        include_closed: includeClosedFlag || undefined,
      });
      setRelatedJobs(toArray(result));
    } catch (error) {
      pushToast({
        title: "Failed to load related jobs",
        description: (error && error.message) || "Could not load related jobs",
      });
      setRelatedJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    fetchRelatedCandidates(jobId, includeInactive);
  }, [jobId, includeInactive]);

  useEffect(() => {
    fetchRelatedJobs(candidateId, includeClosed);
  }, [candidateId, includeClosed]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Related candidates by job</div>
            <div className="mt-1 text-xs text-slate-600">Pick a job to see matching candidates.</div>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-[480px] md:flex-row md:items-center md:justify-end">
            <AsyncSearchSelect
              value={jobId}
              onChange={(v) => {
                setJobId(v || "");
                setParam("job_id", v || "");
              }}
              onSelectOption={(item) => {
                const key = item?.id != null ? String(item.id) : item?.value ? String(item.value) : "";
                setJobId(key);
                setParam("job_id", key);
              }}
              placeholder="Select job"
              searchPlaceholder="Search jobs..."
              loadOptions={loadJobOptions}
              resolveSelectedLabel={resolveJobLabel}
              getOptionLabel={(j) => j?.title || j?.name || j?.label || ""}
              getOptionValue={(j) => (j?.id != null ? String(j.id) : j?.value ? String(j.value) : "")}
              allowClear
            />
            <label className="flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Include inactive candidates
            </label>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          {loadingCandidates ? "Loading related candidates..." : null}
        </div>
        <Table columns={candidateColumns} rows={relatedCandidates} />
      </div>

      <div className="rounded-xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Related jobs by candidate</div>
            <div className="mt-1 text-xs text-slate-600">Pick a candidate to see matching jobs.</div>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-[480px] md:flex-row md:items-center md:justify-end">
            <AsyncSearchSelect
              value={candidateId}
              onChange={(v) => {
                setCandidateId(v || "");
                setParam("candidate_id", v || "");
              }}
              onSelectOption={(item) => {
                const key = item?.id != null ? String(item.id) : item?.value ? String(item.value) : "";
                setCandidateId(key);
                setParam("candidate_id", key);
              }}
              placeholder="Select candidate"
              searchPlaceholder="Search candidates..."
              loadOptions={loadCandidateOptions}
              resolveSelectedLabel={resolveCandidateLabel}
              getOptionLabel={(c) => c?.full_name || c?.name || c?.candidate_name || c?.label || ""}
              getOptionValue={(c) => (c?.id != null ? String(c.id) : c?.value ? String(c.value) : "")}
              allowClear
            />
            <label className="flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={includeClosed}
                onChange={(e) => setIncludeClosed(e.target.checked)}
              />
              Include closed jobs
            </label>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          {loadingJobs ? "Loading related jobs..." : null}
        </div>
        <Table columns={jobColumns} rows={relatedJobs} />
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setJobId("");
            setCandidateId("");
            setIncludeInactive(false);
            setIncludeClosed(false);
            setRelatedCandidates([]);
            setRelatedJobs([]);
            router.replace("/reports/ai-search");
          }}
        >
          Clear selections
        </Button>
      </div>
    </div>
  );
}
