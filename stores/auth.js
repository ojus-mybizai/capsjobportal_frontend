"use client";

import { create } from "zustand";
import { configureApiAuth } from "../services/api";
import { getMeRequest, loginRequest, refreshTokenRequest } from "../services/auth";

const STORAGE_KEY = "caps_refresh_token";
const ACCESS_STORAGE_KEY = "caps_access_token";

const secureCookies =
  process.env.NEXT_PUBLIC_SECURE_AUTH_COOKIES === "true" ||
  process.env.SECURE_AUTH_COOKIES === "true";

function extractAccessToken(tokens) {
  if (!tokens || typeof tokens !== "object") return null;
  if (typeof tokens.access_token === "string") return tokens.access_token;
  if (typeof tokens.accessToken === "string") return tokens.accessToken;
  if (typeof tokens.token === "string") return tokens.token;
  if (tokens.token && typeof tokens.token === "object") {
    if (typeof tokens.token.access_token === "string") return tokens.token.access_token;
    if (typeof tokens.token.token === "string") return tokens.token.token;
  }
  return null;
}

function extractRefreshToken(tokens, fallback) {
  if (!tokens || typeof tokens !== "object") return fallback || null;
  if (typeof tokens.refresh_token === "string") return tokens.refresh_token;
  if (typeof tokens.refreshToken === "string") return tokens.refreshToken;
  if (tokens.token && typeof tokens.token === "object") {
    if (typeof tokens.token.refresh_token === "string") return tokens.token.refresh_token;
    if (typeof tokens.token.refreshToken === "string") return tokens.token.refreshToken;
  }
  return fallback || null;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;

    set({ loading: true });

    let storedRefreshToken = null;
    let storedAccessToken = null;
    if (typeof window !== "undefined") {
      storedAccessToken =
        window.sessionStorage.getItem(ACCESS_STORAGE_KEY) ||
        window.localStorage.getItem(ACCESS_STORAGE_KEY);

      if (!secureCookies) {
        storedRefreshToken = window.localStorage.getItem(STORAGE_KEY);
      }
    }

    if (secureCookies && !storedAccessToken) {
      try {
        const user = await getMeRequest();
        set({
          user,
          isAuthenticated: true,
          hydrated: true,
          loading: false,
        });
      } catch {
        set({ hydrated: true, loading: false });
      }
      return;
    }

    if (!storedRefreshToken && !storedAccessToken) {
      set({ hydrated: true, loading: false });
      return;
    }

    if (storedRefreshToken) set({ refreshToken: storedRefreshToken });
    if (storedAccessToken) set({ accessToken: storedAccessToken });

    if (!storedRefreshToken && storedAccessToken) {
      set({ isAuthenticated: true });
      try {
        const user = await getMeRequest();
        set({ user, hydrated: true, loading: false });
      } catch {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(ACCESS_STORAGE_KEY);
          window.localStorage.removeItem(ACCESS_STORAGE_KEY);
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          hydrated: true,
          loading: false,
        });
      }
      return;
    }

    try {
      const tokens = await refreshTokenRequest(storedRefreshToken);
      const accessToken = extractAccessToken(tokens);
      const nextRefreshToken = extractRefreshToken(tokens, storedRefreshToken);

      if (!accessToken) {
        throw new Error("Missing access token in refresh response");
      }

      set({
        accessToken,
        refreshToken: nextRefreshToken,
        isAuthenticated: true,
      });

      if (typeof window !== "undefined" && accessToken) {
        if (secureCookies) {
          window.sessionStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
        } else {
          window.localStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
        }
      }

      if (typeof window !== "undefined" && !secureCookies && nextRefreshToken) {
        window.localStorage.setItem(STORAGE_KEY, nextRefreshToken);
      }

      let user = tokens.user || null;
      try {
        user = await getMeRequest();
      } catch (error) {
        // ignore, fallback to token user
      }

      set({ user, hydrated: true, loading: false });
    } catch (error) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        window.localStorage.removeItem(ACCESS_STORAGE_KEY);
        if (!secureCookies) {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        hydrated: true,
        loading: false,
      });
    }
  },

  async login(email, password) {
    set({ loading: true });
    try {
      const tokens = await loginRequest({ email, password });
      const accessToken = extractAccessToken(tokens);
      const nextRefreshToken = extractRefreshToken(tokens, null);

      if (!accessToken) {
        throw new Error("Missing access token in login response");
      }

      set({
        accessToken,
        refreshToken: nextRefreshToken,
        isAuthenticated: true,
      });

      if (typeof window !== "undefined" && accessToken) {
        if (secureCookies) {
          window.sessionStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
        } else {
          window.localStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
        }
      }

      if (typeof window !== "undefined" && !secureCookies && nextRefreshToken) {
        window.localStorage.setItem(STORAGE_KEY, nextRefreshToken);
      }

      let user = tokens.user || null;
      try {
        user = await getMeRequest();
      } catch (error) {
        // ignore, fallback to token user
      }

      set({ user, loading: false });
      return user;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  async refreshWithToken(refreshToken) {
    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    const tokens = await refreshTokenRequest(refreshToken);
    const accessToken = extractAccessToken(tokens);
    const nextRefreshToken = extractRefreshToken(tokens, refreshToken);

    if (!accessToken) {
      throw new Error("Missing access token in refresh response");
    }

    set({
      accessToken,
      refreshToken: nextRefreshToken,
      isAuthenticated: true,
    });

    if (typeof window !== "undefined" && accessToken) {
      if (secureCookies) {
        window.sessionStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
      } else {
        window.localStorage.setItem(ACCESS_STORAGE_KEY, accessToken);
      }
    }

    if (typeof window !== "undefined" && !secureCookies && nextRefreshToken) {
      window.localStorage.setItem(STORAGE_KEY, nextRefreshToken);
    }

    try {
      const user = await getMeRequest();
      set({ user });
    } catch (error) {
      // ignore
    }

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  },

  async logout() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACCESS_STORAGE_KEY);
      window.localStorage.removeItem(ACCESS_STORAGE_KEY);
      if (!secureCookies) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));

configureApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onRefreshToken: (refreshToken) => useAuthStore.getState().refreshWithToken(refreshToken),
  onLogout: () => useAuthStore.getState().logout(),
});
