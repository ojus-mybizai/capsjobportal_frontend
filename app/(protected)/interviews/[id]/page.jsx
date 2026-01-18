"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { useInterviewsStore } from "@/stores/interviews";
import { useJobsStore } from "@/stores/jobs";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusPill";
import Modal from "@/components/ui/Modal";
import DetailShell from "@/components/ui/DetailShell";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getCandidateLabel, getCompanyLabel, getJobLabel } from "@/utils/entityLabels";
import {
  getPlacementIncome,
  createPlacementIncome,
  updatePlacementIncome,
  listPlacementIncomes,
} from "@/services/placementIncomes";

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
  const [remarksDraft, setRemarksDraft] = useState("");
  const [submittingRemarks, setSubmittingRemarks] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [placementIncome, setPlacementIncome] = useState(null);
  const [loadingPlacementIncome, setLoadingPlacementIncome] = useState(false);
  const [placementIncomeModalOpen, setPlacementIncomeModalOpen] = useState(false);
  const [savingPlacementIncome, setSavingPlacementIncome] = useState(false);
  const [placementIncomeTotalReceivable, setPlacementIncomeTotalReceivable] = useState("");
  const [placementIncomeDueDate, setPlacementIncomeDueDate] = useState("");
  const [placementIncomeRemarks, setPlacementIncomeRemarks] = useState("");

  const listInterviews = useInterviewsStore((state) => state.list);
  const listParams = useInterviewsStore((state) => state.listParams || {});

  const refreshJob = useJobsStore((state) => state.get);

  useEffect(() => {
    setPageMetadata("Interview details", "View interview details");
  }, [setPageMetadata]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getInterview(id, { force: true });
        if (!active) return;
        setInterview(data);
        setRemarksDraft(data?.remarks || "");

        const [nextCompanyLabel, nextJobLabel, nextCandidateLabel] = await Promise.all([
          getCompanyLabel(data?.company_id),
          getJobLabel(data?.job_id),
          getCandidateLabel(data?.candidate_id),
        ]);

        if (!active) return;
        setCompanyLabel(nextCompanyLabel);
        setJobLabel(nextJobLabel);
        setCandidateLabel(nextCandidateLabel);

        // Load placement income if exists
        if (data?.placement_income_id) {
          try {
            const income = await getPlacementIncome(data.placement_income_id);
            if (!active) return;
            setPlacementIncome(income);
          } catch {
            // Placement income may not exist, ignore
          }
        } else {
          // Check if placement income exists for this interview
          try {
            const result = await listPlacementIncomes({
              interview_id: id,
              limit: 1,
            });
            if (!active) return;
            if (result?.items && result.items.length > 0) {
              setPlacementIncome(result.items[0]);
            }
          } catch {
            // Ignore errors
          }
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
    },
  });

  useEffect(() => {
    if (!interview) return;
    reset({
      status: interview.status || "SCHEDULED",
      doj: "",
      salary: "",
    });
    setRemarksDraft(interview.remarks || "");
  }, [interview, reset]);

  const statusValue = watch("status");

  async function handleRemarksSave() {
    if (!interview) return;
    setSubmittingRemarks(true);
    try {
      // Only update remarks; do not touch DOJ/salary/status here.
      const updated = await updateInterview(id, {
        remarks: remarksDraft || "",
      });
      setInterview(updated);
      setRemarksDraft(updated.remarks || "");
      pushToast({
        title: "Remarks updated",
        description: "Remarks saved successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to update remarks",
        description:
          (error && error.message) || "An error occurred while updating the interview remarks.",
      });
    } finally {
      setSubmittingRemarks(false);
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

  async function handlePlacementIncomeSave() {
    if (!interview) return;
    setSavingPlacementIncome(true);
    try {
      const totalReceivable = Number(placementIncomeTotalReceivable);
      if (!Number.isFinite(totalReceivable) || totalReceivable <= 0) {
        throw new Error("Total receivable must be greater than 0");
      }

      const dueDate = placementIncomeDueDate
        ? new Date(`${placementIncomeDueDate}T00:00:00Z`).toISOString()
        : null;
      if (!dueDate) {
        throw new Error("Due date is required");
      }

      const payload = {
        interview_id: interview.id,
        candidate_id: interview.candidate_id,
        job_id: interview.job_id,
        total_receivable: totalReceivable,
        due_date: dueDate,
        remarks: placementIncomeRemarks || undefined,
      };

      if (placementIncome) {
        const updated = await updatePlacementIncome(placementIncome.id, payload);
        setPlacementIncome(updated);
        pushToast({
          title: "Placement income updated",
          description: "Placement income has been updated successfully.",
        });
      } else {
        const created = await createPlacementIncome(payload);
        setPlacementIncome(created);
        // Update interview to include placement_income_id
        const updatedInterview = await getInterview(id, { force: true });
        setInterview(updatedInterview);
        pushToast({
          title: "Placement income created",
          description: "Placement income has been created successfully.",
        });
      }

      setPlacementIncomeModalOpen(false);
    } catch (error) {
      pushToast({
        title: "Failed to save placement income",
        description:
          (error && error.message) || "An error occurred while saving placement income.",
      });
    } finally {
      setSavingPlacementIncome(false);
    }
  }

  if (loading) {
    return (
      <DetailShell
        title="Interview"
        subtitle="Interview record"
        loading
        loadingTitle="Loading interview..."
        onBack={() => router.back()}
      />
    );
  }

  if (!interview) {
    return (
      <DetailShell
        title="Interview"
        subtitle="Interview record"
        notFound
        onBack={() => router.back()}
      />
    );
  }

  return (
    <>
      <DetailShell
        title={headerTitle}
        subtitle={`${jobLabel} • ${companyLabel}`}
        statusSlot={interview.status ? <StatusPill status={interview.status} /> : null}
        onBack={() => router.back()}
        actions={
          <>
            <Button type="button" onClick={() => setStatusModalOpen(true)}>
              Change status
            </Button>
          </>
        }
      >
        <div className="max-w-3xl rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Company</div>
                {interview.company_id ? (
                  <Link
                    href={`/companies/${interview.company_id}`}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    View company
                  </Link>
                ) : null}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{companyLabel}</div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Job</div>
                {interview.job_id ? (
                  <Link
                    href={`/jobs/${interview.job_id}`}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    View job
                  </Link>
                ) : null}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{jobLabel}</div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Candidate</div>
                {interview.candidate_id ? (
                  <Link
                    href={`/candidates/${interview.candidate_id}`}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    View candidate
                  </Link>
                ) : null}
              </div>
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
            <div className="mt-1 space-y-2">
              <textarea
                value={remarksDraft}
                onChange={(e) => setRemarksDraft(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[var(--border)] bg-white p-3 text-sm text-slate-800 focus:border-[var(--accent)] focus:outline-none"
                placeholder="Add remarks"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={submittingRemarks}
                  onClick={handleRemarksSave}
                >
                  {submittingRemarks ? "Saving..." : "Save remarks"}
                </Button>
              </div>
            </div>
          </div>

          {/* Placement Income Section */}
          {interview.status === "JOINED" && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Placement Income</div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (placementIncome) {
                      setPlacementIncomeTotalReceivable(String(placementIncome.total_receivable || ""));
                      setPlacementIncomeDueDate(
                        placementIncome.due_date
                          ? dayjs(placementIncome.due_date).format("YYYY-MM-DD")
                          : ""
                      );
                      setPlacementIncomeRemarks(placementIncome.remarks || "");
                    } else {
                      setPlacementIncomeTotalReceivable("");
                      setPlacementIncomeDueDate("");
                      setPlacementIncomeRemarks("");
                    }
                    setPlacementIncomeModalOpen(true);
                  }}
                >
                  {placementIncome ? "Edit" : "Create"}
                </Button>
              </div>
              {placementIncome ? (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-[11px] text-slate-500">Total receivable</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      ₹{placementIncome.total_receivable?.toLocaleString("en-IN") || "0"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Balance</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      ₹{placementIncome.balance?.toLocaleString("en-IN") || "0"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Due date</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {placementIncome.due_date
                        ? dayjs(placementIncome.due_date).format("YYYY-MM-DD")
                        : "Not set"}
                    </div>
                  </div>
                  {placementIncome.remarks && (
                    <div className="md:col-span-3">
                      <div className="text-[11px] text-slate-500">Remarks</div>
                      <div className="mt-1 text-sm text-slate-900">{placementIncome.remarks}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-slate-500">
                  No placement income created yet. Click "Create" to add one.
                </div>
              )}
            </div>
          )}
        </div>
      </DetailShell>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change interview status"
        size="md"
      >
        <form onSubmit={handleSubmit(handleStatusSubmit)} className="space-y-3 text-xs">
          <p className="text-[11px] text-slate-600">
            Update the interview status. When marking as{" "}
            <span className="font-semibold">joined</span>, you must provide date of joining and salary.
            This may consume a job vacancy and add the candidate to the joined list.
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

      {/* Placement Income Modal */}
      <Modal
        open={placementIncomeModalOpen}
        onClose={() => setPlacementIncomeModalOpen(false)}
        title={placementIncome ? "Edit placement income" : "Create placement income"}
        size="md"
      >
        <div className="space-y-3 text-xs">
          <p className="text-[11px] text-slate-600">
            {placementIncome
              ? "Update placement income details for this interview."
              : "Create a placement income record for this interview."}
          </p>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Total receivable *
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={placementIncomeTotalReceivable}
              onChange={(e) => setPlacementIncomeTotalReceivable(e.target.value)}
              placeholder="Enter total receivable amount"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Due date *</label>
            <Input
              type="date"
              value={placementIncomeDueDate}
              onChange={(e) => setPlacementIncomeDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Remarks</label>
            <Input
              type="text"
              value={placementIncomeRemarks}
              onChange={(e) => setPlacementIncomeRemarks(e.target.value)}
              placeholder="Optional remarks"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPlacementIncomeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={savingPlacementIncome} onClick={handlePlacementIncomeSave}>
              {savingPlacementIncome ? "Saving..." : placementIncome ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
