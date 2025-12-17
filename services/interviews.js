import { api } from "./api";
import { stripEmpty, ensurePagedResult, ensureObjectData } from "./formatters";
import { USE_MOCK_DATA } from "./mockData";

export function listInterviews(params = {}) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ items: [], total: 0 });
  }

  return api
    .get("interviews", { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load interviews"));
}

export function getInterview(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api
    .get(`interviews/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load interview"));
}

export function createInterview(payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now().toString(), ...body });
  }

  return api
    .post("interviews", body)
    .then((result) => ensureObjectData(result, "Failed to create interview"));
}

export function updateInterview(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`interviews/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update interview"));
}

export function updateInterviewStatus(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .patch(`interviews/${id}/status`, body)
    .then((result) => ensureObjectData(result, "Failed to update interview status"));
}

export function deleteInterview(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api.delete(`interviews/${id}`);
}
