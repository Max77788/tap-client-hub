"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { CLIENTS, STAFF, SERVICE_META } from "@/lib/data";
import { useClientsState } from "@/hooks/use-clients-state";
import type { ServiceKey } from "@/lib/types";

interface TimeEntry {
  id: string;
  clientName: string;
  clientId: string;
  personName: string;
  personId: string;
  serviceKey: string;
  serviceLabel: string;
  duration: number;
  date: string;
  note: string;
  edited?: boolean;
}

export default function TimePage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"who" | "client" | "task" | null>(null);
  const [viewingAs, setViewingAs] = useState("tushar");
  const [showTip, setShowTip] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Supabase clients (with localStorage fallback)
  const { clients: supabaseClients } = useClientsState();
  const clients = supabaseClients.length > 50 ? supabaseClients : CLIENTS;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tap-timesheet-entries");
      if (saved) setEntries(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("tap-timesheet-entries", JSON.stringify(entries));
    } catch {}
  }, [entries]);

  const startTimer = useCallback(() => {
    if (!selectedClient || !selectedPerson) return;
    setRunning(true);
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 200);
  }, [elapsed, selectedClient, selectedPerson]);

  const stopTimer = useCallback(() => {
    const client = clients.find((c) => c.id === selectedClient);
    const person = STAFF.find((s) => s.id === selectedPerson);
    if (elapsed > 0 && client && person) {
      const svc = selectedService
        ? SERVICE_META[selectedService as ServiceKey]
        : null;
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        clientName: client.name,
        clientId: client.id,
        personName: person.name,
        personId: person.id,
        serviceKey: selectedService,
        serviceLabel: svc?.label || "—",
        duration: elapsed,
        date: new Date().toISOString(),
        note: "",
      };
      setEntries((prev) => [entry, ...prev]);
    }
    setRunning(false);
    setElapsed(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [elapsed, selectedClient, selectedPerson, selectedService]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter((e) => e.date.slice(0, 10) === today);
  const todayTotalSecs = todayEntries.reduce((s, e) => s + e.duration, 0);

  // Per-person totals for today
  const personTotals: Record<string, number> = {};
  todayEntries.forEach((e) => {
    personTotals[e.personName] = (personTotals[e.personName] || 0) + e.duration;
  });
  const topPeople = Object.entries(personTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  function formatTimer(seconds: number): string {
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

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntry(id: string, field: string, value: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === "who") {
          const person = STAFF.find((s) => s.name === value);
          return { ...e, personName: value, personId: person?.id || "", edited: true };
        }
        if (field === "client") return { ...e, clientName: value, edited: true };
        if (field === "task") return { ...e, serviceLabel: value, edited: true };
        return e;
      })
    );
    setEditingId(null);
    setEditingField(null);
  }

  const viewingPerson = STAFF.find((s) => s.id === viewingAs) || STAFF[0];

  return (
    <div className="space-y-5">
      {/* Viewing as selector */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[11px] text-[var(--muted)] font-medium whitespace-nowrap">Viewing as</span>
        <select
          value={viewingAs}
          onChange={(e) => setViewingAs(e.target.value)}
          className="text-xs sm:text-xs rounded-lg px-2.5 py-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] font-medium cursor-pointer outline-none max-w-[200px] sm:max-w-none truncate"
        >
          {STAFF.map((s) => (
            <option key={s.id} value={s.id}>
              {s.role} - {s.name} (full access)
            </option>
          ))}
        </select>
      </div>

      {/* Notification tip */}
      {showTip && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm"
          style={{ backgroundColor: "#fef9e7", border: "1px solid #f5d76e", color: "#7d6608" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="flex-1 text-xs">
            Try this: open any client — flip Payroll or Sales Tax on, then check that service in the left menu. The client moves there automatically — nobody re-types anything.
          </span>
          <button onClick={() => setShowTip(false)} className="text-[#7d6608] hover:text-[#5a4706] text-lg leading-none ml-1">
            ×
          </button>
        </div>
      )}

      {/* Timer controls — responsive: stacked on mobile, horizontal row on desktop */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 p-4 sm:p-5 rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        {/* Row 1: WHO + CLIENT — stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* WHO */}
          <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[120px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Who</label>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              disabled={running}
              className="text-sm sm:text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50 w-full"
            >
              <option value="">-- choose --</option>
              {STAFF.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* CLIENT */}
          <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[180px] sm:max-w-[280px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={running}
              className="text-sm sm:text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50 w-full"
            >
              <option value="">-- choose client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: TASK (full width on mobile) */}
        <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[130px] sm:w-auto">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Task</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={running}
            className="text-sm sm:text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50 w-full"
          >
            <option value="">-- choose --</option>
            {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => (
              <option key={key} value={key}>{SERVICE_META[key].label}</option>
            ))}
          </select>
        </div>

        {/* Row 3: ELAPSED + START (side-by-side) */}
        <div className="flex flex-row items-end gap-3 w-full sm:w-auto">
          {/* ELAPSED */}
          <div className="flex flex-col gap-1 items-center shrink-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Elapsed</label>
            <span className={`text-[26px] sm:text-[28px] font-mono font-bold tracking-tight tabular-nums leading-none ${running ? "text-[var(--green)]" : "text-[var(--ink)]"}`}>
              {formatTimer(elapsed)}
            </span>
          </div>

          {/* START / STOP */}
          <button
            onClick={running ? stopTimer : startTimer}
            disabled={!running && (!selectedClient || !selectedPerson)}
            className={`flex items-center gap-2 px-5 py-2.5 sm:py-2.5 rounded-lg text-sm font-bold transition shadow-sm shrink-0 ${
              running
                ? "bg-[var(--red)] text-white hover:opacity-90"
                : "text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
            style={running ? {} : { backgroundColor: "#2f7d4f" }}
          >
            {running ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Start
              </>
            )}
          </button>
        </div>

        {running && (
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-2">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--green)" }} />
            <span className="text-xs text-[var(--muted)]">
              {clients.find(c => c.id === selectedClient)?.name} · {STAFF.find(s => s.id === selectedPerson)?.name}
            </span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <span className="text-[24px] sm:text-[28px] font-bold text-[var(--ink)] leading-none">{formatDuration(todayTotalSecs)}</span>
          <span className="text-[11px] text-[var(--muted)] mt-1">Logged today</span>
        </div>
        {topPeople.map(([name, secs]) => (
          <div key={name} className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
            <span className="text-[24px] sm:text-[28px] font-bold text-[var(--ink)] leading-none">{formatDuration(secs)}</span>
            <span className="text-[11px] text-[var(--muted)] mt-1">{name}</span>
          </div>
        ))}
        {topPeople.length < 3 &&
          Array.from({ length: 3 - topPeople.length }).map((_, i) => (
            <div key={`empty-${i}`} className="p-4 rounded-xl flex flex-col opacity-30" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
              <span className="text-[28px] font-bold text-[var(--ink)] leading-none">0m</span>
              <span className="text-[11px] text-[var(--muted)] mt-1">--</span>
            </div>
          ))}
      </div>

      {/* Today's entries */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">
          Today&apos;s entries
        </h3>
        <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          {todayEntries.length > 0 ? (
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Who</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Task</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Time</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">When</th>
                  <th className="w-0 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {todayEntries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[var(--teal-soft)]/50 transition-colors"
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      {/* WHO */}
                      <td className="px-5 py-3">
                        {isEditing && editingField === "who" ? (
                          <select
                            defaultValue={entry.personName}
                            onChange={(e) => updateEntry(entry.id, "who", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }}
                            autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full"
                          >
                            {STAFF.map((s) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="text-[var(--ink)] font-medium cursor-pointer hover:text-[var(--teal)]"
                            onClick={() => { setEditingId(entry.id); setEditingField("who"); }}
                          >
                            {entry.personName}
                          </span>
                        )}
                      </td>

                      {/* CLIENT */}
                      <td className="px-5 py-3">
                        {isEditing && editingField === "client" ? (
                          <select
                            defaultValue={entry.clientName}
                            onChange={(e) => updateEntry(entry.id, "client", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }}
                            autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full"
                          >
                            {clients.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="text-[var(--muted)] cursor-pointer hover:text-[var(--teal)]"
                            onClick={() => { setEditingId(entry.id); setEditingField("client"); }}
                          >
                            {entry.clientName.length > 35 ? entry.clientName.slice(0, 33) + "..." : entry.clientName}
                          </span>
                        )}
                      </td>

                      {/* TASK */}
                      <td className="px-5 py-3">
                        {isEditing && editingField === "task" ? (
                          <select
                            defaultValue={entry.serviceLabel}
                            onChange={(e) => updateEntry(entry.id, "task", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }}
                            autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full"
                          >
                            {Object.values(SERVICE_META).map((m) => (
                              <option key={m.label} value={m.label}>{m.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="text-[var(--muted)] cursor-pointer hover:text-[var(--teal)]"
                            onClick={() => { setEditingId(entry.id); setEditingField("task"); }}
                          >
                            {entry.serviceLabel}
                          </span>
                        )}
                      </td>

                      {/* TIME */}
                      <td className="px-5 py-3 text-right">
                        <span className="font-mono text-[var(--teal)] font-medium">{formatDuration(entry.duration)}</span>
                      </td>

                      {/* WHEN */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs text-[var(--muted)]">Today</span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => { setEditingId(entry.id); setEditingField("who"); }}
                          className="text-[11px] text-[var(--muted)] hover:text-[var(--teal)] mr-2"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-[11px] text-[var(--muted)] hover:text-[var(--red)]"
                        >
                          delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--muted)]">No time entries today. Pick a client and hit Start.</p>
            </div>
          )}
        </div>
      </div>

      {/* All entries */}
      {entries.length > todayEntries.length && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">
            Earlier entries
          </h3>
          <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Who</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Task</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Time</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">When</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .filter((e) => e.date.slice(0, 10) !== today)
                  .slice(0, 20)
                  .map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-[var(--teal-soft)]/50 transition-colors"
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      <td className="px-5 py-3 font-medium text-[var(--ink)]">{entry.personName}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{entry.clientName.length > 35 ? entry.clientName.slice(0, 33) + "..." : entry.clientName}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{entry.serviceLabel}</td>
                      <td className="px-5 py-3 text-right font-mono text-[var(--teal)] font-medium">{formatDuration(entry.duration)}</td>
                      <td className="px-5 py-3 text-right text-xs text-[var(--muted)]">
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-[11px] text-[var(--muted)] leading-relaxed pt-1 pb-6">
        Lean &amp; live: pick a client, hit Start, the clock runs in real time. Stop logs it — built to replace the separate QuickBooks Time subscription. Entries are editable — anyone can fix their own time (wrong client, fat-fingered minutes, forgot to stop) without asking an admin; corrected rows show an &quot;edited&quot; tag. Profitability (time vs. fee) and baseline standard-times come as the first enhancement.
      </div>
    </div>
  );
}
