import { api } from "./api";
import { USE_MOCK_DATA, mockMasters } from "./mockData";
import { stripEmpty, ensureArrayData, ensureObjectData } from "./formatters";

export function listMaster(name, params) {
  if (USE_MOCK_DATA) {
    return Promise.resolve(mockMasters[name] || []);
  }

  return api
    .get(`masters/${name}`, { params })
    .then((payload) => ensureArrayData(payload, "Failed to load masters"));
}

export function createMaster(name, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), ...body });
  }

  return api
    .post(`masters/${name}`, body)
    .then((result) => ensureObjectData(result, "Failed to create master"));
}

export function updateMaster(name, id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`masters/${name}/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update master"));
}

export function deleteMaster(name, id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api.delete(`masters/${name}/${id}`);
}
