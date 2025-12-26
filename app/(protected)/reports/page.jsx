"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { listJobs, getJob, listJobRelatedCandidates } from "@/services/jobs";
import { listCandidates, getCandidate, listCandidateRelatedJobs } from "@/services/candidates";
import { listCompanies, getCompany } from "@/services/companies";
import {
  interviewCandidateJobsReport,
  interviewJobCandidatesReport,
} from "@/services/reports";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";
import Table from "@/components/table/Table";
import Button from "@/components/ui/Button";

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
  }
  return [];
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsPageInner />
    </Suspense>
  );
}

function ReportsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const companyIdParam = searchParams.get("company_id") || "";
  const jobIdParam = searchParams.get("job_id") || "";
  const candidateIdParam = searchParams.get("candidate_id") || "";

  const [jobCandidates, setJobCandidates] = useState([]);
  const [candidateJobs, setCandidateJobs] = useState([]);
  const [loadingJobCandidates, setLoadingJobCandidates] = useState(false);
  const [loadingCandidateJobs, setLoadingCandidateJobs] = useState(false);
  const [relatedCandidates, setRelatedCandidates] = useState([]);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loadingRelatedCandidates, setLoadingRelatedCandidates] = useState(false);
  const [loadingRelatedJobs, setLoadingRelatedJobs] = useState(false);

  const [companyValue, setCompanyValue] = useState(companyIdParam);
  const [jobValue, setJobValue] = useState(jobIdParam);
  const [aiJobId, setAiJobId] = useState("");
  const [aiCandidateId, setAiCandidateId] = useState("");
  const [includeInactiveCandidates, setIncludeInactiveCandidates] = useState(false);
  const [includeClosedJobs, setIncludeClosedJobs] = useState(false);

  const [jobLabelMap, setJobLabelMap] = useState({});
  const [candidateLabelMap, setCandidateLabelMap] = useState({});

  const jobLabelMapRef = useRef(jobLabelMap);
  const candidateLabelMapRef = useRef(candidateLabelMap);

  useEffect(() => {
    jobLabelMapRef.current = jobLabelMap;
  }, [jobLabelMap]);

  useEffect(() => {
    candidateLabelMapRef.current = candidateLabelMap;
  }, [candidateLabelMap]);

  useEffect(() => {
    setPageMetadata("Reports", "Job-wise and candidate-wise reports");
  }, [setPageMetadata]);

  useEffect(() => {
    setCompanyValue(companyIdParam);
  }, [companyIdParam]);

  useEffect(() => {
    setJobValue(jobIdParam);
  }, [jobIdParam]);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function resolveCompanyLabel({ value }) {
    if (!value) return "";
    try {
      const c = await getCompany(value);
      return getCompanyOptionLabel(c) || `Company #${value}`;
    } catch {
      return `Company #${value}`;
    }
  }

  async function loadCompanyOptions({ query, limit }) {
    const result = await listCompanies({
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
    });

    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];

    return items;
  }

  function getCompanyOptionLabel(item) {
    if (!item) return "";
    return item.name || item.company_name || item.title || item.label || "";
  }

  function getCompanyOptionValue(item) {
    if (!item) return "";
    return item.id != null
      ? String(item.id)
      : item.uuid != null
      ? String(item.uuid)
      : item.company_id != null
      ? String(item.company_id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  async function loadJobOptions({ query, limit }) {
    if (!companyValue) return [];
    const result = await listJobs({
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
      company_id: companyValue || undefined,
    });

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
    const cached = jobLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const j = await getJob(value);
      const label = j?.title || j?.name || `Job #${value}`;
      setJobLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return `Job #${value}`;
    }
  }

  function getJobOptionLabel(item) {
    if (!item) return "";
    return item.title || item.name || item.label || "";
  }

  function getJobOptionValue(item) {
    if (!item) return "";
    return item.uuid != null
      ? String(item.uuid)
      : item.job_id != null
      ? String(item.job_id)
      : item.id != null
      ? String(item.id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  async function loadCandidateOptions({ query, limit }) {
    const result = await listCandidates({
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
    });

    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];

    return items;
  }

  async function resolveCandidateLabel({ value }) {
    if (!value) return "";
    const cached = candidateLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const c = await getCandidate(value);
      const label = c?.full_name || c?.name || c?.candidate_name || `Candidate #${value}`;
      setCandidateLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return `Candidate #${value}`;
    }
  }

  function getCandidateOptionLabel(item) {
    if (!item) return "";
    return item.full_name || item.name || item.candidate_name || item.label || "";
  }

  function getCandidateOptionValue(item) {
    if (!item) return "";
    return item.uuid != null
      ? String(item.uuid)
      : item.candidate_id != null
      ? String(item.candidate_id)
      : item.id != null
      ? String(item.id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  useEffect(() => {
    let active = true;

    async function loadJobWiseCandidates() {
      if (!companyValue || !jobValue) {
        setJobCandidates([]);
        return;
      }
      setLoadingJobCandidates(true);
      try {
        const result = await interviewJobCandidatesReport({
          job_id: jobValue,
          page: 1,
          limit: 100,
        });
        if (!active) return;
        setJobCandidates(toArray(result));
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load job candidates",
          description:
            (error && error.message) ||
            "An error occurred while loading job-wise candidate data.",
        });
        setJobCandidates([]);
      } finally {
        if (active) setLoadingJobCandidates(false);
      }
    }

    loadJobWiseCandidates();
    return () => {
      active = false;
    };
  }, [companyValue, jobValue, pushToast]);

  useEffect(() => {
    let active = true;

    async function loadCandidateWiseJobs() {
      if (!candidateIdParam) {
        setCandidateJobs([]);
        return;
      }
      setLoadingCandidateJobs(true);
      try {
        const result = await interviewCandidateJobsReport({
          candidate_id: candidateIdParam,
          page: 1,
          limit: 100,
        });
        if (!active) return;
        setCandidateJobs(toArray(result));
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load candidate jobs",
          description:
            (error && error.message) ||
            "An error occurred while loading candidate-wise job data.",
        });
        setCandidateJobs([]);
      } finally {
        if (active) setLoadingCandidateJobs(false);
      }
    }

    loadCandidateWiseJobs();
    return () => {
      active = false;
    };
  }, [candidateIdParam, pushToast]);

  const jobWiseColumns = [
    {
      key: "candidate_name",
      label: "Candidate",
      render: (_value, row) => {
        const name =
          row?.candidate_name || row?.full_name || row?.name || row?.candidate?.name || "-";
        const id = row?.candidate_id != null ? String(row.candidate_id) : "";
        if (id) {
          return (
            <Link
              href={`/candidates/${id}`}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {name}
            </Link>
          );
        }
        return name;
      },
    },
    {
      key: "interviews_count",
      label: "Interviews",
      render: (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      },
    },
    {
      key: "latest_interview_status",
      label: "Latest status",
      render: (value) => value || "-",
    },
    {
      key: "last_interview_date",
      label: "Last interview",
      render: (value) => {
        if (!value) return "-";
        try {
          return dayjs(value).format("YYYY-MM-DD HH:mm");
        } catch {
          return String(value);
        }
      },
    },
    {
      key: "candidate_email",
      label: "Email",
      render: (_value, row) => row?.candidate_email || row?.email || row?.candidate?.email || "-",
    },
    {
      key: "candidate_phone",
      label: "Phone",
      render: (_value, row) =>
        row?.candidate_phone || row?.mobile_number || row?.phone || row?.candidate?.phone || "-",
    },
  ];

  const candidateWiseColumns = [
    {
      key: "job_title",
      label: "Job",
      render: (_value, row) => {
        const title = row?.job_title || row?.title || row?.name || row?.job?.title || "-";
        const id = row?.job_id != null ? String(row.job_id) : row?.id != null ? String(row.id) : "";
        if (id) {
          return (
            <Link
              href={`/jobs/${id}`}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {title}
            </Link>
          );
        }
        return title;
      },
    },
    {
      key: "company_name",
      label: "Company",
      render: (_value, row) => row?.company_name || row?.company?.name || row?.company || "-",
    },
    {
      key: "job_status",
      label: "Job status",
      render: (_value, row) => row?.job_status || row?.status || "-",
    },
    {
      key: "interviews_count",
      label: "Interviews",
      render: (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      },
    },
    {
      key: "latest_interview_status",
      label: "Latest status",
      render: (value) => value || "-",
    },
    {
      key: "last_interview_date",
      label: "Last interview",
      render: (value) => {
        if (!value) return "-";
        try {
          return dayjs(value).format("YYYY-MM-DD HH:mm");
        } catch {
          return String(value);
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Job wise candidate data</div>
            <div className="mt-1 text-xs text-slate-600">
              Select a company first, then a job to see candidates mapped to it.
            </div>
          </div>

          <div className="grid w-full gap-3 md:w-[520px] md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-slate-600">Company</div>
              <AsyncSearchSelect
                value={companyValue}
                onChange={(v) => {
                  setCompanyValue(v || "");
                  setParam("company_id", v || "");
                  setParam("job_id", ""); // reset job when company changes
                  setJobValue("");
                }}
                onSelectOption={(item) => {
                  const key = getCompanyOptionValue(item);
                  setCompanyValue(key || "");
                  setParam("company_id", key || "");
                  setParam("job_id", "");
                  setJobValue("");
                }}
                placeholder="Select a company"
                searchPlaceholder="Search companies..."
                loadOptions={loadCompanyOptions}
                resolveSelectedLabel={resolveCompanyLabel}
                getOptionLabel={getCompanyOptionLabel}
                getOptionValue={getCompanyOptionValue}
                allowClear
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-600">Job</div>
              <AsyncSearchSelect
                value={jobValue}
                onChange={(v) => {
                  setJobValue(v || "");
                  setParam("job_id", v || "");
                }}
                onSelectOption={(item) => {
                  const key = getJobOptionValue(item);
                  const label = getJobOptionLabel(item);
                  if (key && label) {
                    setJobLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                  }
                  setJobValue(key || "");
                  setParam("job_id", key || "");
                }}
                placeholder={companyValue ? "Select a job" : "Select a company first"}
                searchPlaceholder="Search jobs..."
                loadOptions={loadJobOptions}
                resolveSelectedLabel={resolveJobLabel}
                getOptionLabel={getJobOptionLabel}
                getOptionValue={getJobOptionValue}
                allowClear
                disabled={!companyValue}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          {!jobIdParam ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-xs text-slate-500">
              Select a job to view candidate data.
            </div>
          ) : (
            <>
              <div className="mb-2 text-xs text-slate-500">
                {loadingJobCandidates ? "Loading..." : null}
              </div>
              <Table columns={jobWiseColumns} rows={jobCandidates} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Candidate wise job data</div>
            <div className="mt-1 text-xs text-slate-600">
              Select a candidate to see jobs mapped to them.
            </div>
          </div>

          <div className="w-full md:w-[360px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Candidate</div>
            <AsyncSearchSelect
              value={candidateIdParam}
              onChange={(v) => setParam("candidate_id", v || "")}
              onSelectOption={(item) => {
                const key = getCandidateOptionValue(item);
                const label = getCandidateOptionLabel(item);
                if (key && label) {
                  setCandidateLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                }
              }}
              placeholder="Select a candidate"
              searchPlaceholder="Search candidates..."
              loadOptions={loadCandidateOptions}
              resolveSelectedLabel={resolveCandidateLabel}
              getOptionLabel={getCandidateOptionLabel}
              getOptionValue={getCandidateOptionValue}
              allowClear
            />
          </div>
        </div>

        <div className="mt-4">
          {!candidateIdParam ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-xs text-slate-500">
              Select a candidate to view job data.
            </div>
          ) : (
            <>
              <div className="mb-2 text-xs text-slate-500">
                {loadingCandidateJobs ? "Loading..." : null}
              </div>
              <Table columns={candidateWiseColumns} rows={candidateJobs} />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            ["job_id", "candidate_id"].forEach((k) => params.delete(k));
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
          }}
        >
          Clear report filters
        </Button>
      </div>
    </div>
  );
}
