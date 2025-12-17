import { api } from "./api";
import { USE_MOCK_DATA, mockCompanies } from "./mockData";
import { stripEmpty, ensurePagedResult, ensureObjectData } from "./formatters";

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

  if (USE_MOCK_DATA) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const q = String(params.q || params.search || params.query || "").trim().toLowerCase();
    const companyStatus = params.company_status ? String(params.company_status) : "";
    const verificationStatus = parseBoolean(params.verification_status);
    const start = (page - 1) * limit;

    const filtered = (Array.isArray(mockCompanies) ? mockCompanies : []).filter((c) => {
      if (companyStatus) {
        const status = c && c.company_status != null ? String(c.company_status) : "";
        if (status !== companyStatus) return false;
      }

      if (verificationStatus !== null) {
        const isVerified = !!(c && c.verification_status);
        if (isVerified !== verificationStatus) return false;
      }

      if (q) {
        const name = (c && (c.name || c.title || c.company_name)) || "";
        return String(name).toLowerCase().includes(q);
      }

      return true;
    });
    const items = filtered.slice(start, start + limit);
    return Promise.resolve({ items, total: filtered.length });
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
  if (USE_MOCK_DATA) {
    const company = mockCompanies.find((c) => String(c.id) === String(id));
    return Promise.resolve(
      company || {
        id,
        name: "Sample Company",
        category: "Category",
        location: "Location",
        contact: "Contact",
      }
    );
  }

  return api
    .get(`companies/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load company"));
}

export function getPublicCompany(userUuid, companyUuid) {
  if (USE_MOCK_DATA) {
    const company = mockCompanies.find((c) => String(c.id) === String(companyUuid));
    const fallback = company || { id: companyUuid, name: "Sample Company" };
    return Promise.resolve({
      id: fallback.id,
      name: fallback.name || "-",
      address: fallback.address || null,
      category_name: fallback.category_name || fallback.category || null,
      location_area_name: fallback.location_area_name || fallback.location || null,
      contact_person: fallback.contact_person || null,
      contact_number: fallback.contact_number || null,
      alternate_number: fallback.alternate_number || null,
      email: fallback.email || null,
      google_map_url: fallback.google_map_url || null,
      location_link: fallback.location_link || null,
      visiting_card_url: fallback.visiting_card_url || null,
      front_image_url: fallback.front_image_url || null,
    });
  }

  return api
    .get(`public/company/${userUuid}/${companyUuid}`)
    .then((payload) => ensureObjectData(payload, "Failed to load public company"));
}

export function createCompany(payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), ...body });
  }

  return api
    .post("companies", body)
    .then((payload) => ensureObjectData(payload, "Failed to create company"));
}

export function updateCompany(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`companies/${id}`, body)
    .then((response) => ensureObjectData(response, "Failed to update company"));
}

export function deleteCompany(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api.delete(`companies/${id}`);
}

export function uploadCompanyMedia(id, formData) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ok: true });
  }
  return api.post(`companies/${id}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function listCompanyPayments(companyId, params = {}) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ items: [], total: 0 });
  }

  return api
    .get(`companies/${companyId}/payments`, { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load company payments"));
}

export function createCompanyPayment(companyId, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now(), company_id: companyId, ...body });
  }

  return api
    .post(`companies/${companyId}/payments`, body)
    .then((result) => ensureObjectData(result, "Failed to create company payment"));
}

export function updateCompanyPayment(paymentId, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: paymentId, ...body });
  }

  return api
    .put(`company-payments/${paymentId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update company payment"));
}

export function deleteCompanyPayment(paymentId) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: paymentId });
  }

  return api.delete(`company-payments/${paymentId}`);
}
