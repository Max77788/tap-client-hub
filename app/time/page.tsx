"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  duration: number;       // 0 = still running, >0 = stopped
  date: string;           // started_at from DB
  note: string;
  edited?: boolean;
  isRunning?: boolean;    // derived: duration === 0
}

interface StaffMember { id: string; name: string; role: string; }

const TASK_LABEL: Record<string, string> = {
  ...Object.fromEntries(
    (Object.keys(SERVICE_META) as ServiceKey[]).map((k) => [k, (SERVICE_META as any)[k]?.label || k]),
  ),
  admin: "Admin / Other",
};

function shortName(n: string) {
  return n.length > 26 ? n.slice(0, 24) + "\u2026" : n;
}

function fmtDur(s: number) {
  if (s <= 0) return "0m";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + "h " : "") + m + "m";
}

function fmtClock(s: number) {
  const p = (n: number) => String(n).padStart(2, "0");
  return p(Math.floor(s / 3600)) + ":" + p(Math.floor((s % 3600) / 60)) + ":" + p(s % 60);
}

export default function TimePage() {
  // Timer form state
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedService, setSelectedService] = useState("fin");
  const [timerNote, setTimerNote] = useState("");

  // Manual entry form
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [mWho, setMWho] = useState("");
  const [mClient, setMClient] = useState("");
  const [mTask, setMTask] = useState("fin");
  const [mHours, setMHours] = useState("");
  const [mMinutes, setMMinutes] = useState("");
  const [mNote, setMNote] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));

  // Table state
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [viewingAs, setViewingAs] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Live clock tick for running entries
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { clients, loading: clientsLoading } = useClientsState();

  // Tick every second so running entries' elapsed time updates
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Load staff
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setStaff(data.map((u: any) => ({ id: u.id, name: u.name, role: u.role })));
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load entries from API
  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries");
      if (!res.ok) return;
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries.map((e: any) => ({
          id: e.id,
          clientName: e.clientName || "", clientId: e.clientId || "",
          personName: e.personName || "", personId: e.personId || "",
          serviceKey: "", serviceLabel: e.serviceLabel || "",
          duration: e.duration || 0, date: e.date || "",
          note: e.note || "", edited: e.edited || false,
          isRunning: (e.duration || 0) === 0,
        })));
      }
    } catch {}
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function uid() {
    try { return crypto.randomUUID(); } catch { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  // ── Start: POST entry immediately to DB ──
  const startTimer = useCallback(async () => {
    if (!selectedClient || !selectedPerson) return;
    const client = clients.find((c) => c.id === selectedClient);
    const person = staff.find((s) => s.id === selectedPerson);
    if (!client || !person) return;

    const svc = (SERVICE_META as any)[selectedService];
    const entryId = uid();
    const now = new Date().toISOString();

    // Optimistic local add
    const entry: TimeEntry = {
      id: entryId,
      clientName: client.name, clientId: client.id,
      personName: person.name, personId: person.id,
      serviceKey: selectedService, serviceLabel: svc?.label || TASK_LABEL[selectedService] || "-",
      duration: 0, date: now, note: timerNote, isRunning: true,
    };
    setEntries((prev) => [entry, ...prev]);
    setTimerNote("");

    // Persist
    fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entryId,
        who: person.id, client_id: client.id,
        task: svc?.label || TASK_LABEL[selectedService] || "",
        seconds: 0, started_at: now, note: timerNote,
      }),
    }).catch((e) => console.error("Start save failed:", e));
  }, [selectedClient, selectedPerson, selectedService, timerNote, clients, staff]);

  // ── Stop: PATCH the entry with final seconds ──
  const stopEntry = useCallback(async (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry || !entry.isRunning) return;

    const elapsed = Math.floor((Date.now() - new Date(entry.date).getTime()) / 1000);

    // Optimistic update
    setEntries((prev) => prev.map((e) =>
      e.id === entryId ? { ...e, duration: elapsed, isRunning: false } : e
    ));

    fetch(`/api/time-entries?id=${encodeURIComponent(entryId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds: elapsed }),
    }).catch((e) => console.error("Stop save failed:", e));
  }, [entries]);

  // ── Manual entry submit ──
  function submitManualEntry() {
    const person = staff.find((s) => s.id === mWho);
    const client = clients.find((c) => c.id === mClient);
    const hours = parseInt(mHours) || 0;
    const minutes = parseInt(mMinutes) || 0;
    const duration = hours * 3600 + minutes * 60;
    if (!person || !client || duration <= 0) return;

    const svc = (SERVICE_META as any)[mTask];
    const entry: TimeEntry = {
      id: uid(),
      clientName: client.name, clientId: client.id,
      personName: person.name, personId: person.id,
      serviceKey: mTask, serviceLabel: svc?.label || TASK_LABEL[mTask] || "-",
      duration, date: `${mDate}T12:00:00.000Z`, note: mNote, isRunning: false,
    };
    setEntries((prev) => [entry, ...prev]);
    setMHours(""); setMMinutes(""); setMNote("");
    setMDate(new Date().toISOString().slice(0, 10));

    fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        who: person.id, client_id: client.id,
        task: svc?.label || TASK_LABEL[mTask] || "", seconds: duration,
        started_at: `${mDate}T12:00:00.000Z`, note: mNote,
      }),
    }).catch(() => {});
  }

  async function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    fetch(`/api/time-entries?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  function handleEdit(idx: number, field: string, value: string) {
    setEntries((prev) => prev.map((e, i) => i !== idx ? e : { ...e, [field]: value, edited: true }));
  }

  function saveEdit(origIdx: number) {
    setEditIdx(null);
    const entry = entries[origIdx];
    if (!entry) return;
    const person = staff.find((s) => s.name === entry.personName);
    const client = clients.find((c) => c.name === entry.clientName);
    fetch(`/api/time-entries?id=${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        who: person?.id || entry.personId,
        client_id: client?.id || entry.clientId,
        task: entry.serviceLabel,
        seconds: entry.duration,
        note: entry.note,
        started_at: entry.date,
        edited: true,
      }),
    }).catch(() => {});
  }

  // ── Derived data ──
  const today = new Date().toISOString().slice(0, 10);
  const displayEntries = useMemo(() => {
    let list = entries.filter((e) => e.date.slice(0, 10) === today);
    if (viewingAs) list = list.filter((e) => e.personId === viewingAs);
    // Sort: running first, then by date desc
    return [...list].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [entries, today, viewingAs]);

  const totalToday = displayEntries.reduce((s, e) => s + (e.isRunning ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000) : e.duration), 0);

  const byWho: Record<string, number> = {};
  displayEntries.forEach((e) => {
    const elapsed = e.isRunning ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000) : e.duration;
    byWho[e.personName] = (byWho[e.personName] || 0) + elapsed;
  });
  const whoCards = Object.keys(byWho).sort((a, b) => byWho[b] - byWho[a]);

  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients]);
  const whoOpts = useMemo(() => staff.filter((s) => s.name !== "Unassigned"), [staff]);
  const taskKeys = Object.keys(TASK_LABEL);

  if (loading || clientsLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      <style jsx>{`
        .tw-timer {
          display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px;
          background: var(--card); border: 1px solid var(--line);
          border-radius: 16px; padding: 18px 20px;
        }
        .tw-timer .fld { display: flex; flex-direction: column; gap: 6px; }
        .tw-timer label {
          font-size: 11px; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--muted);
        }
        .tw-timer select, .tw-timer textarea, .tw-timer input {
          padding: 9px 11px; border: 1px solid var(--line);
          border-radius: 9px; font: inherit; font-size: 14px;
          background: var(--card); color: var(--ink);
          cursor: pointer; outline: none; resize: vertical;
        }
        .tw-timer select { min-width: 140px; }
        .tw-timer textarea { width: 100%; min-height: 52px; cursor: text; }
        .tw-timer .tw-notes-row { width: 100%; flex-basis: 100%; }
        .tw-go {
          all: unset; cursor: pointer; background: var(--green);
          color: #fff; padding: 13px 24px; border-radius: 12px;
          font-weight: 700; font-size: 15px; white-space: nowrap;
        }
        .tw-go:disabled { opacity: 0.4; cursor: not-allowed; }
        .edit-inp { width: 42px; padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 13px; text-align: center; }
        .edit-sel { padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 13px; max-width: 200px; }
        .running-row { background: var(--green-soft); }
        .running-row:hover { background: #d4ede0 !important; }
        .stop-btn {
          all: unset; cursor: pointer; background: var(--red); color: #fff;
          padding: 5px 12px; border-radius: 7px; font-weight: 600; font-size: 12px;
        }
        .stop-btn:hover { opacity: 0.85; }
        @keyframes twpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: twpulse 1.1s infinite; display: inline-block; }
      `}</style>

      {/* ── Mode toggle ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
        <button onClick={() => setMode("timer")} style={{
          all: "unset", cursor: "pointer", padding: "10px 20px", borderRadius: "11px 11px 0 0",
          fontWeight: 600, fontSize: 14,
          background: mode === "timer" ? "var(--card)" : "transparent",
          color: mode === "timer" ? "var(--ink)" : "var(--muted)",
          border: mode === "timer" ? "1px solid var(--line)" : "1px solid transparent",
          borderBottom: mode === "timer" ? "1px solid var(--card)" : "1px solid transparent",
          marginBottom: -1, position: "relative", zIndex: mode === "timer" ? 1 : 0,
        }}>⏱ Timer</button>
        <button onClick={() => setMode("manual")} style={{
          all: "unset", cursor: "pointer", padding: "10px 20px", borderRadius: "11px 11px 0 0",
          fontWeight: 600, fontSize: 14,
          background: mode === "manual" ? "var(--card)" : "transparent",
          color: mode === "manual" ? "var(--ink)" : "var(--muted)",
          border: mode === "manual" ? "1px solid var(--line)" : "1px solid transparent",
          borderBottom: mode === "manual" ? "1px solid var(--card)" : "1px solid transparent",
          marginBottom: -1, position: "relative", zIndex: mode === "manual" ? 1 : 0,
        }}>✎ Manual Entry</button>
      </div>

      {/* ── Timer mode ── */}
      {mode === "timer" && (
      <div className="tw-timer" style={{ borderTopLeftRadius: 0 }}>
        <div className="fld">
          <label>Who</label>
          <select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)}>
            <option value="">— choose —</option>
            {whoOpts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <div className="fld">
          <label>Client</label>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
            <option value="">— choose client —</option>
            {sorted.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div className="fld">
          <label>Task</label>
          <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
            {taskKeys.map((k) => (<option key={k} value={k}>{TASK_LABEL[k]}</option>))}
          </select>
        </div>
        <button className="tw-go" onClick={startTimer} disabled={!selectedClient || !selectedPerson}>
          ▶ Start Tracking
        </button>
      </div>
      )}

      {/* ── Manual entry mode ── */}
      {mode === "manual" && (
      <div className="tw-timer" style={{ borderTopLeftRadius: 0, flexDirection: "column" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div className="fld"><label>Who</label><select value={mWho} onChange={(e) => setMWho(e.target.value)}><option value="">— choose —</option>{whoOpts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div>
          <div className="fld"><label>Client</label><select value={mClient} onChange={(e) => setMClient(e.target.value)}><option value="">— choose client —</option>{sorted.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
          <div className="fld"><label>Task</label><select value={mTask} onChange={(e) => setMTask(e.target.value)}>{taskKeys.map((k) => (<option key={k} value={k}>{TASK_LABEL[k]}</option>))}</select></div>
          <div className="fld"><label>Hours</label><input type="number" min={0} value={mHours} onChange={(e) => setMHours(e.target.value)} placeholder="0" style={{ width: 60, padding: "9px 8px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "var(--card)", textAlign: "center" }} /></div>
          <div className="fld"><label>Minutes</label><input type="number" min={0} max={59} value={mMinutes} onChange={(e) => setMMinutes(e.target.value)} placeholder="0" style={{ width: 60, padding: "9px 8px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "var(--card)", textAlign: "center" }} /></div>
          <div className="fld"><label>Date</label><input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={{ width: 140, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "var(--card)" }} /></div>
        </div>
        <button className="tw-go" onClick={submitManualEntry} disabled={!mWho || !mClient || (!mHours && !mMinutes)} style={{ alignSelf: "flex-end", marginTop: 4 }}>＋ Log Entry</button>
      </div>
      )}

      {/* ── Today's summary table ── */}
      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th style={{ whiteSpace: "nowrap" }}>Time logged</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "var(--green-soft)" }}>
              <td style={{ fontWeight: 600 }}>Logged today</td>
              <td className="mono" style={{ fontWeight: 700 }}>{fmtDur(totalToday)}</td>
            </tr>
            {whoCards.map((name) => (
              <tr key={name}>
                <td>{name}</td>
                <td className="mono">{fmtDur(byWho[name])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "20px 0" }} />

      {/* ── Entries table ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="count">Today&rsquo;s entries</div>
        <select value={viewingAs ?? ""} onChange={(e) => setViewingAs(e.target.value || null)} style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 8, font: "inherit", fontSize: 12, background: "var(--card)", color: "var(--ink)" }}>
          <option value="">All staff</option>
          {whoOpts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      </div>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Who</th><th>Client</th><th>Task</th><th style={{ whiteSpace: "nowrap" }}>Time</th><th>Date</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {displayEntries.length > 0 ? (
              displayEntries.map((entry, idx) => {
                if (entry.isRunning) {
                  const elapsed = Math.floor((Date.now() - new Date(entry.date).getTime()) / 1000);
                  return (
                    <tr key={entry.id} className="running-row">
                      <td style={{ fontWeight: 500 }}>{entry.personName}</td>
                      <td className="lname">{shortName(entry.clientName)}</td>
                      <td style={{ color: "var(--muted)" }}>{entry.serviceLabel}</td>
                      <td className="mono" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="pulse-dot" />
                        {fmtClock(elapsed)}
                        <span style={{ color: "var(--green)", fontWeight: 600, fontSize: 12, marginLeft: 4 }}>running</span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td style={{ color: "var(--muted)", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.note || "—"}</td>
                      <td>
                        <button className="stop-btn" onClick={() => stopEntry(entry.id)}>■ Stop</button>
                      </td>
                    </tr>
                  );
                }

                const isEditing = editIdx === idx;
                const h = Math.floor(entry.duration / 3600);
                const m = Math.floor((entry.duration % 3600) / 60);

                if (isEditing) {
                  return (
                    <tr key={entry.id}>
                      <td><select className="edit-sel" defaultValue={entry.personName} onChange={(e) => handleEdit(idx, "personName", e.target.value)}>{whoOpts.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}</select></td>
                      <td><select className="edit-sel" defaultValue={entry.clientName} onChange={(e) => handleEdit(idx, "clientName", e.target.value)} style={{ maxWidth: 220 }}>{sorted.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></td>
                      <td><select className="edit-sel" defaultValue={entry.serviceLabel} onChange={(e) => handleEdit(idx, "serviceLabel", e.target.value)}>{taskKeys.map((k) => (<option key={k} value={TASK_LABEL[k]}>{TASK_LABEL[k]}</option>))}</select></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <input className="edit-inp" type="number" min={0} defaultValue={h} onChange={(e) => { const newH = parseInt(e.target.value) || 0; setEntries((prev) => prev.map((ev, i) => i !== idx ? ev : { ...ev, duration: newH * 3600 + m * 60, edited: true })); }} />h{" "}
                        <input className="edit-inp" type="number" min={0} max={59} defaultValue={m} onChange={(e) => { const newM = parseInt(e.target.value) || 0; setEntries((prev) => prev.map((ev, i) => i !== idx ? ev : { ...ev, duration: h * 3600 + newM * 60, edited: true })); }} />m
                      </td>
                      <td><input className="edit-inp" type="date" defaultValue={entry.date.slice(0, 10)} onChange={(e) => handleEdit(idx, "date", e.target.value + "T12:00:00.000Z")} style={{ width: 130, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 13 }} /></td>
                      <td><textarea className="edit-note-ta" value={entry.note} onChange={(e) => handleEdit(idx, "note", e.target.value)} placeholder="Notes..." rows={2} style={{ width: 160, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 13, resize: "vertical" }} /></td>
                      <td style={{ whiteSpace: "nowrap" }}><button className="reveal" onClick={() => saveEdit(idx)} style={{ marginRight: 10 }}>Save</button><button className="reveal" onClick={() => setEditIdx(null)}>Cancel</button></td>
                    </tr>
                  );
                }

                return (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 500, color: "var(--ink)" }}>{entry.personName}</td>
                    <td className="lname">{shortName(entry.clientName)}</td>
                    <td style={{ color: "var(--muted)" }}>{entry.serviceLabel}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="mono">{fmtDur(entry.duration)}{entry.edited && <span style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", marginLeft: 6 }}>edited</span>}</span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.note || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="reveal" onClick={() => setEditIdx(idx)} style={{ marginRight: 10 }}>edit</button>
                      <button className="reveal" onClick={() => deleteEntry(entry.id)} style={{ color: "var(--red)" }}>delete</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={7} style={{ color: "var(--muted)", textAlign: "center", padding: "24px" }}>No time logged yet — use Timer or Manual Entry above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="fineprint">Lean &amp; live: pick a client, hit Start, a row appears in the table with a live clock. Stop it anytime — the full duration is saved. Start multiple timers simultaneously. <b>Entries are editable</b> — anyone can fix their own time without asking an admin.</p>
    </div>
  );
}
