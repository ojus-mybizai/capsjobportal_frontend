import { api } from "./api";
import { stripEmpty, ensureObjectData } from "./formatters";

function serializeQueryParams(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.filter((v) => v != null && v !== "").forEach((v) => search.append(key, String(v)));
      return;
    }
    search.set(key, String(value));
  });
  return search.toString();
}

export function paymentsLedger(params = {}) {
  const resolvedParams = { ...params };

  if (resolvedParams.page != null) {
    const n = Number(resolvedParams.page);
    if (Number.isFinite(n)) resolvedParams.page = Math.max(1, n);
  }

  if (resolvedParams.limit != null) {
    const n = Number(resolvedParams.limit);
    if (Number.isFinite(n)) resolvedParams.limit = Math.min(Math.max(1, n), 100);
  }

  if (Array.isArray(resolvedParams.source) && resolvedParams.source.length === 0) {
    delete resolvedParams.source;
  }

  const cleaned = stripEmpty(resolvedParams);

  return api
    .get("payments/ledger", {
      params: cleaned,
      paramsSerializer: {
        serialize: serializeQueryParams,
      },
    })
    .then((payload) => ensureObjectData(payload, "Failed to load payments ledger"));
}

