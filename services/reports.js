import { api } from "./api";
import { ensureObjectData } from "./formatters";

export function jobsSummary() {
  return api
    .get("reports/jobs/summary")
    .then((payload) => ensureObjectData(payload, "Failed to load jobs summary"));
}

export function candidatesSummary() {
  return api
    .get("reports/candidates/summary")
    .then((payload) => ensureObjectData(payload, "Failed to load candidates summary"));
}

export function jobPipeline(jobId) {
  return api
    .get(`reports/job/${jobId}/pipeline`)
    .then((payload) => ensureObjectData(payload, "Failed to load job pipeline"));
}

export function placements(params) {
  return api
    .get("reports/placements", { params })
    .then((payload) => ensureObjectData(payload, "Failed to load placements report"));
}

export function interviewJobCandidatesReport(params = {}) {
  const resolvedParams = { ...params };
  if (resolvedParams.limit != null) {
    const n = Number(resolvedParams.limit);
    if (Number.isFinite(n)) resolvedParams.limit = Math.min(Math.max(n, 1), 100);
  }

  return api
    .get("reports/interviews/job-candidates", { params: resolvedParams })
    .then((payload) => ensureObjectData(payload, "Failed to load job-candidates report"));
}

export function interviewCandidateJobsReport(params = {}) {
  const resolvedParams = { ...params };
  if (resolvedParams.limit != null) {
    const n = Number(resolvedParams.limit);
    if (Number.isFinite(n)) resolvedParams.limit = Math.min(Math.max(n, 1), 100);
  }

  return api
    .get("reports/interviews/candidate-jobs", { params: resolvedParams })
    .then((payload) => ensureObjectData(payload, "Failed to load candidate-jobs report"));
}
