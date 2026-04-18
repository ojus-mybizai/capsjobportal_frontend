import { api } from "./api";
import { stripEmpty, ensureArrayData, ensureObjectData } from "./formatters";

export function listMaster(name, params) {
  return api
    .get(`masters/${name}`, { params })
    .then((payload) => ensureArrayData(payload, "Failed to load masters"));
}

export function createMaster(name, payload) {
  const body = stripEmpty(payload);
  return api
    .post(`masters/${name}`, body)
    .then((result) => ensureObjectData(result, "Failed to create master"));
}

export function updateMaster(name, id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`masters/${name}/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update master"));
}

export function deleteMaster(name, id) {
  return api.delete(`masters/${name}/${id}`);
}
