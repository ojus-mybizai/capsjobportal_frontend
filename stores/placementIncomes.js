"use client";

import { create } from "zustand";
import {
  listPlacementIncomes as apiListPlacementIncomes,
  getPlacementIncome as apiGetPlacementIncome,
  createPlacementIncome as apiCreatePlacementIncome,
  updatePlacementIncome as apiUpdatePlacementIncome,
  deletePlacementIncome as apiDeletePlacementIncome,
} from "../services/placementIncomes";

export const usePlacementIncomeStore = create((set, get) => ({
  items: [],
  total: 0,
  listParams: {},
  byId: {},
  loadingList: false,
  loadingItem: false,

  async list(params = {}) {
    set({ loadingList: true, listParams: params });
    try {
      const result = await apiListPlacementIncomes(params);
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
      const income = await apiGetPlacementIncome(id);
      set({ byId: { ...get().byId, [id]: income }, loadingItem: false });
      return income;
    } catch (error) {
      set({ loadingItem: false });
      throw error;
    }
  },

  async create(payload) {
    const income = await apiCreatePlacementIncome(payload);
    set({ byId: { ...get().byId, [income.id]: income } });
    return income;
  },

  async update(id, payload) {
    const updated = await apiUpdatePlacementIncome(id, payload);
    set({ byId: { ...get().byId, [id]: updated } });
    return updated;
  },

  async remove(id) {
    await apiDeletePlacementIncome(id);
    const nextById = { ...get().byId };
    delete nextById[id];
    set({ byId: nextById });
  },
}));
