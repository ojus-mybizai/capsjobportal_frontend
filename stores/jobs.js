"use client";

import { create } from "zustand";
import {
  listJobs as apiListJobs,
  getJob as apiGetJob,
  createJob as apiCreateJob,
  updateJob as apiUpdateJob,
  updateJobStatus as apiUpdateJobStatus,
  uploadJobAttachment as apiUploadJobAttachment,
} from "../services/jobs";

export const useJobsStore = create((set, get) => ({
  items: [],
  total: 0,
  listParams: {},
  byId: {},
  loadingList: false,
  loadingItem: false,

  async list(params = {}) {
    set({ loadingList: true, listParams: params });
    try {
      const result = await apiListJobs(params);
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
      const job = await apiGetJob(id);
      set({ byId: { ...get().byId, [id]: job }, loadingItem: false });
      return job;
    } catch (error) {
      set({ loadingItem: false });
      throw error;
    }
  },

  async create(payload) {
    const job = await apiCreateJob(payload);
    set({ byId: { ...get().byId, [job.id]: job } });
    return job;
  },

  async update(id, payload) {
    const updated = await apiUpdateJob(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async updateStatus(id, payload) {
    const updated = await apiUpdateJobStatus(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async uploadAttachments(id, formData) {
    return apiUploadJobAttachment(id, formData);
  },
}));
