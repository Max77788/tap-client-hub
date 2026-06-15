"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CLIENTS, STAFF } from "@/lib/data";

interface TimeEntry {
  id: string;
  clientName: string;
  personName: string;
  duration: number; // seconds
  date: string;
}

export default function TimePage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── Timer logic ──
  const startTimer = useCallback(() => {
    if (!selectedClient || !selectedPerson) return;
    setRunning(true);
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [elapsed, selectedClient, selectedPerson]);

  const stopTimer = useCallback(() => {
    // Save entry
    const client = CLIENTS.find((c) => c.id === selectedClient);
    const person = STAFF.find((s) => s.id === selectedPerson);
    if (elapsed > 0 && client && person) {
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        clientName: client.name,
        personName: person.name,
        duration: elapsed,
        date: new Date().toISOString(),
      };
      setEntries((prev) => [entry, ...prev]);
    }
    setRunning(false);
    setElapsed(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [elapsed, selectedClient, selectedPerson]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Format helpers ──
  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1
          className="text-xl font-semibold text-[var(--ink)] m-0"
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
        >
          Timesheet
        </h1>
        <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
          Track time against client engagements with a live timer
        </p>
      </div>

      {/* ── Timer card ── */}
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Timer display */}
          <div
            className="text-6xl font-mono font-bold tracking-wider select-none"
            style={{ color: running ? "var(--green)" : "var(--ink)" }}
          >
            {formatTime(elapsed)}
          </div>

          {/* Running indicator */}
          {running && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--green)" }}
              />
              <span className="text-xs font-medium" style={{ color: "var(--green)" }}>
                Timing — {selectedClient
                  ? CLIENTS.find(c => c.id === selectedClient)?.name
                  : "—"}
                {selectedPerson ? ` · ${STAFF.find(s => s.id === selectedPerson)?.name}` : ""}
              </span>
            </div>
          )}

          {/* Selectors */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={running}
              className="flex-1 text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50"
            >
              <option value="">Select client…</option>
              {CLIENTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              disabled={running}
              className="flex-1 text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50"
            >
              <option value="">Select person…</option>
              {STAFF.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start/Stop button */}
          <button
            onClick={running ? stopTimer : startTimer}
            disabled={!running && (!selectedClient || !selectedPerson)}
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all ${
              running
                ? "bg-[var(--red)] text-white hover:opacity-90"
                : "bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {running ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Recent entries table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--line)" }}>
          <h3 className="text-sm font-semibold text-[var(--ink)] m-0">
            Recent Time Entries
          </h3>
        </div>
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Client
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Person
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Duration
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-[var(--teal-soft)] transition-colors"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <td className="px-5 py-3 font-medium text-[var(--ink)]">
                      {entry.clientName}
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)]">
                      {entry.personName}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[var(--teal)]">
                      {formatDuration(entry.duration)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[var(--muted)]">
                      {new Date(entry.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted)]">
              No time entries yet. Start the timer to begin tracking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
