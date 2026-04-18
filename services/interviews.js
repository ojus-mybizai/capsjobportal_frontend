import { api } from "./api";
import { stripEmpty, ensurePagedResult, ensureObjectData } from "./formatters";

export function listInterviews(params = {}) {
  return api
    .get("interviews", { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load interviews"));
}

export function getInterview(id) {
  return api
    .get(`interviews/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load interview"));
}

export function createInterview(payload) {
  const body = stripEmpty(payload);
  return api
    .post("interviews", body)
    .then((result) => ensureObjectData(result, "Failed to create interview"));
}

export function updateInterview(id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`interviews/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update interview"));
}

export function updateInterviewStatus(id, payload) {
  const body = stripEmpty(payload);
  return api
    .patch(`interviews/${id}/status`, body)
    .then((result) => ensureObjectData(result, "Failed to update interview status"));
}

export function deleteInterview(id) {
  return api.delete(`interviews/${id}`);
}
