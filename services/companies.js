import { api } from "./api";
import { stripEmpty, ensurePagedResult, ensureObjectData } from "./formatters";

export function listCompanyOptions(params = {}) {
  return api
    .get("companies/options", { params: { q: params.q, limit: params.limit || 20 } })
    .then((payload) => {
      if (payload?.data?.data) return payload.data.data;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload)) return payload;
      return [];
    })
    .catch(() => []);
}

export function listCompanies(params = {}) {
  function parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true") return true;
      if (v === "false") return false;
    }
    return null;
  }

  const resolvedParams = { ...params };

  const parsedVerified = parseBoolean(resolvedParams.verification_status);
  if (parsedVerified !== null) {
    resolvedParams.verification_status = parsedVerified;
  }

  return api
    .get("companies", { params: resolvedParams })
    .then((payload) => ensurePagedResult(payload, "Failed to load companies"));
}

export function getCompany(id) {
  return api
    .get(`companies/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load company"));
}

export function getPublicCompany(userUuid, companyUuid) {
  return api
    .get(`public/company/${userUuid}/${companyUuid}`)
    .then((payload) => ensureObjectData(payload, "Failed to load public company"));
}

export function createCompany(payload) {
  const body = stripEmpty(payload);
  return api
    .post("companies", body)
    .then((response) => ensureObjectData(response, "Failed to create company"));
}

export function updateCompany(id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`companies/${id}`, body)
    .then((response) => ensureObjectData(response, "Failed to update company"));
}

export function deleteCompany(id) {
  return api.delete(`companies/${id}`);
}

export function uploadCompanyMedia(id, formData) {
  return api.post(`companies/${id}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function listCompanyPayments(companyId, params = {}) {
  return api
    .get(`companies/${companyId}/payments`, { params })
    .then((payload) => {
      const result = ensurePagedResult(payload, "Failed to load company payments");
      const items = Array.isArray(result.items) ? result.items.map(normalizePayment) : [];
      return { ...result, items };
    });
}

export function createCompanyPayment(companyId, payload) {
  const body = stripEmpty(payload);
  return api
    .post(`companies/${companyId}/payments`, body)
    .then((result) =>
      normalizePayment(ensureObjectData(result, "Failed to create company payment"))
    );
}

export function updateCompanyPayment(paymentId, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`payments/${paymentId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update company payment"));
}

export function deleteCompanyPayment(paymentId) {
  return api.delete(`payments/${paymentId}`);
}

function normalizePayment(payment) {
  if (!payment || typeof payment !== "object") return payment;
  const amountValue = payment.amount;
  const numericAmount =
    typeof amountValue === "number"
      ? amountValue
      : Number.parseFloat(String(amountValue ?? ""));
  return {
    ...payment,
    amount: Number.isFinite(numericAmount) ? numericAmount : 0,
  };
}
