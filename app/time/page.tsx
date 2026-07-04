"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useClients } from "@/hooks/use-clients-context";
import { PageSkeleton } from "@/components/loading-skeleton";

interface TimeEntry {
  id: string;
  clientName: string;
  clientId: string;
  personName: string;
  personId: string;
  task: string;          // short key: fin, pr, stx, t9, rend, admin
  taskLabel: string;
  duration: number;      // 0 = still running, >0 = stopped
  date: string;          // started_at from DB
  note: string;
  edited?: boolean;
  isRunning?: boolean;
  company?: string;
}

interface StaffMember { id: string; name: string; role: string; }

const TASK_LABEL: Record<string, string> = {
  fin: "Financials",
  pr: "Payroll",
  stx: "Sales Tax",
  t9: "1099s",
  rend: "Renditions",
  admin: "Admin/Other",
};

const TASK_KEYS = Object.keys(TASK_LABEL);

const COMPANY_OPTIONS = ["Tap Associates"];

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
  // ── Timer form state ──
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedService, setSelectedService] = useState("fin");
  const [selectedCompany, setSelectedCompany] = useState("Tap Associates");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);

  // ── Manual entry state ──
  const [showManual, setShowManual] = useState(false);
  const [manualPerson, setManualPerson] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [manualService, setManualService] = useState("fin");
  const [manualCompany, setManualCompany] = useState("Tap Associates");
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Table state ──
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [viewingAs, setViewingAs] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { clients, loading: clientsLoading } = useClients();

  // ── Live second counter ──
  const [, setTick] = useState(0);
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRunning && timerStart) {
      setTimerElapsed(Math.floor((Date.now() - timerStart) / 1000));
    }
  }, [timerRunning, timerStart]);

  // Load staff
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setStaff(
            data
              .filter((u: any) => u.status === "Active")
              .map((u: any) => ({ id: u.id, name: u.name, role: u.role }))
          );
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load entries
  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries");
      if (!res.ok) return;
      const data = await res.json();
      if (data.entries) {
        setEntries(
          data.entries.map((e: any) => ({
            id: e.id,
            clientName: e.clientName || "",
            clientId: e.clientId || "",
            personName: e.personName || "",
            personId: e.personId || "",
            task: "",
            taskLabel: e.serviceLabel || "",
            duration: e.duration || 0,
            date: e.date || "",
            note: e.note || "",
            edited: e.edited || false,
            isRunning: (e.duration || 0) === 0,
            company: e.company || "Tap Associates",
          }))
        );
      }
    } catch {}
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function uid() {
    try { return crypto.randomUUID(); }
    catch { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  function taskKeyFromLabel(label: string): string {
    for (const [k, v] of Object.entries(TASK_LABEL)) {
      if (v === label) return k;
    }
    return "admin";
  }

  function toTaskLabel(v: string): string {
    if (TASK_LABEL[v]) return TASK_LABEL[v];
    return v || "Admin/Other";
  }

  // ── Start Timer ──
  const startTimer = useCallback(() => {
    if (!selectedClient || !selectedPerson) return;
    setTimerRunning(true);
    setTimerStart(Date.now());
    setTimerElapsed(0);
  }, [selectedClient, selectedPerson]);

  // ── Stop Timer ──
  const stopTimer = useCallback(async () => {
    if (!timerStart || !selectedClient || !selectedPerson) return;
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    if (elapsed < 1) {
      setTimerRunning(false);
      setTimerStart(null);
      setTimerElapsed(0);
      return;
    }

    const client = clients.find((c) => c.id === selectedClient);
    const person = staff.find((s) => s.id === selectedPerson);
    if (!client || !person) return;

    const entryId = uid();
    const now = new Date().toISOString();

    const entry: TimeEntry = {
      id: entryId,
      clientName: client.name,
      clientId: client.id,
      personName: person.name,
      personId: person.id,
      task: selectedService,
      taskLabel: TASK_LABEL[selectedService] || "Admin/Other",
      duration: elapsed,
      date: now,
      note: "",
      isRunning: false,
      company: selectedCompany,
    };
    setEntries((prev) => [entry, ...prev]);

    fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entryId,
        who: person.id,
        client_id: client.id,
        task: TASK_LABEL[selectedService] || "Admin/Other",
        seconds: elapsed,
        started_at: now,
        note: "",
        company: selectedCompany,
      }),
    }).catch((e) => console.error("Save failed:", e));

    setTimerRunning(false);
    setTimerStart(null);
    setTimerElapsed(0);
  }, [timerStart, selectedClient, selectedPerson, selectedService, selectedCompany, clients, staff]);

  // ── Manual Entry ──
  async function submitManualEntry() {
    if (!manualPerson || !manualClient) return;
    const elapsed = manualHours * 3600 + manualMinutes * 60;
    if (elapsed < 1) return;

    const client = clients.find((c) => c.id === manualClient);
    const person = staff.find((s) => s.id === manualPerson);
    if (!client || !person) return;

    const entryId = uid();
    const dateStr = manualDate + "T12:00:00.000Z";

    const entry: TimeEntry = {
      id: entryId,
      clientName: client.name,
      clientId: client.id,
      personName: person.name,
      personId: person.id,
      task: manualService,
      taskLabel: TASK_LABEL[manualService] || "Admin/Other",
      duration: elapsed,
      date: dateStr,
      note: "",
      edited: false,
      isRunning: false,
      company: manualCompany,
    };
    setEntries((prev) => [entry, ...prev]);

    fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entryId,
        who: person.id,
        client_id: client.id,
        task: TASK_LABEL[manualService] || "Admin/Other",
        seconds: elapsed,
        started_at: dateStr,
        note: "",
        company: manualCompany,
      }),
    }).catch((e) => console.error("Manual save failed:", e));

    // Reset form
    setManualHours(0);
    setManualMinutes(0);
    setManualDate(new Date().toISOString().slice(0, 10));
    setShowManual(false);
  }

  async function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    fetch(`/api/time-entries?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  function handleEdit(idx: number, field: string, value: string) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i !== idx ? e : { ...e, [field]: value, edited: true }
      )
    );
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
        task: entry.taskLabel,
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
    return [...list].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [entries, today, viewingAs]);

  const totalToday = displayEntries.reduce(
    (s, e) =>
      s +
      (e.isRunning
        ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000)
        : e.duration),
    0
  );

  const byWho: Record<string, number> = {};
  displayEntries.forEach((e) => {
    const elapsed = e.isRunning
      ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000)
      : e.duration;
    byWho[e.personName] = (byWho[e.personName] || 0) + elapsed;
  });
  const whoCards = Object.keys(byWho).sort((a, b) => byWho[b] - byWho[a]);

  const sorted = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );
  const whoOpts = useMemo(
    () => staff.filter((s) => s.name !== "Unassigned"),
    [staff]
  );

  if (loading || clientsLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      {/* ── Timer Section ── */}
      <div className="tw-timer">
        <div className="fld">
          <label>Who</label>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            disabled={timerRunning}
          >
            <option value="">— choose —</option>
            {whoOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            disabled={timerRunning}
          >
            <option value="">— choose client —</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Task</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={timerRunning}
          >
            {TASK_KEYS.map((k) => (
              <option key={k} value={k}>
                {TASK_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Company</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            disabled={timerRunning}
          >
            {COMPANY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Live clock */}
        <div className={"tw-clock" + (timerRunning ? " run" : "")}>
          {fmtClock(timerRunning ? timerElapsed : 0)}
        </div>

        <button
          className={"tw-go" + (timerRunning ? " stop" : "")}
          onClick={timerRunning ? stopTimer : startTimer}
          disabled={!selectedClient || !selectedPerson}
        >
          {timerRunning ? "\u25a0 Stop" : "\u25b6 Start"}
        </button>
      </div>

      {/* ── Manual Entry Toggle ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="reveal"
          onClick={() => setShowManual(!showManual)}
          style={{
            fontWeight: 600, fontSize: 13,
            color: showManual ? "var(--muted)" : "var(--teal)",
          }}
        >
          {showManual ? "\u2212 Hide manual entry" : "+ Manual Entry"}
        </button>
      </div>

      {/* ── Manual Entry Form ── */}
      {showManual && (
        <div
          className="tw-timer"
          style={{
            border: "1px dashed var(--line)",
            background: "var(--card)",
          }}
        >
          <div className="fld">
            <label>Who</label>
            <select
              value={manualPerson}
              onChange={(e) => setManualPerson(e.target.value)}
            >
              <option value="">— choose —</option>
              {whoOpts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>Client</label>
            <select
              value={manualClient}
              onChange={(e) => setManualClient(e.target.value)}
            >
              <option value="">— choose client —</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>Task</label>
            <select
              value={manualService}
              onChange={(e) => setManualService(e.target.value)}
            >
              {TASK_KEYS.map((k) => (
                <option key={k} value={k}>
                  {TASK_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>Company</label>
            <select
              value={manualCompany}
              onChange={(e) => setManualCompany(e.target.value)}
            >
              {COMPANY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Time inputs */}
          <div className="fld">
            <label>Hours</label>
            <input
              type="number"
              min={0}
              value={manualHours}
              onChange={(e) => setManualHours(parseInt(e.target.value) || 0)}
              style={{
                width: 80, padding: "6px 10px",
                border: "1px solid var(--line)", borderRadius: 7,
                fontSize: 14, font: "inherit",
              }}
            />
          </div>
          <div className="fld">
            <label>Minutes</label>
            <input
              type="number"
              min={0}
              max={59}
              value={manualMinutes}
              onChange={(e) => setManualMinutes(parseInt(e.target.value) || 0)}
              style={{
                width: 80, padding: "6px 10px",
                border: "1px solid var(--line)", borderRadius: 7,
                fontSize: 14, font: "inherit",
              }}
            />
          </div>
          <div className="fld">
            <label>Date</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--line)", borderRadius: 7,
                fontSize: 14, font: "inherit",
              }}
            />
          </div>

          <button
            className="tw-go"
            onClick={submitManualEntry}
            disabled={!manualPerson || !manualClient || (manualHours === 0 && manualMinutes === 0)}
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            + Add Entry
          </button>
        </div>
      )}

      {/* ── Per-person stat cards ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <div className="statcard" style={{ background: "var(--green-soft)", borderColor: "var(--green)" }}>
          <div className="sn" style={{ color: "var(--green)" }}>
            {fmtDur(totalToday)}
          </div>
          <div className="sl">Total Today</div>
        </div>
        {whoCards.map((name) => (
          <div className="statcard" key={name}>
            <div className="sn">{fmtDur(byWho[name])}</div>
            <div className="sl">{name}</div>
          </div>
        ))}
      </div>

      {/* ── Entries table ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <div className="count">Entries</div>
        <select
          value={viewingAs ?? ""}
          onChange={(e) => setViewingAs(e.target.value || null)}
          className="pick"
        >
          <option value="">All staff</option>
          {whoOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Who</th>
              <th>Client</th>
              <th>Task</th>
              <th>Company</th>
              <th style={{ whiteSpace: "nowrap" }}>Time</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              (() => {
                const todayEntries = entries
                  .filter((e) => e.date.slice(0, 10) === today && (!viewingAs || e.personId === viewingAs))
                  .sort((a, b) => {
                    if (a.isRunning && !b.isRunning) return -1;
                    if (!a.isRunning && b.isRunning) return 1;
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                  });

                const earlierEntries = viewingAs
                  ? entries.filter((e) => e.date.slice(0, 10) !== today && e.personId === viewingAs)
                  : entries.filter((e) => e.date.slice(0, 10) !== today);

                const sortedEarlier = [...earlierEntries].sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                const allDisplay = [...todayEntries, ...sortedEarlier];

                return allDisplay.map((entry) => {
                  const idx = entries.indexOf(entry);
                  const isEditing = editIdx === idx;
                  const h = Math.floor(entry.duration / 3600);
                  const m = Math.floor((entry.duration % 3600) / 60);

                  // Running entry
                  if (entry.isRunning) {
                    const elapsed = Math.floor(
                      (Date.now() - new Date(entry.date).getTime()) / 1000
                    );
                    return (
                      <tr key={entry.id} className="running-row">
                        <td style={{ fontWeight: 500 }}>{entry.personName}</td>
                        <td className="lname">{shortName(entry.clientName)}</td>
                        <td style={{ color: "var(--muted)" }}>{entry.taskLabel || "—"}</td>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>{entry.company || "Tap Associates"}</td>
                        <td className="mono" style={{ whiteSpace: "nowrap" }}>
                          <span className="tw-live"><i />{fmtClock(elapsed)}</span>
                        </td>
                        <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                          {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td>
                          <button
                            className="stop-btn"
                            onClick={() => {
                              const elapsed2 = Math.floor(
                                (Date.now() - new Date(entry.date).getTime()) / 1000
                              );
                              setEntries((prev) =>
                                prev.map((e) =>
                                  e.id === entry.id
                                    ? { ...e, duration: elapsed2, isRunning: false }
                                    : e
                                )
                              );
                              fetch(
                                `/api/time-entries?id=${encodeURIComponent(entry.id)}`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ seconds: elapsed2 }),
                                }
                              ).catch(() => {});
                            }}
                          >
                            \u25a0 Stop
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Inline editing
                  if (isEditing) {
                    return (
                      <tr key={entry.id}>
                        <td>
                          <select className="edit-sel" value={entry.personName}
                            onChange={(e) => handleEdit(idx, "personName", e.target.value)}>
                            {whoOpts.map((s) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select className="edit-sel" value={entry.clientName}
                            onChange={(e) => handleEdit(idx, "clientName", e.target.value)}
                            style={{ maxWidth: 220 }}>
                            {sorted.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select className="edit-sel"
                            value={entry.task ? TASK_LABEL[entry.task] : entry.taskLabel}
                            onChange={(e) => {
                              const key = taskKeyFromLabel(e.target.value);
                              setEntries((prev) =>
                                prev.map((ev, i) =>
                                  i !== idx ? ev : { ...ev, task: key, taskLabel: TASK_LABEL[key], edited: true }
                                )
                              );
                            }}>
                            {TASK_KEYS.map((k) => (
                              <option key={k} value={TASK_LABEL[k]}>{TASK_LABEL[k]}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select className="edit-sel" value={entry.company || "Tap Associates"}
                            onChange={(e) => handleEdit(idx, "company", e.target.value)}>
                            {COMPANY_OPTIONS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <input className="edit-inp" type="number" min={0}
                            value={h}
                            onChange={(e) => {
                              const newH = parseInt(e.target.value) || 0;
                              setEntries((prev) =>
                                prev.map((ev, i) =>
                                  i !== idx ? ev : { ...ev, duration: newH * 3600 + m * 60, edited: true }
                                )
                              );
                            }} />h{" "}
                          <input className="edit-inp" type="number" min={0} max={59}
                            value={m}
                            onChange={(e) => {
                              const newM = parseInt(e.target.value) || 0;
                              setEntries((prev) =>
                                prev.map((ev, i) =>
                                  i !== idx ? ev : { ...ev, duration: h * 3600 + newM * 60, edited: true }
                                )
                              );
                            }} />m
                        </td>
                        <td>
                          <input className="edit-inp" type="date"
                            value={entry.date.slice(0, 10)}
                            onChange={(e) => handleEdit(idx, "date", e.target.value + "T12:00:00.000Z")}
                            style={{ width: 130, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 13 }} />
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="reveal" onClick={() => saveEdit(idx)}
                            style={{ marginRight: 10 }}>Save</button>
                          <button className="reveal" onClick={() => setEditIdx(null)}>Cancel</button>
                        </td>
                      </tr>
                    );
                  }

                  // Normal entry row
                  return (
                    <tr key={entry.id}>
                      <td style={{ fontWeight: 500, color: "var(--ink)" }}>{entry.personName}</td>
                      <td className="lname">{shortName(entry.clientName)}</td>
                      <td style={{ color: "var(--muted)" }}>{entry.taskLabel || toTaskLabel(entry.task) || "—"}</td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{entry.company || "Tap Associates"}</td>
                      <td className="mono" style={{ whiteSpace: "nowrap" }}>
                        {fmtDur(entry.duration)}
                        {entry.edited && <span className="edited">edited</span>}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="reveal" onClick={() => setEditIdx(idx)}
                          style={{ marginRight: 10 }}>edit</button>
                        <button className="reveal" onClick={() => deleteEntry(entry.id)}
                          style={{ color: "var(--red)" }}>delete</button>
                      </td>
                    </tr>
                  );
                });
              })()
            ) : (
              <tr>
                <td colSpan={7} style={{ color: "var(--muted)", textAlign: "center", padding: "24px" }}>
                  No time entries yet — pick a person, client, and task, then click Start, or use Manual Entry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="fineprint">
        Pick a person, client, and task, then hit Start — a row appears in the
        table with a live clock. Stop to save. Use <b>Manual Entry</b> to add
        past time. Entries stay editable — click <b>edit</b> to change.
      </p>
    </div>
  );
}
