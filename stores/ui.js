"use client";

import { create } from "zustand";

let idCounter = 0;

export const useUIStore = create((set, get) => ({
  sidebarOpen: true,
  pageTitle: "",
  pageDescription: "",
  toasts: [],

  toggleSidebar() {
    set({ sidebarOpen: !get().sidebarOpen });
  },

  setSidebarOpen(open) {
    set({ sidebarOpen: open });
  },

  setPageMetadata(title, description) {
    set({ pageTitle: title || "", pageDescription: description || "" });
  },

  pushToast(toast) {
    const id = ++idCounter;
    const next = { id, ...toast };
    set({ toasts: [...get().toasts, next] });
    return id;
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
