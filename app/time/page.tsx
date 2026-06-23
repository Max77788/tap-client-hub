"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SERVICE_META } from "@/lib/data";
import { useClientsState } from "@/hooks/use-clients-state";
import type { ServiceKey } from "@/lib/types";
import { PageSkeleton } from "@/components/loading-skeleton";

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

interface StaffMember { id: string; name: string; role: string; }

export default function TimePage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"who" | "client" | "task" | "note" | null>(null);
  const [viewingAs, setViewingAs] = useState("");
  const [showTip, setShowTip] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const { clients, loading: clientsLoading } = useClientsState();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          const members = data.map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
          setStaff(members);
          const me = members.find((m: any) => m.name.toLowerCase().includes("tushar")) || members[0];
          if (me) setViewingAs(me.id);
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/time-entries");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.entries) {
          setEntries(data.entries.map((e: any) => ({
            id: e.id, clientName: e.clientName || "", clientId: e.clientId || "",
            personName: e.personName || "", personId: e.personId || "",
            serviceKey: "", serviceLabel: e.serviceLabel || "",
            duration: e.duration || 0, date: e.date || "",
            note: e.note || "", edited: e.edited || false,
          })));
        }
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, []);

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
    const person = staff.find((s) => s.id === selectedPerson);
    if (elapsed > 0 && client && person) {
      const svc = selectedService ? SERVICE_META[selectedService as ServiceKey] : null;
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        clientName: client.name, clientId: client.id,
        personName: person.name, personId: person.id,
        serviceKey: selectedService, serviceLabel: svc?.label || "-",
        duration: elapsed, date: new Date().toISOString(), note,
      };
      setEntries((prev) => [entry, ...prev]);
      fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          who: person.id, client_id: client.id,
          task: svc?.label || "", seconds: elapsed,
          started_at: new Date().toISOString(), note,
        }),
      }).catch(() => {});
    }
    setRunning(false);
    setElapsed(0);
    setNote("");
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, [elapsed, selectedClient, selectedPerson, selectedService, note, clients, staff]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Filter entries by viewed person
  const filteredEntries = viewingAs
    ? entries.filter((e) => e.personId === viewingAs || !viewingAs)
    : entries;

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = filteredEntries.filter((e) => e.date.slice(0, 10) === today);
  const todayTotalSecs = todayEntries.reduce((s, e) => s + e.duration, 0);

  // Weekly totals
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEntries = filteredEntries.filter((e) => e.date.slice(0, 10) >= weekStartStr);
  const weekTotalSecs = weekEntries.reduce((s, e) => s + e.duration, 0);

  const personTotals: Record<string, number> = {};
  todayEntries.forEach((e) => { personTotals[e.personName] = (personTotals[e.personName] || 0) + e.duration; });
  const topPeople = Object.entries(personTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);

  function formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  async function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    fetch(`/api/time-entries?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  function updateEntry(id: string, field: string, value: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === "who") {
          const person = staff.find((s) => s.name === value);
          return { ...e, personName: value, personId: person?.id || "", edited: true };
        }
        if (field === "client") return { ...e, clientName: value, edited: true };
        if (field === "task") return { ...e, serviceLabel: value, edited: true };
        if (field === "note") return { ...e, note: value, edited: true };
        return e;
      })
    );
    setEditingId(null);
    setEditingField(null);
  }

  if (loading || clientsLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      {/* Viewing as */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[11px] text-[var(--muted)] font-medium whitespace-nowrap">Viewing as</span>
        <select value={viewingAs} onChange={(e) => setViewingAs(e.target.value)}
          className="text-xs rounded-lg px-2.5 py-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] font-medium cursor-pointer outline-none max-w-[200px] truncate">
          {staff.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      </div>

      {/* Tip */}
      {showTip && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "#fef9e7", border: "1px solid #f5d76e", color: "#7d6608" }}>
          <span className="flex-1 text-xs">Live time tracker: pick a person and client, hit Start. Stop logs it to Supabase. Add notes for what was worked on. Entries are editable by anyone.</span>
          <button onClick={() => setShowTip(false)} className="text-[#7d6608] hover:text-[#5a4706] text-lg leading-none ml-1">x</button>
        </div>
      )}

      {/* Timer controls */}
      <div className="flex flex-col gap-3 p-5 rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[120px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Who</label>
            <select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} disabled={running}
              className="text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50 w-full">
              <option value="">-- choose --</option>
              {staff.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[200px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</label>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} disabled={running}
              className="text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50 w-full">
              <option value="">-- choose client --</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[130px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Task</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} disabled={running}
              className="text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50 w-full">
              <option value="">-- choose --</option>
              {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => (<option key={key} value={key}>{SERVICE_META[key].label}</option>))}
            </select>
          </div>
        </div>

        {/* Note input */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Note (what are you working on?)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} disabled={running}
            placeholder="e.g. Q2 payroll reconciliation" className="text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-[var(--teal)] disabled:opacity-50 w-full" />
        </div>

        {/* Timer + button */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1 items-center shrink-0">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Elapsed</label>
            <span className={`text-[28px] font-mono font-bold tracking-tight tabular-nums leading-none ${running ? "text-[var(--green)]" : "text-[var(--ink)]"}`}>
              {formatTimer(elapsed)}
            </span>
          </div>
          <button onClick={running ? stopTimer : startTimer}
            disabled={!running && (!selectedClient || !selectedPerson)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-sm shrink-0 ${running ? "bg-[var(--red)] text-white hover:opacity-90" : "text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"}`}
            style={running ? {} : { backgroundColor: "var(--green)" }}>
            {running ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>Stop</>)
            : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>Start</>)}
          </button>
          {running && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--green)" }} />
              <span className="text-xs text-[var(--muted)]">{clients.find(c => c.id === selectedClient)?.name} · {staff.find(s => s.id === selectedPerson)?.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <span className="text-[24px] font-bold text-[var(--ink)] leading-none">{formatDuration(todayTotalSecs)}</span>
          <span className="text-[11px] text-[var(--muted)] mt-1">Logged today</span>
        </div>
        <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <span className="text-[24px] font-bold text-[var(--ink)] leading-none">{formatDuration(weekTotalSecs)}</span>
          <span className="text-[11px] text-[var(--muted)] mt-1">This week</span>
        </div>
        {topPeople.slice(0, 2).map(([name, secs]) => (
          <div key={name} className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
            <span className="text-[24px] font-bold text-[var(--ink)] leading-none">{formatDuration(secs)}</span>
            <span className="text-[11px] text-[var(--muted)] mt-1">{name}</span>
          </div>
        ))}
        {topPeople.length < 2 && Array.from({ length: 2 - topPeople.length }).map((_, i) => (
          <div key={`empty-${i}`} className="p-4 rounded-xl flex flex-col opacity-30" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
            <span className="text-[24px] font-bold text-[var(--ink)] leading-none">0m</span>
            <span className="text-[11px] text-[var(--muted)] mt-1">--</span>
          </div>
        ))}
      </div>

      {/* Today's entries */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Today's entries</h3>
        <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          {todayEntries.length > 0 ? (
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Who</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Task</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Note</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Time</th>
                <th className="w-0 px-3 py-3" />
              </tr></thead>
              <tbody>
                {todayEntries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  return (
                    <tr key={entry.id} className="hover:bg-[var(--teal-soft)]/50 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="px-4 py-3">
                        {isEditing && editingField === "who" ? (
                          <select defaultValue={entry.personName} onChange={(e) => updateEntry(entry.id, "who", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }} autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full">
                            {staff.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                          </select>
                        ) : (
                          <span className="text-[var(--ink)] font-medium cursor-pointer hover:text-[var(--teal)] whitespace-nowrap"
                            onClick={() => { setEditingId(entry.id); setEditingField("who"); }}>{entry.personName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        {isEditing && editingField === "client" ? (
                          <select defaultValue={entry.clientName} onChange={(e) => updateEntry(entry.id, "client", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }} autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full">
                            {clients.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                          </select>
                        ) : (
                          <span className="text-[var(--muted)] cursor-pointer hover:text-[var(--teal)]" style={{ wordBreak: "break-word" }}
                            onClick={() => { setEditingId(entry.id); setEditingField("client"); }}>{entry.clientName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing && editingField === "task" ? (
                          <select defaultValue={entry.serviceLabel} onChange={(e) => updateEntry(entry.id, "task", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }} autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full">
                            {Object.values(SERVICE_META).map((m) => (<option key={m.label} value={m.label}>{m.label}</option>))}
                          </select>
                        ) : (
                          <span className="text-[var(--muted)] cursor-pointer hover:text-[var(--teal)] whitespace-nowrap"
                            onClick={() => { setEditingId(entry.id); setEditingField("task"); }}>{entry.serviceLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {isEditing && editingField === "note" ? (
                          <input defaultValue={entry.note} onChange={(e) => updateEntry(entry.id, "note", e.target.value)}
                            onBlur={() => { setEditingId(null); setEditingField(null); }} autoFocus
                            className="text-xs rounded px-1.5 py-1 border border-[var(--line)] bg-white text-[var(--ink)] outline-none w-full"
                            placeholder="Add note..." />
                        ) : (
                          <span className="text-[11px] text-[var(--muted)] cursor-pointer hover:text-[var(--teal)] italic"
                            style={{ wordBreak: "break-word" }}
                            onClick={() => { setEditingId(entry.id); setEditingField("note"); }}>
                            {entry.note || "Add note..."}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right"><span className="font-mono text-[var(--teal)] font-medium">{formatDuration(entry.duration)}</span></td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button onClick={() => { setEditingId(entry.id); setEditingField("who"); }} className="text-[11px] text-[var(--muted)] hover:text-[var(--teal)] mr-2">edit</button>
                        <button onClick={() => deleteEntry(entry.id)} className="text-[11px] text-[var(--muted)] hover:text-[var(--red)]">delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center"><p className="text-sm text-[var(--muted)]">No time entries today. Pick a client and hit Start.</p></div>
          )}
        </div>
      </div>

      {/* Earlier entries */}
      {filteredEntries.length > todayEntries.length && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Earlier entries</h3>
          <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Who</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Task</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Note</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Time</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">When</th>
              </tr></thead>
              <tbody>
                {filteredEntries.filter((e) => e.date.slice(0, 10) !== today).slice(0, 30).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--teal-soft)]/50 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="px-4 py-3 font-medium text-[var(--ink)] whitespace-nowrap">{entry.personName}</td>
                    <td className="px-4 py-3 text-[var(--muted)] max-w-[280px]" style={{ wordBreak: "break-word" }}>{entry.clientName}</td>
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">{entry.serviceLabel}</td>
                    <td className="px-4 py-3 text-[11px] text-[var(--muted)] italic max-w-[200px]" style={{ wordBreak: "break-word" }}>{entry.note || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--teal)] font-medium">{formatDuration(entry.duration)}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--muted)] whitespace-nowrap">{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
