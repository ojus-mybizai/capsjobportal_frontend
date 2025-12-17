"use client";

import { create } from "zustand";
import {
  listInterviews as apiListInterviews,
  getInterview as apiGetInterview,
  createInterview as apiCreateInterview,
  updateInterview as apiUpdateInterview,
  updateInterviewStatus as apiUpdateInterviewStatus,
  deleteInterview as apiDeleteInterview,
} from "../services/interviews";

export const useInterviewsStore = create((set, get) => ({
  items: [],
  total: 0,
  listParams: {},
  byId: {},
  loadingList: false,
  loadingItem: false,

  async list(params = {}) {
    set({ loadingList: true, listParams: params });
    try {
      const result = await apiListInterviews(params);
      set({ items: result.items || [], total: result.total || 0, loadingList: false });
      return result;
    } catch (error) {
      set({ loadingList: false });
      throw error;
    }
  },

  async get(id, { force } = {}) {
    const existing = get().byId[id];
    if (existing && !force) return existing;

    set({ loadingItem: true });
    try {
      const interview = await apiGetInterview(id);
      set({ byId: { ...get().byId, [id]: interview }, loadingItem: false });
      return interview;
    } catch (error) {
      set({ loadingItem: false });
      throw error;
    }
  },

  async create(payload) {
    const interview = await apiCreateInterview(payload);
    set({ byId: { ...get().byId, [interview.id]: interview } });
    return interview;
  },

  async update(id, payload) {
    const updated = await apiUpdateInterview(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async updateStatus(id, payload) {
    const updated = await apiUpdateInterviewStatus(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async remove(id) {
    await apiDeleteInterview(id);
    const nextById = { ...get().byId };
    delete nextById[id];
    set({ byId: nextById });
  },
}));
