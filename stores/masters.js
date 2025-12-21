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

export const useMastersStore = create((set, get) => ({
  masters: {},
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

      set({ masters: { ...get().masters, [name]: items }, loading: false });
      return items;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  async preloadAll() {
    await Promise.all(MASTER_KEYS.map((key) => get().loadMaster(key)));
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
    set({ masters: { ...get().masters, [name]: [...current, created] } });
    return created;
  },
}));
