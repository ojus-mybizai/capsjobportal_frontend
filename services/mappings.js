import { api } from "./api";

export function addCandidateToJob(jobId, payload) {
  return api.post(`jobs/${jobId}/candidates`, payload);
}

export function listCandidatesForJob(jobId, params) {
  return api.get(`jobs/${jobId}/candidates`, { params });
}

export function listJobsForCandidate(candidateId, params) {
  return api.get(`candidates/${candidateId}/jobs`, { params });
}

export function updateMapping(id, payload) {
  return api.put(`mappings/${id}`, payload);
}

export function updateMappingStatus(id, payload) {
  return api.patch(`mappings/${id}/status`, payload);
}

export function deleteMapping(id) {
  return api.delete(`mappings/${id}`);
}
