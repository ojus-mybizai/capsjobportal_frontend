import { api } from "./api";

export function loginRequest(payload) {
  return api.post("auth/login", payload);
}

export function getMeRequest() {
  return api.get("auth/me");
}

export function refreshTokenRequest(refreshToken) {
  return api.post("auth/refresh", { refresh_token: refreshToken });
}
