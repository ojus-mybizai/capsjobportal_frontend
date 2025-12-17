import { ApiError } from "../utils/apiError";

export function stripEmpty(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const result = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }
    result[key] = value;
  }

  return result;
}

export function ensureObjectData(payload, contextMessage) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(
      contextMessage || "Unexpected response format from server.",
      0,
      payload
    );
  }
  return payload;
}

export function ensureArrayData(payload, contextMessage) {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
  }

  throw new ApiError(
    contextMessage || "Unexpected list response format from server.",
    0,
    payload
  );
}

export function ensurePagedResult(payload, contextMessage) {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }

  if (payload && typeof payload === "object") {
    const items = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.data)
      ? payload.data
      : null;

    if (!items) {
      throw new ApiError(
        contextMessage || "Unexpected list response format from server.",
        0,
        payload
      );
    }

    const total =
      typeof payload.total === "number"
        ? payload.total
        : typeof payload.count === "number"
        ? payload.count
        : items.length;

    return { items, total };
  }

  throw new ApiError(
    contextMessage || "Unexpected list response format from server.",
    0,
    payload
  );
}
