import { api } from "./api";
import { USE_MOCK_DATA, mockUser } from "./mockData";

export function loginRequest(payload) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ access_token: "mock-token", user: mockUser });
  }
  return api.post("auth/login", payload);
}

export function getMeRequest() {
  if (USE_MOCK_DATA) {
    return Promise.resolve(mockUser);
  }
  return api.get("auth/me");
}

export function refreshTokenRequest(refreshToken) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ access_token: "mock-token", user: mockUser });
  }
  return api.post("auth/refresh", { refresh_token: refreshToken });
}
