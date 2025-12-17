"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useCommandStore } from "@/stores/command";
import { commands } from "@/components/command/commandRegistry";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const user = useAuthStore((state) => state.user);
  const setCommandPaletteEnabled = useCommandStore((state) => state.setEnabled);
  const openCommandPalette = useCommandStore((state) => state.open);

  const [compactTables, setCompactTables] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const [commandPaletteEnabled, setCommandPaletteEnabledState] = useState(true);
  const [commandFilter, setCommandFilter] = useState("");

  useEffect(() => {
    setPageMetadata("Settings", "User profile and basic preferences");
  }, [setPageMetadata]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("caps_settings");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.compactTables === "boolean") {
        setCompactTables(parsed.compactTables);
      }
      if (typeof parsed.showExperimental === "boolean") {
        setShowExperimental(parsed.showExperimental);
      }
      if (typeof parsed.commandPaletteEnabled === "boolean") {
        setCommandPaletteEnabledState(parsed.commandPaletteEnabled);
        setCommandPaletteEnabled(parsed.commandPaletteEnabled);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = { compactTables, showExperimental, commandPaletteEnabled };
    window.localStorage.setItem("caps_settings", JSON.stringify(payload));
    setCommandPaletteEnabled(commandPaletteEnabled);
  }, [compactTables, showExperimental, commandPaletteEnabled, setCommandPaletteEnabled]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="text-sm font-semibold text-slate-900">Profile</div>
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <div className="space-y-2 text-xs text-slate-700">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Name
              </div>
              <div>{(user && user.name) || "Unknown"}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Email
              </div>
              <div>{(user && user.email) || "Not provided"}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Role
              </div>
              <div>{(user && user.role) || "viewer"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
          <div className="text-sm font-semibold text-slate-900">Preferences</div>
          <div className="mt-1 text-xs text-slate-500">
            These preferences are stored only in this browser.
          </div>
          <div className="mt-3 space-y-3 text-xs text-slate-700">
            <label className="flex items-center justify-between gap-3">
              <span>Use compact spacing for tables</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-[var(--border)]"
                checked={compactTables}
                onChange={(e) => setCompactTables(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Show experimental features (when available)</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-[var(--border)]"
                checked={showExperimental}
                onChange={(e) => setShowExperimental(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Enable command palette (press / to open)</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-[var(--border)]"
                checked={commandPaletteEnabled}
                onChange={(e) => setCommandPaletteEnabledState(e.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
          <div className="text-sm font-semibold text-slate-900">Command palette</div>
          <div className="mt-1 text-xs text-slate-500">
            Press <span className="font-medium text-slate-700">/</span> to open. Type to search.
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-medium text-slate-700">Search commands</div>
            <Input
              value={commandFilter}
              onChange={(e) => setCommandFilter(e.target.value)}
              placeholder="Search (e.g. add job, /adj, payments...)"
              className="mt-1"
            />
          </div>
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => openCommandPalette()}>
              Open command palette
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="text-sm font-semibold text-slate-900">Available commands</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {commands
            .slice()
            .sort((a, b) => String(a.trigger).localeCompare(String(b.trigger)))
            .filter((cmd) => {
              const q = String(commandFilter || "").trim().toLowerCase();
              if (!q) return true;
              const trigger = String(cmd.trigger || "").toLowerCase();
              const desc = String(cmd.description || "").toLowerCase();
              return trigger.includes(q) || desc.includes(q);
            })
            .map((cmd) => (
              <div
                key={cmd.id || cmd.trigger}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              >
                <div className="text-xs font-semibold text-slate-900">{cmd.trigger}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{cmd.description}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
