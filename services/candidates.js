import { api } from "./api";
import {
  stripEmpty,
  ensurePagedResult,
  ensureObjectData,
  ensureArrayData,
} from "./formatters";

export function listCandidateOptions(params = {}) {
  return api
    .get("candidates/options", { params: { q: params.q, limit: params.limit || 20 } })
    .then((payload) => {
      if (payload?.data?.data) return payload.data.data;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload)) return payload;
      return [];
    })
    .catch(() => []);
}

export function listCandidates(params = {}) {
  const resolvedParams = { ...params };
  if (resolvedParams.status && !resolvedParams.candidate_status) {
    resolvedParams.candidate_status = resolvedParams.status;
  }

  return api
    .get("candidates", { params: resolvedParams })
    .then((payload) => ensurePagedResult(payload, "Failed to load candidates"));
}

export function getCandidate(id) {
  return api
    .get(`candidates/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load candidate"));
}

export function createCandidate(payload) {
  const body = stripEmpty(payload);
  return api
    .post("candidates", body)
    .then((result) => ensureObjectData(result, "Failed to create candidate"));
}

export function updateCandidate(id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`candidates/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update candidate"));
}

export function changeCandidateStatus(id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`candidates/${id}/status`, body)
    .then((result) => ensureObjectData(result, "Failed to update candidate status"));
}

export function deleteCandidate(id) {
  return api.delete(`candidates/${id}`);
}

export function uploadCandidateFile(id, formData) {
  return api.post(`candidates/${id}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function listCandidatePayments(candidateId, params = {}) {
  return api
    .get(`candidates/${candidateId}/payments`, { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load candidate payments"));
}

export function createCandidatePayment(candidateId, payload) {
  const body = stripEmpty(payload);
  return api
    .post(`candidates/${candidateId}/payments`, body)
    .then((result) => ensureObjectData(result, "Failed to create candidate payment"));
}

export function updateCandidatePayment(paymentId, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`candidate-payments/${paymentId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update candidate payment"));
}

export function deleteCandidatePayment(paymentId) {
  return api.delete(`candidate-payments/${paymentId}`);
}

export function updateJocFee(feeId, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`candidates/joc-fees/${feeId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update JOC fee"));
}

export function deleteJocFee(feeId) {
  return api.delete(`candidates/joc-fees/${feeId}`);
}

export function listCandidateAppliedJobs(candidateId) {
  return api
    .get(`candidates/${candidateId}/applied-jobs`)
    .then((result) => ensureArrayData(result, "Failed to load applied jobs"));
}

export function listCandidateRelatedJobs(candidateId, params = {}) {
  const resolved = { ...params };
  return api
    .get(`candidates/${candidateId}/related-jobs`, { params: resolved })
    .then((payload) => ensureArrayData(payload, "Failed to load related jobs"));
}
