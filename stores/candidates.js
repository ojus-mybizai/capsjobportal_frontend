"use client";

import { create } from "zustand";
import {
  listCandidates as apiListCandidates,
  getCandidate as apiGetCandidate,
  createCandidate as apiCreateCandidate,
  updateCandidate as apiUpdateCandidate,
  deleteCandidate as apiDeleteCandidate,
  uploadCandidateFile as apiUploadCandidateFile,
  listCandidatePayments as apiListCandidatePayments,
  createCandidatePayment as apiCreateCandidatePayment,
  updateCandidatePayment as apiUpdateCandidatePayment,
  deleteCandidatePayment as apiDeleteCandidatePayment,
} from "../services/candidates";

export const useCandidatesStore = create((set, get) => ({
  items: [],
  total: 0,
  listParams: {},
  byId: {},
  paymentsByCandidateId: {},
  loadingList: false,
  loadingItem: false,
  loadingPayments: false,

  async list(params = {}) {
    set({ loadingList: true, listParams: params });
    try {
      const result = await apiListCandidates(params);
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
      const candidate = await apiGetCandidate(id);
      set({ byId: { ...get().byId, [id]: candidate }, loadingItem: false });
      return candidate;
    } catch (error) {
      set({ loadingItem: false });
      throw error;
    }
  },

  async create(payload) {
    const candidate = await apiCreateCandidate(payload);
    set({ byId: { ...get().byId, [candidate.id]: candidate } });
    return candidate;
  },

  async update(id, payload) {
    const updated = await apiUpdateCandidate(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async remove(id) {
    await apiDeleteCandidate(id);
    const nextById = { ...get().byId };
    delete nextById[id];
    set({ byId: nextById });
  },

  async uploadFile(id, formData) {
    return apiUploadCandidateFile(id, formData);
  },

  async listPayments(candidateId, params = {}) {
    set({ loadingPayments: true });
    try {
      const result = await apiListCandidatePayments(candidateId, params);
      set({
        paymentsByCandidateId: {
          ...get().paymentsByCandidateId,
          [candidateId]: result.items || [],
        },
        loadingPayments: false,
      });
      return result;
    } catch (error) {
      set({ loadingPayments: false });
      throw error;
    }
  },

  async createPayment(candidateId, payload) {
    const payment = await apiCreateCandidatePayment(candidateId, payload);
    const existing = get().paymentsByCandidateId[candidateId] || [];
    set({
      paymentsByCandidateId: {
        ...get().paymentsByCandidateId,
        [candidateId]: [payment, ...existing],
      },
    });
    return payment;
  },

  async updatePayment(paymentId, payload) {
    const updated = await apiUpdateCandidatePayment(paymentId, payload);
    const next = { ...get().paymentsByCandidateId };
    Object.keys(next).forEach((key) => {
      next[key] = next[key].map((p) => (p.id === paymentId ? updated : p));
    });
    set({ paymentsByCandidateId: next });
    return updated;
  },

  async deletePayment(paymentId) {
    await apiDeleteCandidatePayment(paymentId);
    const next = { ...get().paymentsByCandidateId };
    Object.keys(next).forEach((key) => {
      next[key] = next[key].filter((p) => p.id !== paymentId);
    });
    set({ paymentsByCandidateId: next });
  },
}));
