import { api } from "./api";
import { USE_MOCK_DATA, mockMappingsByJob } from "./mockData";

export function addCandidateToJob(jobId, payload) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), job_id: jobId, ...payload });
  }
  return api.post(`jobs/${jobId}/candidates`, payload);
}

export function listCandidatesForJob(jobId, params) {
  if (USE_MOCK_DATA) {
    const list = mockMappingsByJob[Number(jobId)] || [];
    return Promise.resolve(list);
  }
  return api.get(`jobs/${jobId}/candidates`, { params });
}

export function listJobsForCandidate(candidateId, params) {
  if (USE_MOCK_DATA) {
    return Promise.resolve([]);
  }
  return api.get(`candidates/${candidateId}/jobs`, { params });
}

export function updateMapping(id, payload) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...payload });
  }
  return api.put(`mappings/${id}`, payload);
}

export function updateMappingStatus(id, payload) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...payload });
  }
  return api.patch(`mappings/${id}/status`, payload);
}

export function deleteMapping(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }
  return api.delete(`mappings/${id}`);
}
