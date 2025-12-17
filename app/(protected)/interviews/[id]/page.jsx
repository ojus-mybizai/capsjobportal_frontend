"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { useInterviewsStore } from "@/stores/interviews";
import { getCompany } from "@/services/companies";
import { getJob } from "@/services/jobs";
import { getCandidate } from "@/services/candidates";
import { useJobsStore } from "@/stores/jobs";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusPill";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import InterviewForm from "@/components/interviews/InterviewForm";
import Modal from "@/components/ui/Modal";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

 const InterviewStatusUpdateSchema = z
  .object({
    status: z.enum([
      "SCHEDULED",
      "ON_HOLD",
      "REJECTED_BY_EMPLOYER",
      "REJECTED_BY_CANDIDATE",
      "JOINED",
    ]),
    doj: z.string().optional(),
    salary: z
      .preprocess((value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        const n = Number(value);
        return Number.isNaN(n) ? undefined : n;
      }, z.number().int().positive().optional())
      .optional(),
    total_receivable: z
      .preprocess((value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        const n = Number(value);
        return Number.isNaN(n) ? undefined : n;
      }, z.number().int().positive().optional())
      .optional(),
    due_date: z.string().optional(),
    remarks: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "JOINED") {
      if (!val.doj) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["doj"],
          message: "DOJ is required when status is JOINED",
        });
      }
      if (!val.salary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["salary"],
          message: "Salary is required when status is JOINED",
        });
      }
      if (!val.total_receivable) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["total_receivable"],
          message: "Total receivable is required when status is JOINED",
        });
      }
      if (!val.due_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["due_date"],
          message: "Due date is required when status is JOINED",
        });
      }
    }
  });

export default function InterviewDetailPage() {
  const params  = useParams();
  const id = params.id;
  const router = useRouter();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const getInterview = useInterviewsStore((state) => state.get);
  const updateInterview = useInterviewsStore((state) => state.update);
  const updateStatus = useInterviewsStore((state) => state.updateStatus);

  const [companyLabel, setCompanyLabel] = useState("-");
  const [jobLabel, setJobLabel] = useState("-");
  const [candidateLabel, setCandidateLabel] = useState("-");

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState(null);
  const [submittingMain, setSubmittingMain] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  const listInterviews = useInterviewsStore((state) => state.list);
  const listParams = useInterviewsStore((state) => state.listParams || {});

  const refreshJob = useJobsStore((state) => state.get);

  useEffect(() => {
    setPageMetadata("Interview details", "View and edit interview");
  }, [setPageMetadata]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getInterview(id, { force: true });
        if (!active) return;
        setInterview(data);

        try {
          if (data && data.company_id != null) {
            const c = await getCompany(data.company_id);
            if (active) {
              setCompanyLabel(
                c?.name || c?.title || c?.company_name || `Company #${data.company_id}`
              );
            }
          } else if (active) {
            setCompanyLabel("-");
          }
        } catch {
          if (active) setCompanyLabel(data?.company_id ? `Company #${data.company_id}` : "-");
        }

        try {
          if (data && data.job_id != null) {
            const j = await getJob(data.job_id);
            if (active) {
              setJobLabel(j?.title || j?.name || `Job #${data.job_id}`);
            }
          } else if (active) {
            setJobLabel("-");
          }
        } catch {
          if (active) setJobLabel(data?.job_id ? `Job #${data.job_id}` : "-");
        }

        try {
          if (data && data.candidate_id != null) {
            const c = await getCandidate(data.candidate_id);
            if (active) {
              setCandidateLabel(
                c?.full_name || c?.name || c?.candidate_name || `Candidate #${data.candidate_id}`
              );
            }
          } else if (active) {
            setCandidateLabel("-");
          }
        } catch {
          if (active) setCandidateLabel(data?.candidate_id ? `Candidate #${data.candidate_id}` : "-");
        }
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load interview",
          description:
            (error && error.message) ||
            "An error occurred while loading the interview.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id, getInterview, pushToast]);

  const defaultFormValues = useMemo(() => {
    if (!interview) return null;
    return {
      companyId: interview.company_id ? String(interview.company_id) : "",
      jobId: interview.job_id ? String(interview.job_id) : "",
      candidateId: interview.candidate_id ? String(interview.candidate_id) : "",
      interviewDate: interview.interview_date
        ? dayjs(interview.interview_date).format("YYYY-MM-DDTHH:mm")
        : "",
      remarks: interview.remarks || "",
      status: interview.status || "SCHEDULED",
    };
  }, [interview]);

  const headerTitle = useMemo(() => {
    return candidateLabel !== "-" ? candidateLabel : "Interview";
  }, [candidateLabel]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(InterviewStatusUpdateSchema),
    defaultValues: {
      status: interview?.status || "SCHEDULED",
      doj: "",
      salary: "",
      total_receivable: "",
      due_date: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (!interview) return;
    reset({
      status: interview.status || "SCHEDULED",
      doj: "",
      salary: "",
      total_receivable: "",
      due_date: "",
      remarks: "",
    });
  }, [interview, reset]);

  const statusValue = watch("status");

  async function handleMainSubmit(values, { setError: setFormError }) {
    if (!interview) return;
    setSubmittingMain(true);
    try {
      let interviewDateIso;
      if (values.interviewDate) {
        const d = new Date(values.interviewDate);
        if (!Number.isNaN(d.getTime())) {
          interviewDateIso = d.toISOString();
        }
      }

      const payload = {
        company_id: values.companyId,
        job_id: values.jobId,
        candidate_id: values.candidateId,
        interview_date: interviewDateIso || undefined,
        remarks: values.remarks || undefined,
        // Status is managed via the dedicated status change flow
      };

      const updated = await updateInterview(id, payload);
      setInterview(updated);
      pushToast({
        title: "Interview updated",
        description: "The interview was updated successfully.",
      });
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        const fieldMap = {
          company_id: "companyId",
          job_id: "jobId",
          candidate_id: "candidateId",
          interview_date: "interviewDate",
          remarks: "remarks",
        };

        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          const mappedField = fieldMap[field] || field;
          if (!(mappedField in values)) return;
          const message =
            Array.isArray(detail)
              ? String(detail[0])
              : typeof detail === "string"
              ? detail
              : String(detail || "Invalid value");
          setFormError(mappedField, { type: "server", message });
        });
      } else if (error && error.status === 409) {
        pushToast({
          title: "Interview conflict",
          description:
            (error && error.message) ||
            "The interview could not be updated due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to update interview",
          description:
            (error && error.message) ||
            "An error occurred while updating the interview.",
        });
      }
    } finally {
      setSubmittingMain(false);
    }
  }

  async function handleStatusSubmit(values) {
    setSubmittingStatus(true);
    try {
      const payload = {
        status: values.status,
      };

      if (values.status === "JOINED") {
        if (values.doj) {
          payload.doj = new Date(values.doj).toISOString();
        }
        if (values.salary) {
          payload.salary = Number(values.salary);
        }

        if (values.total_receivable) {
          payload.placement_total_receivable = Number(values.total_receivable);
        }
        if (values.due_date) {
          payload.placement_due_date = `${values.due_date}T00:00:00Z`;
        }
        if (values.remarks) {
          payload.placement_remarks = String(values.remarks);
        }
      }

      const updated = await updateStatus(id, payload);
      setInterview(updated);
      // Refresh related job details and interview list to reflect JOINED side effects
      try {
        const jobId = updated.job_id || interview.job_id;
        if (jobId) {
          await refreshJob(jobId, { force: true });
        }
      } catch {
        // ignore job refresh errors
      }

      try {
        await listInterviews(listParams);
      } catch {
        // ignore list refresh errors
      }

      setStatusModalOpen(false);
      pushToast({
        title: "Status updated",
        description: "The interview status was updated successfully.",
      });
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        const fieldMap = {
          status: "status",
          doj: "doj",
          salary: "salary",
          placement_total_receivable: "total_receivable",
          placement_due_date: "due_date",
          placement_remarks: "remarks",
          total_receivable: "total_receivable",
          due_date: "due_date",
          remarks: "remarks",
        };

        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          const mappedField = fieldMap[field] || field;
          const message =
            Array.isArray(detail)
              ? String(detail[0])
              : typeof detail === "string"
              ? detail
              : String(detail || "Invalid value");
          setError(mappedField, { type: "server", message });
        });
      } else if (error && error.status === 409) {
        pushToast({
          title: "Candidate already joined",
          description:
            (error && error.message) ||
            "Candidate already marked as joined for this job.",
        });
      } else {
        pushToast({
          title: "Failed to update status",
          description:
            (error && error.message) ||
            "An error occurred while updating the interview status.",
        });
      }
    } finally {
      setSubmittingStatus(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Loading interview...</p>;
  }

  if (!interview) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--danger)]">
        Interview not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={headerTitle}
        subtitle={`${jobLabel} • ${companyLabel}`}
        statusSlot={interview.status ? <StatusPill status={interview.status} /> : null}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTab("edit")}>
              Edit
            </Button>
            <Button type="button" onClick={() => setStatusModalOpen(true)}>
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
        ]}
      />

      {tab === "overview" ? (
        <div className="max-w-3xl rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-600">Company</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{companyLabel}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Job</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{jobLabel}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Candidate</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{candidateLabel}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Interview date</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {interview.interview_date
                  ? dayjs(interview.interview_date).format("YYYY-MM-DD HH:mm")
                  : "Not set"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-600">Remarks</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {interview.remarks ? interview.remarks : "-"}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "edit" && defaultFormValues ? (
        <div className="max-w-3xl space-y-4">
          <InterviewForm
            defaultValues={defaultFormValues}
            onSubmit={handleMainSubmit}
            submitting={submittingMain}
            disableStatusField
            disableCompanyField
            disableJobField
            disableCandidateField
          />
        </div>
      ) : null}

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change interview status"
        size="md"
      >
        <form onSubmit={handleSubmit(handleStatusSubmit)} className="space-y-3 text-xs">
          <p className="text-[11px] text-slate-600">
            Update the interview status. When marking as <span className="font-semibold">joined</span>,
            you must provide the date of joining and salary. This may consume a job vacancy
            and add the candidate to the joined list.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">Status</label>
              <Select {...register("status")}>
                <option value="SCHEDULED">scheduled</option>
                <option value="ON_HOLD">on hold</option>
                <option value="REJECTED_BY_EMPLOYER">rejected by employer</option>
                <option value="REJECTED_BY_CANDIDATE">rejected by candidate</option>
                <option value="JOINED">joined</option>
              </Select>
              {errors.status && (
                <p className="mt-1 text-[11px] text-[var(--danger)]">
                  {errors.status.message}
                </p>
              )}
            </div>

            {statusValue === "JOINED" && (
              <>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Date of joining
                  </label>
                  <Input type="datetime-local" {...register("doj")} />
                  {errors.doj && (
                    <p className="mt-1 text-[11px] text-[var(--danger)]">
                      {errors.doj.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Salary
                  </label>
                  <Input type="number" min="0" step="1" {...register("salary")} />
                  {errors.salary && (
                    <p className="mt-1 text-[11px] text-[var(--danger)]">
                      {errors.salary.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {statusValue === "JOINED" && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Total receivable
                </label>
                <Input type="number" min="0" step="1" {...register("total_receivable")} />
                {errors.total_receivable && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">
                    {errors.total_receivable.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">Due date</label>
                <Input type="date" {...register("due_date")} />
                {errors.due_date && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">
                    {errors.due_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">Remarks</label>
                <Input type="text" placeholder="Placement fee notes" {...register("remarks")} />
                {errors.remarks && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">
                    {errors.remarks.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {statusValue === "JOINED" && (
            <div className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2 text-[11px] text-[var(--danger)]">
              This will mark the candidate as joined and consume a job vacancy. This action
              cannot be undone.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submittingStatus}>
              {submittingStatus ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
