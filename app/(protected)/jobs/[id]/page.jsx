"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import JobForm from "@/components/forms/JobForm";
import Modal from "@/components/ui/Modal";
import DetailShell from "@/components/ui/DetailShell";
import {
  getJob,
  updateJob,
  updateJobStatus,
  uploadJobAttachment,
} from "@/services/jobs";
import { listPlacementIncomes } from "@/services/placementIncomes";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusPill";
import Select from "@/components/ui/Select";
import { getCandidateLabel } from "@/utils/entityLabels";

export default function JobDetailPage() {
  const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const apiBase = apiBaseRaw.replace(/\/$/, "");
  let apiOrigin = apiBase;
  try {
    apiOrigin = new URL(apiBase).origin;
  } catch {
    apiOrigin = apiBase;
  }

  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [tab, setTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [infoSubmitting, setInfoSubmitting] = useState(false);
  const [statusValue, setStatusValue] = useState("OPEN");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [candidateMap, setCandidateMap] = useState({});
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [placementIncomeRows, setPlacementIncomeRows] = useState([]);
  const [loadingPlacementIncome, setLoadingPlacementIncome] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const candidateMapRef = useRef(candidateMap);

  useEffect(() => {
    candidateMapRef.current = candidateMap;
  }, [candidateMap]);

  useEffect(() => {
    setPageMetadata("Job details", "View and edit job");
  }, [setPageMetadata]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getJob(id);
        console.log(data)
        console.log("job")
        if (!active) return;
        setJob(data);
        setStatusValue(data.status || "OPEN");
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load job",
          description:
            (error && error.message) || "An error occurred while loading the job.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, pushToast]);

  useEffect(() => {
    if (tab !== "hiring" && tab !== "payments") return;

    if (!job || !Array.isArray(job.joined_candidates) || job.joined_candidates.length === 0) {
      return;
    }

    let active = true;

    async function loadCandidates() {
      setLoadingCandidates(true);
      try {
        const ids = Array.from(
          new Set(
            job.joined_candidates
              .map((item) => (item && item.candidate_id != null ? String(item.candidate_id) : ""))
              .filter(Boolean)
          )
        );

        const missing = ids.filter((id) => !candidateMapRef.current[id]);
        if (missing.length === 0) return;

        const labels = await Promise.all(missing.map((cid) => getCandidateLabel(cid)));
        const updates = {};
        missing.forEach((cid, idx) => {
          updates[cid] = labels[idx] || `Candidate #${cid}`;
        });

        if (!active) return;
        setCandidateMap((prev) => ({ ...prev, ...updates }));
      } catch (error) {
        // If candidate lookup fails, we still show IDs / fallback labels
        if (!active) return;
        pushToast({
          title: "Failed to load candidate details",
          description:
            (error && error.message) ||
            "An error occurred while loading candidate information.",
        });
      } finally {
        if (active) setLoadingCandidates(false);
      }
    }

    loadCandidates();
    return () => {
      active = false;
    };
  }, [job, tab, pushToast]);

  useEffect(() => {
    if (tab !== "payments") return;
    if (!id) return;
    if (!job) return;

    const joinedCandidates = Array.isArray(job.joined_candidates)
      ? job.joined_candidates
      : [];

    if (joinedCandidates.length === 0) {
      setPlacementIncomeRows([]);
      return;
    }

    let active = true;

    async function loadPlacementIncome() {
      setLoadingPlacementIncome(true);
      try {
        const joinedCandidateIds = Array.from(
          new Set(
            joinedCandidates
              .map((item) => (item && item.candidate_id != null ? String(item.candidate_id) : ""))
              .filter(Boolean)
          )
        );

        let incomes = [];

        try {
          const result = await listPlacementIncomes({
            page: 1,
            limit: 100,
            job_id: String(id),
          });

          incomes = Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result)
            ? result
            : [];
        } catch {
          // Fallback: load per-candidate placement incomes
          const results = await Promise.all(
            joinedCandidateIds.map(async (candidateId) => {
              try {
                const res = await listPlacementIncomes({
                  page: 1,
                  limit: 100,
                  candidate_id: candidateId,
                  job_id: String(id),
                });

                const items = Array.isArray(res?.items)
                  ? res.items
                  : Array.isArray(res?.data)
                  ? res.data
                  : Array.isArray(res)
                  ? res
                  : [];

                return items;
              } catch {
                return [];
              }
            })
          );

          incomes = results.flat();
        }

        const byCandidate = {};
        (Array.isArray(incomes) ? incomes : [])
          .filter((inc) => {
            const cid = inc && inc.candidate_id != null ? String(inc.candidate_id) : "";
            if (!cid) return false;
            return joinedCandidateIds.includes(cid);
          })
          .forEach((inc) => {
            const candidateId = inc && inc.candidate_id != null ? String(inc.candidate_id) : "";
            if (!candidateId) return;

            const totalReceivable =
              typeof inc?.total_receivable === "number" ? inc.total_receivable : 0;
            const totalReceived =
              typeof inc?.total_received === "number" ? inc.total_received : 0;
            const balance = typeof inc?.balance === "number" ? inc.balance : 0;

            if (!byCandidate[candidateId]) {
              byCandidate[candidateId] = {
                candidate_id: candidateId,
                total_receivable: 0,
                total_received: 0,
                balance: 0,
                latest_due_date: null,
                count: 0,
              };
            }

            byCandidate[candidateId].total_receivable += totalReceivable;
            byCandidate[candidateId].total_received += totalReceived;
            byCandidate[candidateId].balance += balance;
            byCandidate[candidateId].count += 1;

            const due = inc?.due_date || inc?.dueDate || null;
            if (due) {
              const prev = byCandidate[candidateId].latest_due_date;
              if (!prev || String(due) > String(prev)) {
                byCandidate[candidateId].latest_due_date = due;
              }
            }
          });

        const rows = Object.values(byCandidate).sort((a, b) => {
          const av = typeof a.balance === "number" ? a.balance : 0;
          const bv = typeof b.balance === "number" ? b.balance : 0;
          return bv - av;
        });

        if (!active) return;
        setPlacementIncomeRows(rows);
      } catch (error) {
        if (!active) return;
        setPlacementIncomeRows([]);
        pushToast({
          title: "Failed to load placement income",
          description:
            (error && error.message) ||
            "An error occurred while loading placement income summary.",
        });
      } finally {
        if (active) setLoadingPlacementIncome(false);
      }
    }

    loadPlacementIncome();
    return () => {
      active = false;
    };
  }, [id, job, tab, pushToast]);

  function formatCurrency(value) {
    const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `₹${amount}`;
    }
  }

  function toAssetUrl(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (!apiOrigin) return trimmed;
    return `${apiOrigin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const d = dayjs(value);
    return d.isValid() ? d.format("YYYY-MM-DD") : String(value);
  }

  function formatRange(min, max) {
    if (min != null && max != null) return `${min} - ${max}`;
    if (min != null) return `${min}`;
    if (max != null) return `${max}`;
    return "-";
  }

  function formatList(arr) {
    return Array.isArray(arr) && arr.length
      ? arr.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center rounded-full bg-[var(--bg-muted)] px-2 py-[2px] text-[11px] font-medium text-slate-700"
          >
            {item}
          </span>
        ))
      : "-";
  }

  const displaySkills = useMemo(() => {
    if (Array.isArray(job?.skill_names)) return job.skill_names;
    if (Array.isArray(job?.skills)) return job.skills;
    return [];
  }, [job?.skill_names, job?.skills]);

  const displayEducation = useMemo(() => {
    if (Array.isArray(job?.education_names)) return job.education_names;
    if (Array.isArray(job?.education)) return job.education;
    return [];
  }, [job?.education_names, job?.education]);

  const displayDegree = useMemo(() => {
    if (Array.isArray(job?.degree_names)) return job.degree_names;
    if (Array.isArray(job?.degree)) return job.degree;
    return [];
  }, [job?.degree_names, job?.degree]);

  const displayJobCategories = useMemo(() => {
    if (Array.isArray(job?.job_category_names)) return job.job_category_names;
    if (Array.isArray(job?.job_categories)) return job.job_categories;
    return [];
  }, [job?.job_category_names, job?.job_categories]);

  const infoInitialValues = job
    ? {
        title: job.title || "",
        company_id: job.company_id ? String(job.company_id) : "",
        experience_level: job.experience_level || "",
        job_type: job.job_type || job.employment_type || "",
        status: job.status || "OPEN",
        gender: job.gender || "",
        location_area_id: job.location_area_id || "",
        job_categories: Array.isArray(job.job_categories) ? job.job_categories : [],
        contact_person: job.contact_person || "",
        num_vacancies:
          job.num_vacancies != null ? String(job.num_vacancies) : "",
        salary_min: job.salary_min != null ? String(job.salary_min) : "",
        salary_max: job.salary_max != null ? String(job.salary_max) : "",
        description: job.description || "",
        responsibilities: job.responsibilities || "",
        skills: Array.isArray(job.skills) ? job.skills : [],
        education: Array.isArray(job.education) ? job.education : [],
        degree: Array.isArray(job.degree) ? job.degree : [],
      }
    : null;

  async function handleInfoSubmit(values, { setError }) {
    setInfoSubmitting(true);
    try {
      const numVacancies = values.num_vacancies
        ? Number(values.num_vacancies)
        : undefined;
      const salaryMin = values.salary_min ? Number(values.salary_min) : undefined;
      const salaryMax = values.salary_max ? Number(values.salary_max) : undefined;

      const payload = {
        title: values.title,
        company_id: values.company_id,
        experience_level: values.experience_level || undefined,
        job_type: values.job_type || undefined,
        status: values.status || undefined,
        gender: values.gender || undefined,
        location_area_id: values.location_area_id || undefined,
        contact_person: values.contact_person || undefined,
        num_vacancies:
          Number.isFinite(numVacancies) && numVacancies > 0
            ? numVacancies
            : undefined,
        salary_min:
          Number.isFinite(salaryMin) && salaryMin >= 0 ? salaryMin : undefined,
        salary_max:
          Number.isFinite(salaryMax) && salaryMax >= 0 ? salaryMax : undefined,
        description: values.description || undefined,
        responsibilities: values.responsibilities || undefined,
        job_categories: Array.isArray(values.job_categories)
          ? values.job_categories.filter((item) => !!item && String(item).trim())
          : [],
        skills: Array.isArray(values.skills)
          ? values.skills.filter((item) => !!item && String(item).trim())
          : [],
        education: Array.isArray(values.education)
          ? values.education.filter((item) => !!item && String(item).trim())
          : [],
        degree: Array.isArray(values.degree)
          ? values.degree.filter((item) => !!item && String(item).trim())
          : [],
        is_active: job?.is_active !== false,
      };
      console.log(payload)

      const updated = await updateJob(id, payload);
      setJob(updated);

      pushToast({
        title: "Job updated",
        description: "The job was updated successfully.",
      });
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          if (!(field in values)) return;
          const message =
            Array.isArray(detail)
              ? String(detail[0])
              : typeof detail === "string"
              ? detail
              : String(detail || "Invalid value");
          setError(field, { type: "server", message });
        });
      } else if (error && error.status === 409) {
        pushToast({
          title: "Job conflict",
          description:
            (error && error.message) ||
            "The job could not be updated due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to update job",
          description:
            (error && error.message) ||
            "An error occurred while updating the job.",
        });
      }
    } finally {
      setInfoSubmitting(false);
    }
  }

  function openStatusModal() {
    if (!job) return;
    setStatusValue(job.status || statusValue || "OPEN");
    setStatusModalOpen(true);
  }

  function handleAttachmentFilesChange(event) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setAttachmentFiles(files);
  }

  async function handleUploadAttachments(event) {
    event.preventDefault();
    if (!id) return;

    if (!attachmentFiles.length) {
      pushToast({
        title: "Select files",
        description: "Choose one or more attachments to upload.",
      });
      return;
    }

    const formData = new FormData();
    attachmentFiles.forEach((file) => {
      formData.append("files", file);
    });

    setUploadingAttachments(true);
    try {
      await uploadJobAttachment(id, formData);
      pushToast({
        title: "Attachments uploaded",
        description: "Job attachments were uploaded successfully.",
      });
      setAttachmentFiles([]);

      try {
        const refreshed = await getJob(id);
        setJob(refreshed);
      } catch {
        // ignore refresh errors
      }
    } catch (error) {
      pushToast({
        title: "Failed to upload attachments",
        description:
          (error && error.message) ||
          "An error occurred while uploading job attachments.",
      });
    } finally {
      setUploadingAttachments(false);
    }
  }

  async function handleStatusSave() {
    if (!id) return;
    setStatusSubmitting(true);
    try {
      const payload = {
        status: statusValue || undefined,
      };
      const updated = await updateJobStatus(id, payload);
      setJob(updated);
      setStatusValue(updated.status || statusValue);
      pushToast({
        title: "Job status updated",
        description: "The job status was updated successfully.",
      });
    } catch (error) {
      if (error && error.status === 409) {
        pushToast({
          title: "Status conflict",
          description:
            (error && error.message) ||
            "The job status could not be updated due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to update status",
          description:
            (error && error.message) ||
            "An error occurred while updating the job status.",
        });
      }
    } finally {
      setStatusSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DetailShell
        title="Job"
        subtitle="Job record"
        loading
        loadingTitle="Loading job..."
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "attachments", label: "Attachments" },
          { value: "hiring", label: "Hiring" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
      />
    );
  }

  if (!job) {
    return (
      <DetailShell
        title="Job"
        subtitle="Job record"
        notFound
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "attachments", label: "Attachments" },
          { value: "hiring", label: "Hiring" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
      />
    );
  }

  const attachments = Array.isArray(job.attachments) ? job.attachments : [];
  const joinedCandidates = Array.isArray(job.joined_candidates)
    ? job.joined_candidates
    : [];

  return (
    <>
      <DetailShell
        title={job.title || "Job"}
        subtitle={
          job.company_name
            ? `${job.company_name}`
            : job.company_id
            ? `Company #${job.company_id}`
            : "Job record"
        }
        statusSlot={job.status ? <StatusPill status={job.status} /> : null}
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "attachments", label: "Attachments" },
          { value: "hiring", label: "Hiring" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTab("edit")}>
              Edit
            </Button>
            <Button type="button" onClick={openStatusModal}>
              Change status
            </Button>
            {job.company_id ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/companies/${job.company_id}`)}
              >
                View company
              </Button>
            ) : null}
          </>
        }
      >

      {tab === "overview" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Vacancies</div>
                <div className="text-lg font-bold text-slate-900">
                  {job.num_vacancies != null ? job.num_vacancies : job.vacancies != null ? job.vacancies : "-"}
                </div>
              </div>
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Salary</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatRange(job.salary_min, job.salary_max)}
                </div>
              </div>
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Location</div>
                <div className="text-sm font-semibold text-slate-900">
                  {job.location_area_name || job.location || job.location_area_id || "-"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-slate-600">Job type</div>
                <div className="mt-1 text-sm text-slate-900">{job.job_type || job.employment_type || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Experience level</div>
                <div className="mt-1 text-sm text-slate-900">{job.experience_level || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Gender preference</div>
                <div className="mt-1 text-sm text-slate-900">{job.gender || "-"}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-slate-600">Created</div>
                <div className="mt-1 text-sm text-slate-900">{formatDate(job.created_at || job.createdAt)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-semibold text-slate-600">Degree</div>
                <div className="mt-1 flex flex-wrap gap-1">{formatList(displayDegree)}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-600">Description</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                  {job.description || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Responsibilities</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                  {job.responsibilities || "-"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Skills</div>
                <div className="flex flex-wrap gap-1">{formatList(displaySkills)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Education</div>
                <div className="flex flex-wrap gap-1">{formatList(displayEducation)}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Job categories</div>
                <div className="flex flex-wrap gap-1">{formatList(displayJobCategories)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">Attachments</div>
                <div className="flex flex-wrap gap-2">
                  {attachments.length > 0 ? (
                    attachments.map((file, idx) => {
                      const url = toAssetUrl(file?.file_url || file?.url || file);
                      const label = file?.file_name || file?.name || `Attachment ${idx + 1}`;
                      return (
                        <a
                          key={`${label}-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-1 text-[11px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
                        >
                          <span className="text-[12px]">📎</span>
                          <span>{label}</span>
                        </a>
                      );
                    })
                  ) : (
                    <span className="text-sm text-slate-500">-</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold text-[var(--text)]">Placement income</h2>
            {loadingPlacementIncome && (
              <span className="text-[10px] text-slate-500">Loading placement income...</span>
            )}
          </div>

          {placementIncomeRows.length === 0 && !loadingPlacementIncome ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-[11px] text-slate-700">
              No placement income found for joined candidates.
            </div>
          ) : null}

          {placementIncomeRows.length > 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                  <div className="text-[10px] font-semibold text-slate-600">Total receivable</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(
                      placementIncomeRows.reduce(
                        (sum, r) => sum + (typeof r.total_receivable === "number" ? r.total_receivable : 0),
                        0
                      )
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                  <div className="text-[10px] font-semibold text-slate-600">Total received</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-700">
                    {formatCurrency(
                      placementIncomeRows.reduce(
                        (sum, r) => sum + (typeof r.total_received === "number" ? r.total_received : 0),
                        0
                      )
                    )}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                  <div className="text-[10px] font-semibold text-slate-600">Balance</div>
                  <div className="mt-1 text-sm font-semibold text-amber-700">
                    {formatCurrency(
                      placementIncomeRows.reduce(
                        (sum, r) => sum + (typeof r.balance === "number" ? r.balance : 0),
                        0
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-[10px] font-semibold text-slate-600">
                  <div className="min-w-[180px]">Candidate</div>
                  <div className="flex flex-1 justify-end gap-4">
                    <span className="w-24 text-right">Receivable</span>
                    <span className="w-24 text-right">Received</span>
                    <span className="w-24 text-right">Balance</span>
                    <span className="w-20 text-right">Due</span>
                  </div>
                </div>

                {placementIncomeRows.map((row) => {
                  const candidateId = row?.candidate_id ? String(row.candidate_id) : "";
                  const candidateLabel =
                    (candidateId && candidateMap[candidateId]) ||
                    `Candidate #${candidateId || "-"}`;

                  const dueText = row?.latest_due_date
                    ? dayjs(row.latest_due_date).format("YYYY-MM-DD")
                    : "-";

                  const paymentsHref = candidateId
                    ? `/payments?source=PLACEMENT_INCOME&job_id=${encodeURIComponent(
                        String(id)
                      )}&candidate_id=${encodeURIComponent(candidateId)}`
                    : `/payments?source=PLACEMENT_INCOME&job_id=${encodeURIComponent(String(id))}`;

                  return (
                    <div
                      key={candidateId || Math.random()}
                      className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                    >
                      <div className="flex min-w-[200px] flex-col">
                        <span className="font-semibold text-slate-800">
                          {candidateId ? (
                            <Link
                              href={`/candidates/${candidateId}`}
                              className="text-[var(--accent)] hover:underline"
                            >
                              {candidateLabel}
                            </Link>
                          ) : (
                            candidateLabel
                          )}
                        </span>
                        {row?.count ? (
                          <span className="text-[10px] text-slate-500">Payments: {row.count}</span>
                        ) : null}
                        <Link
                          href={paymentsHref}
                          className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                        >
                          View in ledger
                        </Link>
                      </div>
                      <div className="flex flex-1 justify-end gap-4 text-[11px] text-slate-800">
                        <span className="w-24 text-right">{formatCurrency(row.total_receivable)}</span>
                        <span className="w-24 text-right text-emerald-700">
                          {formatCurrency(row.total_received)}
                        </span>
                        <span className="w-24 text-right text-amber-700">
                          {formatCurrency(row.balance)}
                        </span>
                        <span className="w-20 text-right text-slate-600">{dueText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "edit" && infoInitialValues ? (
        <div className="mt-2 max-w-3xl rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <JobForm
            defaultValues={infoInitialValues}
            onSubmit={handleInfoSubmit}
            submitting={infoSubmitting}
            disableCompanyField
          />
        </div>
      ) : null}

      {tab === "attachments" ? (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
          <h2 className="text-xs font-semibold text-[var(--text)]">Attachments</h2>
          <form
            onSubmit={handleUploadAttachments}
            className="mt-2 flex flex-wrap items-center gap-3"
          >
            <input
              type="file"
              multiple
              onChange={handleAttachmentFilesChange}
              className="block w-full max-w-xs text-[11px] text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
            <Button type="submit" size="sm" disabled={uploadingAttachments}>
              {uploadingAttachments ? "Uploading..." : "Upload attachments"}
            </Button>
          </form>

          {attachments.length > 0 && (
            <div className="mt-3 space-y-2 text-[11px] text-slate-700">
              {attachments.map((file, index) => {
                const label =
                  file?.file_name ||
                  file?.filename ||
                  file?.name ||
                  file?.url ||
                  (file?.id ? `#${file.id}` : `Attachment ${index + 1}`);
                const key = file?.id != null ? String(file.id) : `${label}-${index}`;
                const href = file?.url ? toAssetUrl(file.url) : "";

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-2"
                  >
                    <span className="break-all font-medium text-slate-800">{label}</span>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === "hiring" ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold text-[var(--text)]">Hiring summary</h2>
            {loadingCandidates && (
              <span className="text-[10px] text-slate-500">Loading joined candidates...</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-700">
            <span className="font-medium">Joined candidates:</span>
            <span className="rounded-full bg-[var(--bg-muted)] px-2 py-[2px] text-[11px] font-semibold text-slate-800">
              {joinedCandidates.length}
            </span>
          </div>

          {joinedCandidates.length > 0 && (
            <div className="mt-2 space-y-2 text-[11px]">
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-[10px] font-semibold text-slate-600">
                <div className="min-w-[200px]">Candidate</div>
                <div className="flex flex-1 justify-end gap-4">
                  <span className="w-28 text-right">DOJ</span>
                  <span className="w-28 text-right">Salary</span>
                </div>
              </div>
              {joinedCandidates.map((item) => {
                const idKey =
                  item && item.candidate_id != null ? String(item.candidate_id) : null;
                const candidateNameFromMap = idKey ? candidateMap[idKey] : null;
                const candidateLabel =
                  candidateNameFromMap ||
                  item.candidate_name ||
                  item.candidate ||
                  item.candidate_title ||
                  (item.candidate_id
                    ? `Candidate #${item.candidate_id}`
                    : `#${item.id}`);

                const dojText = item.doj ? dayjs(item.doj).format("YYYY-MM-DD") : "-";

                const salaryText =
                  typeof item.salary === "number" ? item.salary : item.salary || "-";

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                  >
                    <div className="min-w-[200px] font-semibold text-slate-800">
                      {idKey ? (
                        <Link
                          href={`/candidates/${idKey}`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {candidateLabel}
                        </Link>
                      ) : (
                        candidateLabel
                      )}
                    </div>
                    <div className="flex flex-1 justify-end gap-4 text-[11px] text-slate-700">
                      <span className="w-28 text-right">{dojText}</span>
                      <span className="w-28 text-right">{salaryText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      </DetailShell>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change job status"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Status</label>
            <Select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
              <option value="OPEN">OPEN</option>
              <option value="DROPPED">DROPPED</option>
            </Select>
          </div>

          {statusValue === "DROPPED" ? (
            <div className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2 text-xs text-[var(--danger)]">
              Dropping a job may stop further hiring and affects reporting. Confirm carefully.
            </div>
          ) : (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-slate-700">
              Job status changes are tracked. Avoid changing historical context like company.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={statusSubmitting}
              onClick={async () => {
                await handleStatusSave();
                setStatusModalOpen(false);
              }}
            >
              {statusSubmitting ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
