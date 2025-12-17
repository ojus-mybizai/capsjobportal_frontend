"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommandStore } from "@/stores/command";
import { commands, getCommandForInput } from "./commandRegistry";

export default function CommandPanel() {
  const router = useRouter();
  const isOpen = useCommandStore((state) => state.isOpen);
  const query = useCommandStore((state) => state.query);
  const setQuery = useCommandStore((state) => state.setQuery);
  const close = useCommandStore((state) => state.close);

  const inputRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (!query) {
        setQuery("/");
      }
      if (inputRef.current) {
        inputRef.current.focus();
        const length = inputRef.current.value.length;
        try {
          inputRef.current.setSelectionRange(length, length);
        } catch {
          inputRef.current.selectionStart = length;
          inputRef.current.selectionEnd = length;
        }
      }
    }
    if (!isOpen) {
      setError("");
    }
  }, [isOpen, query, setQuery]);

  function handleClose() {
    close();
    setQuery("");
    setError("");
  }

  function runCommand(command, rawQuery) {
    if (!command) return;
    command.run({
      query: rawQuery,
      router,
      close: handleClose,
    });
  }

  const suggestions = useMemo(() => {
    const value = (query || "").trim().toLowerCase();
    if (!value) return commands;

    return commands.filter((cmd) => {
      const trigger = cmd.trigger.toLowerCase();
      const description = (cmd.description || "").toLowerCase();
      return trigger.startsWith(value) || description.includes(value);
    });
  }, [query]);

  function handleSubmit(event) {
    event.preventDefault();
    const value = (query || "").trim();

    if (!value) {
      handleClose();
      return;
    }

    const match = getCommandForInput(value);
    if (match && match.command) {
      runCommand(match.command, value);
      return;
    }

    const fallback = suggestions && suggestions.length ? suggestions[0] : null;
    if (fallback) {
      runCommand(fallback, value);
      return;
    }

    setError("Unknown command");
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key === "Backspace") {
      const value = event.currentTarget.value || "";
      const { selectionStart, selectionEnd } = event.currentTarget;
      if (value === "/" && selectionStart === 1 && selectionEnd === 1) {
        event.preventDefault();
        handleClose();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg shadow-black/10"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <div className="flex items-center justify-center rounded-md bg-[var(--bg-muted)] px-2 py-1 text-[11px] text-slate-500">
              /
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command… (/addcandidate, /addjob, /search python developer)"
              className="flex-1 border-none bg-transparent text-sm text-[var(--text)] placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={handleClose}
              className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] text-slate-500 hover:bg-[var(--bg-muted)]"
              aria-label="Close command palette"
            >
              ×
            </button>
          </div>
        </form>

        <div className="max-h-64 overflow-y-auto px-3 py-2 text-xs">
          {error ? (
            <p className="mb-2 text-[11px] text-[var(--danger)]">{error}</p>
          ) : null}

          {suggestions && suggestions.length > 0 ? (
            <ul className="space-y-1">
              {suggestions.map((cmd) => (
                <li
                  key={cmd.id || cmd.trigger}
                  className="rounded-md"
                >
                  <button
                    type="button"
                    onClick={() => runCommand(cmd, cmd.trigger)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] text-slate-600 hover:bg-[var(--bg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--text)]">{cmd.trigger}</span>
                      <span className="text-[11px] text-slate-500">{cmd.description}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 py-1 text-[11px] text-slate-500">No matching commands</p>
          )}
        </div>
      </div>
    </div>
  );
}
