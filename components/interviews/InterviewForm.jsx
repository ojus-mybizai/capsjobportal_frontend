"use client";

import { useEffect } from "react";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";
import { getCompany, listCompanies } from "@/services/companies";
import { getJob, listJobs } from "@/services/jobs";
import { getCandidate, listCandidates } from "@/services/candidates";

const STATUS_VALUES = [
  "SCHEDULED",
  "ON_HOLD",
  "REJECTED_BY_EMPLOYER",
  "REJECTED_BY_CANDIDATE",
  "JOINED",
];

const InterviewSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  jobId: z.string().min(1, "Job is required"),
  candidateId: z.string().min(1, "Candidate is required"),
  interviewDate: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(STATUS_VALUES).optional().default("SCHEDULED"),
});

export default function InterviewForm({
  defaultValues,
  onSubmit,
  submitting,
  allowJoinedStatus = true,
  disableStatusField = false,
  disableCompanyField = false,
  disableJobField = false,
  disableCandidateField = false,
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(InterviewSchema),
    defaultValues: {
      companyId: "",
      jobId: "",
      candidateId: "",
      interviewDate: "",
      remarks: "",
      status: "SCHEDULED",
      ...defaultValues,
    },
  });

  const selectedCompanyId = watch("companyId");

  const prevCompanyIdRef = useRef(selectedCompanyId);

  useEffect(() => {
    const prev = prevCompanyIdRef.current;
    if (prev === selectedCompanyId) return;

    prevCompanyIdRef.current = selectedCompanyId;
    setValue("jobId", "", { shouldValidate: true });
  }, [selectedCompanyId, setValue]);

  function handleFormSubmit(values) {
    if (onSubmit) {
      return onSubmit(values, { setError });
    }
  }

  function getCompanyLabel(company) {
    if (!company) return "";
    return (
      company.name || company.title || company.company_name || `Company #${company.id}`
    );
  }

  function getJobLabel(job) {
    if (!job) return "";
    return job.title || job.name || `Job #${job.id}`;
  }

  function getCandidateLabel(candidate) {
    if (!candidate) return "";
    return (
      candidate.full_name ||
      candidate.name ||
      candidate.candidate_name ||
      `Candidate #${candidate.id}`
    );
  }

  const statusOptions = allowJoinedStatus
    ? STATUS_VALUES
    : STATUS_VALUES.filter((value) => value !== "JOINED");

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
      company_id: selectedCompanyId || undefined,
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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3 text-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Company</label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <AsyncSearchSelect
                value={field.value}
                onChange={field.onChange}
                disabled={disableCompanyField}
                placeholder="Select company"
                searchPlaceholder="Search companies..."
                loadOptions={loadCompanyOptions}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => getCompanyLabel(c)}
                resolveSelectedLabel={resolveCompanyLabel}
                allowClear={!disableCompanyField}
              />
            )}
          />
          {errors.companyId && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.companyId.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Job</label>
          <Controller
            control={control}
            name="jobId"
            render={({ field }) => (
              <AsyncSearchSelect
                value={field.value}
                onChange={field.onChange}
                disabled={disableJobField || !selectedCompanyId}
                placeholder={selectedCompanyId ? "Select job" : "Select company first"}
                searchPlaceholder="Search jobs..."
                loadOptions={loadJobOptions}
                getOptionValue={(j) => j.id}
                getOptionLabel={(j) => getJobLabel(j)}
                resolveSelectedLabel={resolveJobLabel}
                allowClear={!(disableJobField || !selectedCompanyId)}
              />
            )}
          />
          {errors.jobId && (
            <p className="mt-1 text-xs text-[var(--danger)]">{errors.jobId.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Candidate</label>
          <Controller
            control={control}
            name="candidateId"
            render={({ field }) => (
              <AsyncSearchSelect
                value={field.value}
                onChange={field.onChange}
                disabled={disableCandidateField}
                placeholder="Select candidate"
                searchPlaceholder="Search candidates..."
                loadOptions={loadCandidateOptions}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => getCandidateLabel(c)}
                resolveSelectedLabel={resolveCandidateLabel}
                allowClear={!disableCandidateField}
              />
            )}
          />
          {errors.candidateId && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.candidateId.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Interview date & time
          </label>
          <Input type="datetime-local" {...register("interviewDate")} />
          {errors.interviewDate && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.interviewDate.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Status</label>
          <Select {...register("status")} disabled={disableStatusField}>
            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase()}
              </option>
            ))}
          </Select>
          {errors.status && (
            <p className="mt-1 text-xs text-[var(--danger)]">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Remarks</label>
        <textarea
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
          {...register("remarks")}
        />
        {errors.remarks && (
          <p className="mt-1 text-xs text-[var(--danger)]">{errors.remarks.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save interview"}
        </Button>
      </div>
    </form>
  );
}
