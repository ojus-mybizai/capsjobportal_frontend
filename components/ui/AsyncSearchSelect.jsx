"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AsyncSearchSelect({
  value,
  onChange,
  loadOptions,
  getOptionLabel,
  getOptionValue,
  placeholder = "Select...",
  searchPlaceholder = "Type to search...",
  disabled = false,
  selectedLabel,
  resolveSelectedLabel,
  onSelectOption,
  onCreateOption,
  createLabel = "Add",
  allowClear = true,
  debounceMs = 300,
  limit = 20,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");
  const [resolvedLabel, setResolvedLabel] = useState("");

  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const resolveAbortRef = useRef(null);

  const currentLabel = useMemo(() => {
    if (selectedLabel) return selectedLabel;
    if (resolvedLabel) return resolvedLabel;
    if (!value) return "";
    return "";
  }, [selectedLabel, resolvedLabel, value]);

  useEffect(() => {
    let active = true;

    async function resolve() {
      if (!value) {
        setResolvedLabel("");
        return;
      }

      if (selectedLabel) {
        setResolvedLabel("");
        return;
      }

      if (!resolveSelectedLabel) return;

      if (resolveAbortRef.current) {
        resolveAbortRef.current.abort();
      }

      const controller = new AbortController();
      resolveAbortRef.current = controller;

      try {
        const label = await resolveSelectedLabel({
          value: String(value),
          signal: controller.signal,
        });
        if (!active || controller.signal.aborted) return;
        setResolvedLabel(label ? String(label) : "");
      } catch {
        if (!active || controller.signal.aborted) return;
        setResolvedLabel("");
      }
    }

    resolve();
    return () => {
      active = false;
    };
  }, [value, selectedLabel, resolveSelectedLabel]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!loadOptions) return;

    setError("");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const result = await loadOptions({
          query: (query || "").trim(),
          limit,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setOptions(Array.isArray(result) ? result : []);
      } catch (e) {
        if (controller.signal.aborted) return;
        setOptions([]);
        setError((e && e.message) || "Failed to load options");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [open, query, loadOptions, debounceMs, limit]);

  function handleSelect(option) {
    const nextValue = option ? String(getOptionValue(option)) : "";
    if (onChange) onChange(nextValue);
    if (onSelectOption) onSelectOption(option);
    setOpen(false);
    setQuery("");
  }

  async function handleCreate() {
    const q = (query || "").trim();
    if (!q) return;
    if (!onCreateOption) return;
    if (disabled) return;

    setError("");
    setCreating(true);
    try {
      const created = await onCreateOption({ query: q });
      if (!created) return;
      handleSelect(created);
    } catch (e) {
      setError((e && e.message) || "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
          className={
            "flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 text-sm text-left outline-none ring-0 focus:border-[var(--accent)] " +
            (disabled ? "opacity-60" : "")
          }
        >
          <span className={currentLabel ? "text-[var(--text)]" : "text-slate-400"}>
            {currentLabel || placeholder}
          </span>
          <span className="ml-2 text-xs text-slate-500">▾</span>
        </button>

        {allowClear && value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (onChange) onChange("");
              if (onSelectOption) onSelectOption(null);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] shadow-lg shadow-black/10">
          <div className="p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
          </div>

          <div className="max-h-56 overflow-y-auto px-2 pb-2 text-sm">
            {loading ? (
              <div className="px-2 py-2 text-xs text-slate-500">Loading...</div>
            ) : null}

            {error ? (
              <div className="px-2 py-2 text-xs text-[var(--danger)]">{error}</div>
            ) : null}

            {!loading && !error && options.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-500">No results</div>
            ) : null}

            {!loading && !error && options.length > 0 ? (
              <ul className="space-y-1">
                {options.map((opt) => {
                  const optValue = String(getOptionValue(opt));
                  const label = getOptionLabel(opt);
                  const isSelected = value && String(value) === optValue;

                  return (
                    <li key={optValue}>
                      <button
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={
                          "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--bg-muted)] " +
                          (isSelected ? "bg-[var(--bg-muted)] font-semibold" : "")
                        }
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {onCreateOption && (query || "").trim() && !disabled ? (
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={creating}
                  onClick={handleCreate}
                >
                  {creating ? "Adding..." : `${createLabel} \"${(query || "").trim()}\"`}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
