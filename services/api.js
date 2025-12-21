import axios from "axios";
import { normalizeAxiosError, buildApiErrorFromResponse } from "../utils/apiError";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const secureCookies =
  process.env.NEXT_PUBLIC_SECURE_AUTH_COOKIES === "true" ||
  process.env.SECURE_AUTH_COOKIES === "true";

function serializeParams(params) {
  const sp = new URLSearchParams();
  if (!params || typeof params !== "object") return sp.toString();

  for (const [key, value] of Object.entries(params)) {
    if (!key) continue;
    if (value == null || value === "") continue;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item == null || item === "") return;
        sp.append(key, String(item));
      });
      continue;
    }

    if (value instanceof Date) {
      sp.append(key, value.toISOString());
      continue;
    }

    if (typeof value === "object") {
      sp.append(key, JSON.stringify(value));
      continue;
    }

    sp.append(key, String(value));
  }

  return sp.toString();
}

export const api = axios.create({
  baseURL,
  withCredentials: secureCookies,
  paramsSerializer: {
    serialize: serializeParams,
  },
});

let getAccessToken;
let getRefreshToken;
let onRefreshToken;
let onLogout;

export function configureApiAuth(options) {
  getAccessToken = options.getAccessToken;
  getRefreshToken = options.getRefreshToken;
  onRefreshToken = options.onRefreshToken;
  onLogout = options.onLogout;
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken && getAccessToken();
    if (token) {
      if (!config.headers) config.headers = {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshQueue = [];

function enqueueRefreshCallback(callback) {
  refreshQueue.push(callback);
}

function resolveRefreshQueue(error, token) {
  refreshQueue.forEach((cb) => cb(error, token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => {
    const payload = response.data;

    if (
      payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "status") &&
      (Object.prototype.hasOwnProperty.call(payload, "data") ||
        Object.prototype.hasOwnProperty.call(payload, "error"))
    ) {
      if (payload.status === "success" || payload.status === "ok") {
        return payload.data;
      }

      throw buildApiErrorFromResponse({
        status: response.status,
        data: payload,
      });
    }

    return payload;
  },
  async (error) => {
    const response = error && error.response;
    const originalRequest = error && error.config;

    if (
      response &&
      response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      onRefreshToken
    ) {
      originalRequest._retry = true;

      const currentRefreshToken = getRefreshToken && getRefreshToken();

      if (!currentRefreshToken) {
        if (onLogout) {
          onLogout();
        }
        return Promise.reject(normalizeAxiosError(error));
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newTokens = await onRefreshToken(currentRefreshToken);
          resolveRefreshQueue(null, newTokens && newTokens.accessToken);
        } catch (refreshError) {
          resolveRefreshQueue(refreshError, null);
          if (onLogout) {
            onLogout();
          }
          isRefreshing = false;
          throw normalizeAxiosError(refreshError);
        }
        isRefreshing = false;
      }

      return new Promise((resolve, reject) => {
        enqueueRefreshCallback((refreshError) => {
          if (refreshError) {
            reject(normalizeAxiosError(refreshError));
            return;
          }
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(normalizeAxiosError(error));
  }
);

export function handleApiError(error) {
  return normalizeAxiosError(error);
}
