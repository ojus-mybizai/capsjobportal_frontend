import { api } from "./api";
import { USE_MOCK_DATA, mockCandidates } from "./mockData";
import {
  stripEmpty,
  ensurePagedResult,
  ensureObjectData,
  ensureArrayData,
} from "./formatters";

export function listCandidateOptions(params = {}) {
  if (USE_MOCK_DATA) {
    const q = String(params.q || params.search || params.query || "").trim().toLowerCase();
    const limit = Number(params.limit) || 20;
    const filtered = (Array.isArray(mockCandidates) ? mockCandidates : []).filter((c) => {
      if (q) {
        const name = (c && (c.full_name || c.name || c.candidate_name)) || "";
        const email = (c && c.email) || "";
        return (
          String(name).toLowerCase().includes(q) ||
          String(email).toLowerCase().includes(q)
        );
      }
      return true;
    });
    const items = filtered.slice(0, limit).map((c) => ({
      id: c.id,
      name: c.full_name || c.name || c.candidate_name || `Candidate #${c.id}`,
    }));
    return Promise.resolve(items);
  }

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
  if (USE_MOCK_DATA) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const q = String(params.q || params.search || params.query || "").trim().toLowerCase();
    const status = params.status ? String(params.status) : "";
    const employmentStatus = params.employment_status ? String(params.employment_status) : "";
    const locationAreaId =
      params.location_area_id != null ? String(params.location_area_id) : "";
    const start = (page - 1) * limit;

    const filtered = (Array.isArray(mockCandidates) ? mockCandidates : []).filter((c) => {
      if (status) {
        const s = c && c.status != null ? String(c.status) : "";
        if (s !== status) return false;
      }

      if (employmentStatus) {
        const e = c && c.employment_status != null ? String(c.employment_status) : "";
        if (String(e).toLowerCase() !== String(employmentStatus).toLowerCase()) return false;
      }

      if (locationAreaId) {
        const loc = c && c.location_area_id != null ? String(c.location_area_id) : "";
        if (loc !== locationAreaId) return false;
      }

      if (q) {
        const name = (c && (c.full_name || c.name || c.candidate_name)) || "";
        const email = (c && c.email) || "";
        return (
          String(name).toLowerCase().includes(q) ||
          String(email).toLowerCase().includes(q)
        );
      }

      return true;
    });
    const items = filtered.slice(start, start + limit);
    return Promise.resolve({ items, total: filtered.length });
  }

  const resolvedParams = { ...params };
  if (resolvedParams.status && !resolvedParams.candidate_status) {
    resolvedParams.candidate_status = resolvedParams.status;
  }

  return api
    .get("candidates", { params: resolvedParams })
    .then((payload) => ensurePagedResult(payload, "Failed to load candidates"));
}

export function getCandidate(id) {
  if (USE_MOCK_DATA) {
    const candidate = mockCandidates.find((c) => String(c.id) === String(id));
    return Promise.resolve(
      candidate || {
        id,
        name: "Sample Candidate",
        email: "candidate@example.com",
        phone: "+91-90000 00000",
        location: "Location",
      }
    );
  }

  return api
    .get(`candidates/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load candidate"));
}

export function createCandidate(payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), ...body });
  }

  return api
    .post("candidates", body)
    .then((result) => ensureObjectData(result, "Failed to create candidate"));
}

export function updateCandidate(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`candidates/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update candidate"));
}

export function changeCandidateStatus(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`candidates/${id}/status`, body)
    .then((result) => ensureObjectData(result, "Failed to update candidate status"));
}

export function deleteCandidate(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api.delete(`candidates/${id}`);
}

export function uploadCandidateFile(id, formData) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ok: true });
  }
  return api.post(`candidates/${id}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function listCandidatePayments(candidateId, params = {}) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ items: [], total: 0 });
  }

  return api
    .get(`candidates/${candidateId}/payments`, { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load candidate payments"));
}

export function createCandidatePayment(candidateId, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), candidate_id: candidateId, ...body });
  }

  return api
    .post(`candidates/${candidateId}/payments`, body)
    .then((result) => ensureObjectData(result, "Failed to create candidate payment"));
}

export function updateCandidatePayment(paymentId, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: paymentId, ...body });
  }

  return api
    .put(`candidate-payments/${paymentId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update candidate payment"));
}

export function deleteCandidatePayment(paymentId) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: paymentId });
  }

  return api.delete(`candidate-payments/${paymentId}`);
}

export function updateJocFee(feeId, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: feeId, ...body });
  }

  return api
    .put(`candidates/joc-fees/${feeId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update JOC fee"));
}

export function deleteJocFee(feeId) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: feeId });
  }

  return api.delete(`candidates/joc-fees/${feeId}`);
}

export function listCandidateAppliedJobs(candidateId) {
  if (USE_MOCK_DATA) {
    return Promise.resolve([]);
  }

  return api
    .get(`candidates/${candidateId}/applied-jobs`)
    .then((result) => ensureArrayData(result, "Failed to load applied jobs"));
}

export function listCandidateRelatedJobs(candidateId, params = {}) {
  if (USE_MOCK_DATA) {
    return Promise.resolve([]);
  }

  const resolved = { ...params };
  return api
    .get(`candidates/${candidateId}/related-jobs`, { params: resolved })
    .then((payload) => ensureArrayData(payload, "Failed to load related jobs"));
}
