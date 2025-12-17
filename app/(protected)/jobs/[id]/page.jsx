"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import JobForm from "@/components/forms/JobForm";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import {
  getJob,
  updateJob,
  updateJobStatus,
  uploadJobAttachment,
} from "@/services/jobs";
import { getCandidate } from "@/services/candidates";
import { listPlacementIncomes } from "@/services/placementIncomes";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusPill";
import Select from "@/components/ui/Select";

export default function JobDetailPage() {
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

        const updates = {};
        await Promise.all(
          missing.map(async (id) => {
            try {
              const c = await getCandidate(id);
              updates[id] = c?.full_name || c?.name || c?.candidate_name || `Candidate #${id}`;
            } catch {
              updates[id] = `Candidate #${id}`;
            }
          })
        );

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
  }, [job, pushToast]);

  useEffect(() => {
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
  }, [id, job, pushToast]);

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

  const infoInitialValues = job
    ? {
        title: job.title || "",
        company_id: job.company_id ? String(job.company_id) : "",
        experience_level: job.experience_level || "",
        employment_type: job.employment_type || "",
        location_area_id: job.location_area_id || "",
        num_vacancies:
          job.num_vacancies != null ? String(job.num_vacancies) : "",
        salary_min: job.salary_min != null ? String(job.salary_min) : "",
        salary_max: job.salary_max != null ? String(job.salary_max) : "",
        description: job.description || "",
        responsibilities: job.responsibilities || "",
        skills: Array.isArray(job.skills) ? job.skills : [],
        education: Array.isArray(job.education) ? job.education : [],
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

      const skillsArray = Array.isArray(values.skills)
        ? values.skills.filter((item) => !!item && String(item).trim())
        : [];

      const educationArray = Array.isArray(values.education)
        ? values.education.filter((item) => !!item && String(item).trim())
        : [];

      const payload = {
        title: values.title,
        company_id: values.company_id,
        experience_level: values.experience_level || undefined,
        employment_type: values.employment_type || undefined,
        location_area_id: values.location_area_id || undefined,
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
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        education: educationArray.length > 0 ? educationArray : undefined,
      };

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
    return <p className="text-xs text-slate-500">Loading job...</p>;
  }

  if (!job) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--danger)]">
        Job not found.
      </div>
    );
  }

  const attachments = Array.isArray(job.attachments) ? job.attachments : [];
  const joinedCandidates = Array.isArray(job.joined_candidates)
    ? job.joined_candidates
    : [];

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={job.title || "Job"}
        subtitle={
          job.company_name
            ? `${job.company_name}`
            : job.company_id
            ? `Company #${job.company_id}`
            : "Job record"
        }
        statusSlot={job.status ? <StatusPill status={job.status} /> : null}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTab("edit")}>
              Edit
            </Button>
            <Button type="button" onClick={openStatusModal}>
              Change status
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              Back
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "attachments", label: "Attachments" },
          { value: "hiring", label: "Hiring" },
          { value: "payments", label: "Payments" },
        ]}
      />

      {tab === "overview" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-slate-600">Vacancies</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {job.num_vacancies != null ? job.num_vacancies : job.vacancies != null ? job.vacancies : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Location</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {job.location_area_name || job.location || job.location_area_id || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Salary</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {typeof job.salary_min === "number" && typeof job.salary_max === "number"
                  ? `${job.salary_min} - ${job.salary_max}`
                  : typeof job.salary_min === "number"
                  ? String(job.salary_min)
                  : typeof job.salary_max === "number"
                  ? String(job.salary_max)
                  : "-"}
              </div>
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
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-[var(--text)]">
              Placement income summary
            </h2>
            {loadingPlacementIncome && (
              <span className="text-[10px] text-slate-500">Loading placement income...</span>
            )}
          </div>

          {placementIncomeRows.length === 0 && !loadingPlacementIncome ? (
            <div className="mt-2 rounded border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-2 text-[11px] text-slate-700">
              No placement income found for joined candidates.
            </div>
          ) : null}

          {placementIncomeRows.length > 0 ? (
            <>
              <div className="mt-1 grid gap-3 md:grid-cols-3">
                <div className="rounded border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
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
                <div className="rounded border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
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
                <div className="rounded border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
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

              <div className="mt-3 space-y-1 text-[11px]">
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
                      key={candidateId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-2"
                    >
                      <div className="min-w-[180px] font-medium text-slate-800">
                        {candidateLabel}
                        {row?.count ? (
                          <span className="ml-2 text-[10px] font-normal text-slate-500">
                            ({row.count})
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-700">
                        <span>
                          <span className="font-medium">Receivable:</span>{" "}
                          {formatCurrency(row.total_receivable)}
                        </span>
                        <span>
                          <span className="font-medium">Received:</span>{" "}
                          {formatCurrency(row.total_received)}
                        </span>
                        <span>
                          <span className="font-medium">Balance:</span>{" "}
                          {formatCurrency(row.balance)}
                        </span>
                        <span>
                          <span className="font-medium">Due:</span> {dueText}
                        </span>
                      </div>
                      <Link
                        href={paymentsHref}
                        className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                      >
                        View in ledger
                      </Link>
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
            <div className="mt-3 space-y-1 text-[11px] text-slate-700">
              {attachments.map((file, index) => {
                const label =
                  file?.file_name ||
                  file?.filename ||
                  file?.name ||
                  file?.url ||
                  (file?.id ? `#${file.id}` : `Attachment ${index + 1}`);
                const key = file?.id != null ? String(file.id) : `${label}-${index}`;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1"
                  >
                    <span className="break-all">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === "hiring" ? (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-[var(--text)]">
              Hiring summary
            </h2>
            {loadingCandidates && (
              <span className="text-[10px] text-slate-500">
                Loading joined candidates...
              </span>
            )}
          </div>

          <div className="mt-1 text-[11px] text-slate-700">
            <span className="font-medium">Joined candidates:</span>{" "}
            <span>{joinedCandidates.length}</span>
          </div>

          {joinedCandidates.length > 0 && (
            <div className="mt-2 space-y-1 text-[11px]">
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

                const dojText = item.doj ? dayjs(item.doj).format("YYYY-MM-DD") : null;

                const salaryText =
                  typeof item.salary === "number" ? item.salary : item.salary || null;

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1"
                  >
                    <div className="font-medium text-slate-800">{candidateLabel}</div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
                      {dojText && (
                        <span>
                          <span className="font-medium">DOJ:</span> {dojText}
                        </span>
                      )}
                      {salaryText && (
                        <span>
                          <span className="font-medium">Salary:</span> {salaryText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

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
    </div>
  );
}
