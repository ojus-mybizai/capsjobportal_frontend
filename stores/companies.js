"use client";

import { create } from "zustand";
import {
  listCompanies as apiListCompanies,
  getCompany as apiGetCompany,
  createCompany as apiCreateCompany,
  updateCompany as apiUpdateCompany,
  deleteCompany as apiDeleteCompany,
  listCompanyPayments as apiListCompanyPayments,
  createCompanyPayment as apiCreateCompanyPayment,
  updateCompanyPayment as apiUpdateCompanyPayment,
  deleteCompanyPayment as apiDeleteCompanyPayment,
} from "../services/companies";

export const useCompaniesStore = create((set, get) => ({
  items: [],
  total: 0,
  listParams: {},
  byId: {},
  paymentsByCompanyId: {},
  loadingList: false,
  loadingItem: false,
  loadingPayments: false,

  async list(params = {}) {
    set({ loadingList: true, listParams: params });
    try {
      const result = await apiListCompanies(params);
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
      const company = await apiGetCompany(id);
      set({ byId: { ...get().byId, [id]: company }, loadingItem: false });
      return company;
    } catch (error) {
      set({ loadingItem: false });
      throw error;
    }
  },

  async create(payload) {
    const company = await apiCreateCompany(payload);
    set({ byId: { ...get().byId, [company.id]: company } });
    return company;
  },

  async update(id, payload) {
    const updated = await apiUpdateCompany(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async remove(id) {
    await apiDeleteCompany(id);
    const nextById = { ...get().byId };
    delete nextById[id];
    set({ byId: nextById });
  },

  async listPayments(companyId, params = {}) {
    set({ loadingPayments: true });
    try {
      const result = await apiListCompanyPayments(companyId, params);
      set({
        paymentsByCompanyId: {
          ...get().paymentsByCompanyId,
          [companyId]: result.items || [],
        },
        loadingPayments: false,
      });
      return result;
    } catch (error) {
      set({ loadingPayments: false });
      throw error;
    }
  },

  async createPayment(companyId, payload) {
    const payment = await apiCreateCompanyPayment(companyId, payload);
    const existing = get().paymentsByCompanyId[companyId] || [];
    set({
      paymentsByCompanyId: {
        ...get().paymentsByCompanyId,
        [companyId]: [payment, ...existing],
      },
    });
    return payment;
  },

  async updatePayment(paymentId, payload) {
    const updated = await apiUpdateCompanyPayment(paymentId, payload);
    const next = { ...get().paymentsByCompanyId };
    Object.keys(next).forEach((key) => {
      next[key] = next[key].map((p) => (p.id === paymentId ? updated : p));
    });
    set({ paymentsByCompanyId: next });
    return updated;
  },

  async deletePayment(paymentId) {
    await apiDeleteCompanyPayment(paymentId);
    const next = { ...get().paymentsByCompanyId };
    Object.keys(next).forEach((key) => {
      next[key] = next[key].filter((p) => p.id !== paymentId);
    });
    set({ paymentsByCompanyId: next });
  },
}));
