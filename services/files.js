import { api } from "./api";

export function uploadFile(formData) {
  return api.post("files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function getFile(id) {
  return api.get(`files/${id}`);
}
