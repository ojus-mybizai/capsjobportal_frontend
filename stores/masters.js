"use client";

import { create } from "zustand";
import { createMaster, listMaster } from "../services/masters";

const MASTER_KEYS = [
  "company_category",
  "location",
  "job_category",
  "experience_level",
  "skill",
  "education",
  "degree",
];

const CACHE_KEY = "caps:masters:v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    if (!parsed.masters || typeof parsed.masters !== "object") return null;
    return parsed.masters;
  } catch {
    return null;
  }
}

function writeCache(masters) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), masters })
    );
  } catch {
    // sessionStorage full or disabled — silently ignore
  }
}

function clearCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export const useMastersStore = create((set, get) => ({
  masters: readCache() || {},
  loading: false,

  async loadMaster(name) {
    if (get().masters[name]) return get().masters[name];

    set({ loading: true });
    try {
      const result = await listMaster(name);
      let items = [];

      if (Array.isArray(result)) {
        items = result;
      } else if (result && typeof result === "object") {
        if (Array.isArray(result.items)) {
          items = result.items;
        } else if (Array.isArray(result.data)) {
          items = result.data;
        }
      }

      const nextMasters = { ...get().masters, [name]: items };
      set({ masters: nextMasters, loading: false });
      writeCache(nextMasters);
      return items;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  async preloadAll() {
    const missing = MASTER_KEYS.filter((key) => !get().masters[key]);
    if (missing.length === 0) return;
    await Promise.all(missing.map((key) => get().loadMaster(key)));
  },

  setMasterItems(name, items) {
    const nextMasters = {
      ...get().masters,
      [name]: Array.isArray(items) ? items : [],
    };
    set({ masters: nextMasters });
    writeCache(nextMasters);
  },

  getOptions(name) {
    const items = get().masters[name] || [];
    return items.map((item) => ({
      label: item.label || item.name || String(item.value || ""),
      value: item.value || item.id || item.name,
    }));
  },

  async createMasterItem(name, payload) {
    const created = await createMaster(name, payload);
    const current = get().masters[name] || [];
    const nextMasters = { ...get().masters, [name]: [...current, created] };
    set({ masters: nextMasters });
    writeCache(nextMasters);
    return created;
  },

  resetMasters() {
    clearCache();
    set({ masters: {} });
  },
}));
