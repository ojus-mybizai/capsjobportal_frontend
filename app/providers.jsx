"use client";

import { useEffect } from "react";
import CommandPanel from "@/components/command/CommandPanel";
import { useCommandStore } from "@/stores/command";

export default function AppProviders({ children }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("caps_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.commandPaletteEnabled === "boolean") {
          useCommandStore.getState().setEnabled(parsed.commandPaletteEnabled);
        }
      }
    } catch {
      // ignore
    }

    function handleKeyDown(event) {
      const state = useCommandStore.getState();
      const { open, close, isOpen } = state;
      const enabled = state.enabled !== false;

      const isSlash = event.key === "/" || event.code === "Slash";
      const isCtrlK = (event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey);

      if ((isSlash && !event.metaKey && !event.ctrlKey && !event.altKey) || isCtrlK) {
        if (!enabled) return;
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable)
        ) {
          return;
        }

        event.preventDefault();
        open();
        return;
      }

      if (event.key === "Escape") {
        if (isOpen) {
          event.preventDefault();
          close();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return (
    <>
      {children}
      <CommandPanel />
    </>
  );
}
