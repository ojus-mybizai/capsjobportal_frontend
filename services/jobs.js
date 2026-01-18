import { api } from "./api";
import { USE_MOCK_DATA, mockJobs } from "./mockData";
import {
  stripEmpty,
  ensurePagedResult,
  ensureObjectData,
  ensureArrayData,
} from "./formatters";

export function listJobOptions(params = {}) {
  if (USE_MOCK_DATA) {
    const q = String(params.q || params.search || params.query || "").trim().toLowerCase();
    const companyId = params.company_id != null ? String(params.company_id) : "";
    const limit = Number(params.limit) || 20;
    const filtered = (Array.isArray(mockJobs) ? mockJobs : []).filter((j) => {
      if (companyId) {
        const jCompanyId = j && j.company_id != null ? String(j.company_id) : "";
        if (jCompanyId && jCompanyId !== companyId) return false;
      }
      if (q) {
        const title = (j && (j.title || j.name)) || "";
        return String(title).toLowerCase().includes(q);
      }
      return true;
    });
    const items = filtered.slice(0, limit).map((j) => ({
      id: j.id,
      name: j.title || j.name || `Job #${j.id}`,
    }));
    return Promise.resolve(items);
  }

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
  if (USE_MOCK_DATA) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const q = String(params.q || params.search || params.query || "").trim().toLowerCase();
    const companyId = params.company_id != null ? String(params.company_id) : "";
    const status = params.status ? String(params.status) : "";
    const locationAreaId =
      params.location_area_id != null ? String(params.location_area_id) : "";
    const start = (page - 1) * limit;
    const filtered = (Array.isArray(mockJobs) ? mockJobs : []).filter((j) => {
      if (companyId) {
        const jCompanyId = j && j.company_id != null ? String(j.company_id) : "";
        if (jCompanyId && jCompanyId !== companyId) return false;
      }

      if (status) {
        const s = j && j.status != null ? String(j.status) : "";
        if (s !== status) return false;
      }

      if (locationAreaId) {
        const loc = j && j.location_area_id != null ? String(j.location_area_id) : "";
        if (loc !== locationAreaId) return false;
      }

      if (q) {
        const title = (j && (j.title || j.name)) || "";
        return String(title).toLowerCase().includes(q);
      }
      return true;
    });
    const items = filtered.slice(start, start + limit);
    return Promise.resolve({ items, total: filtered.length });
  }

  return api
    .get("jobs", { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load jobs"));
}

export function getJob(id) {
  if (USE_MOCK_DATA) {
    const job = mockJobs.find((j) => String(j.id) === String(id));
    return Promise.resolve(
      job || {
        id,
        title: "Sample Job",
        company_name: "Sample Company",
        location: "Location",
        status: "open",
      }
    );
  }

  return api
    .get(`jobs/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load job"));
}

export function listJobRelatedCandidates(jobId, params = {}) {
  if (USE_MOCK_DATA) {
    return Promise.resolve([]);
  }

  const resolved = { ...params };
  return api
    .get(`jobs/${jobId}/related-candidates`, { params: resolved })
    .then((payload) => ensureArrayData(payload, "Failed to load related candidates"));
}

export function createJob(payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), status: "open", ...body });
  }

  return api
    .post("jobs", body)
    .then((result) => ensureObjectData(result, "Failed to create job"));
}

export function updateJob(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`jobs/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update job"));
}

export function updateJobStatus(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .patch(`jobs/${id}/status`, body)
    .then((result) => ensureObjectData(result, "Failed to update job status"));
}

export function uploadJobAttachment(id, formData) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ok: true });
  }
  return api.post(`jobs/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function deleteJob(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api.delete(`jobs/${id}`);
}
