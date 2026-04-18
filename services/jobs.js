import { api } from "./api";
import {
  stripEmpty,
  ensurePagedResult,
  ensureObjectData,
  ensureArrayData,
} from "./formatters";

export function listJobOptions(params = {}) {
  return api
    .get("jobs/options", {
      params: { q: params.q, company_id: params.company_id, limit: params.limit || 20 },
    })
    .then((payload) => {
      if (payload?.data?.data) return payload.data.data;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload)) return payload;
      return [];
    })
    .catch(() => []);
}

export function listJobs(params = {}) {
  return api
    .get("jobs", { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load jobs"));
}

export function getJob(id) {
  return api
    .get(`jobs/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load job"));
}

export function listJobRelatedCandidates(jobId, params = {}) {
  const resolved = { ...params };
  return api
    .get(`jobs/${jobId}/related-candidates`, { params: resolved })
    .then((payload) => ensureArrayData(payload, "Failed to load related candidates"));
}

export function createJob(payload) {
  const body = stripEmpty(payload);
  return api
    .post("jobs", body)
    .then((result) => ensureObjectData(result, "Failed to create job"));
}

export function updateJob(id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`jobs/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update job"));
}

export function updateJobStatus(id, payload) {
  const body = stripEmpty(payload);
  return api
    .patch(`jobs/${id}/status`, body)
    .then((result) => ensureObjectData(result, "Failed to update job status"));
}

export function uploadJobAttachment(id, formData) {
  return api.post(`jobs/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function deleteJob(id) {
  return api.delete(`jobs/${id}`);
}
