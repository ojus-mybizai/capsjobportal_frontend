"use client";

import { create } from "zustand";

export const useCommandStore = create((set) => ({
  isOpen: false,
  query: "",
  enabled: true,

  open() {
    set({ isOpen: true });
  },

  close() {
    set({ isOpen: false, query: "" });
  },

  setQuery(query) {
    set({ query });
  },

  setEnabled(enabled) {
    set({ enabled: !!enabled });
  },
}));
