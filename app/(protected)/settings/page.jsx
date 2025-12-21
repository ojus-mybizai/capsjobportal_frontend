"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useCommandStore } from "@/stores/command";
import { commands } from "@/components/command/commandRegistry";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import {
  listMaster,
  createMaster,
  updateMaster,
  deleteMaster,
} from "@/services/masters";

export default function SettingsPage() {
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const user = useAuthStore((state) => state.user);
  const setCommandPaletteEnabled = useCommandStore((state) => state.setEnabled);
  const openCommandPalette = useCommandStore((state) => state.open);

  const [compactTables, setCompactTables] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const [commandPaletteEnabled, setCommandPaletteEnabledState] = useState(true);
  const [commandFilter, setCommandFilter] = useState("");
  const [masterType, setMasterType] = useState("skill");
  const [masterItems, setMasterItems] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSavingId, setMasterSavingId] = useState(null);
  const [newMasterName, setNewMasterName] = useState("");

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

  useEffect(() => {
    let active = true;
    async function load() {
      setMasterLoading(true);
      try {
        const data = await listMaster(masterType);
        if (!active) return;
        setMasterItems(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load master data",
          description:
            (error && error.message) ||
            `Could not load ${masterType} masters.`,
        });
      } finally {
        if (active) setMasterLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [masterType, pushToast]);

  const masterTypes = [
    { value: "skill", label: "Skills" },
    { value: "education", label: "Education" },
    { value: "degree", label: "Degrees" },
    { value: "location", label: "Locations" },
    { value: "job_category", label: "Job categories" },
    { value: "experience_level", label: "Experience levels" },
  ];

  async function handleCreateMaster(event) {
    event.preventDefault();
    const name = (newMasterName || "").trim();
    if (!name) return;
    setMasterSavingId("new");
    try {
      await createMaster(masterType, { name });
      setNewMasterName("");
      const data = await listMaster(masterType);
      setMasterItems(Array.isArray(data) ? data : []);
      pushToast({ title: "Created", description: `${name} added to ${masterType}.` });
    } catch (error) {
      pushToast({
        title: "Create failed",
        description: (error && error.message) || "Could not create master item.",
      });
    } finally {
      setMasterSavingId(null);
    }
  }

  async function handleUpdateMaster(id, name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    setMasterSavingId(id);
    try {
      await updateMaster(masterType, id, { name: trimmed });
      const data = await listMaster(masterType);
      setMasterItems(Array.isArray(data) ? data : []);
      pushToast({ title: "Updated", description: "Master item updated." });
    } catch (error) {
      pushToast({
        title: "Update failed",
        description: (error && error.message) || "Could not update master item.",
      });
    } finally {
      setMasterSavingId(null);
    }
  }

  async function handleDeleteMaster(id) {
    const confirm = window.confirm("Delete this item?");
    if (!confirm) return;
    setMasterSavingId(id);
    try {
      await deleteMaster(masterType, id);
      setMasterItems((items) => items.filter((item) => item.id !== id));
      pushToast({ title: "Deleted", description: "Master item removed." });
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description: (error && error.message) || "Could not delete master item.",
      });
    } finally {
      setMasterSavingId(null);
    }
  }

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
          <div className="text-sm font-semibold text-slate-900">Master data</div>
          <div className="mt-1 text-xs text-slate-500">
            Create, rename, or delete master values. These power dropdowns across the app.
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-slate-700">Master type</div>
              <Select value={masterType} onChange={(e) => setMasterType(e.target.value)}>
                {masterTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <form onSubmit={handleCreateMaster} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <div className="text-[11px] font-medium text-slate-700">Add new</div>
                  <Input
                    value={newMasterName}
                    onChange={(e) => setNewMasterName(e.target.value)}
                    placeholder={`Add ${masterType}...`}
                  />
                </div>
                <Button type="submit" size="sm" disabled={masterSavingId === "new"}>
                  {masterSavingId === "new" ? "Saving..." : "Add"}
                </Button>
              </form>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {masterLoading ? (
              <div className="text-xs text-slate-500">Loading {masterType}...</div>
            ) : masterItems.length === 0 ? (
              <div className="text-xs text-slate-500">No items found.</div>
            ) : (
              <div className="space-y-2">
                {masterItems.map((item) => (
                  <div
                    key={item.id || item.name}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-xs"
                  >
                    <input
                      type="text"
                      defaultValue={item.name || item.label}
                      className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] font-medium text-slate-800 outline-none focus:border-[var(--accent)]"
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next && next !== (item.name || item.label)) {
                          handleUpdateMaster(item.id, next);
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={masterSavingId === item.id}
                        onClick={() => handleDeleteMaster(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
