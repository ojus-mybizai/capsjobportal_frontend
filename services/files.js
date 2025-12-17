import { api } from "./api";
import { USE_MOCK_DATA } from "./mockData";

export function uploadFile(formData) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), ok: true });
  }
  return api.post("files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function getFile(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, url: "https://placehold.co/600x400" });
  }
  return api.get(`files/${id}`);
}
