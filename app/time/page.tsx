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
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + "h " : "") + m + "m";
}

function fmtClock(s: number) {
  const p = (n: number) => String(n).padStart(2, "0");
  return p(Math.floor(s / 3600)) + ":" + p(Math.floor((s % 3600) / 60)) + ":" + p(s % 60);
}

export default function TimePage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedService, setSelectedService] = useState("fin");
  const [timerNote, setTimerNote] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [viewingAs, setViewingAs] = useState("");
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
      const svc = selectedService ? (SERVICE_META as any)[selectedService] : null;
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        clientName: client.name, clientId: client.id,
        personName: person.name, personId: person.id,
        serviceKey: selectedService, serviceLabel: svc?.label || TASK_LABEL[selectedService] || "-",
        duration: elapsed, date: new Date().toISOString(), note: timerNote,
      };
      setEntries((prev) => [entry, ...prev]);
      setTimerNote("");
      fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          who: person.id, client_id: client.id,
          task: svc?.label || TASK_LABEL[selectedService] || "", seconds: elapsed,
          started_at: new Date().toISOString(), note: timerNote,
        }),
      }).catch(() => {});
    }
    setRunning(false);
    setElapsed(0);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, [elapsed, selectedClient, selectedPerson, selectedService, timerNote, clients, staff]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [running]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter((e) => e.date.slice(0, 10) === today);
  const displayEntries = viewingAs
    ? todayEntries.filter((e) => e.personId === viewingAs)
    : todayEntries;

  const totalToday = todayEntries.reduce((s, e) => s + e.duration, 0);

  const byWho: Record<string, number> = {};
  todayEntries.forEach((e) => { byWho[e.personName] = (byWho[e.personName] || 0) + e.duration; });
  const whoCards = Object.keys(byWho).sort((a, b) => byWho[b] - byWho[a]);

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
        edited: true,
      }),
    }).catch(() => {});
  }

  function cancelEdit() {
    setEditIdx(null);
  }

  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const whoOpts = staff.filter((s) => s.name !== "Unassigned");
  const taskKeys = Object.keys(TASK_LABEL);

  if (loading || clientsLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      {/* ── styles ── */}
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
        .tw-timer select, .tw-timer input[type=text] {
          padding: 9px 11px; border: 1px solid var(--line);
          border-radius: 9px; font: inherit; font-size: 14px;
          background: var(--card); min-width: 80px; color: var(--ink);
          cursor: pointer; outline: none;
        }
        .tw-timer select { min-width: 140px; }
        .tw-clock {
          font-variant-numeric: tabular-nums; font-size: 40px;
          font-weight: 800; color: var(--muted); letter-spacing: 1px;
          min-width: 182px; line-height: 1;
        }
        .tw-clock.run { color: var(--green); }
        .tw-go {
          all: unset; cursor: pointer; background: var(--green);
          color: #fff; padding: 13px 24px; border-radius: 12px;
          font-weight: 700; font-size: 15px; white-space: nowrap;
        }
        .tw-go.stop { background: var(--red); }
        .tw-live {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700; color: var(--green);
        }
        .tw-live i {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--green); animation: twpulse 1.1s infinite;
        }
        @keyframes twpulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .stats { display: flex; gap: 10px; flex-wrap: wrap; }
        .statcard {
          flex: 1; min-width: 120px; background: var(--card);
          border: 1px solid var(--line); border-radius: 13px;
          padding: 13px 16px;
        }
        .statcard .sn {
          font-family: "Fraunces", Georgia, serif;
          font-weight: 600; font-size: 26px; line-height: 1;
        }
        .statcard .sl { font-size: 12px; color: var(--muted); margin-top: 4px; }
        .count { color: var(--muted); font-size: 13px; margin: 12px 2px 6px; }
        .panel {
          background: var(--card); border: 1px solid var(--line);
          border-radius: 16px; overflow: hidden;
        }
        .panel table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .panel th {
          text-align: left; padding: 14px 16px; font-size: 11px;
          font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
          color: var(--muted); border-bottom: 1px solid var(--line);
        }
        .panel td { padding: 12px 16px; border-bottom: 1px solid var(--line); }
        .panel tr:last-child td { border-bottom: none; }
        .mono { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--teal); }
        .lname { font-weight: 600; cursor: pointer; }
        .lname:hover { color: var(--teal); text-decoration: underline; }
        .edited { font-size: 10px; color: var(--muted); font-style: italic; margin-left: 6px; }
        .reveal { all: unset; cursor: pointer; color: var(--teal); font-weight: 600; font-size: 12.5px; }
        .reveal:hover { text-decoration: underline; }
        .fineprint {
          font-size: 11.5px; color: var(--muted); line-height: 1.5;
          margin: 14px 2px 0; font-style: italic;
        }
        .edit-inp { width: 42px; padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 13px; text-align: center; }
        .edit-sel { padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 13px; max-width: 200px; }
        .edit-note-inp { width: 160px; padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 13px; }
      `}</style>

      {/* ── Timer bar ── */}
      <div className="tw-timer">
        <div className="fld">
          <label>Who</label>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            disabled={running}
          >
            {whoOpts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Client</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            disabled={running}
          >
            <option value="">— choose client —</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Task</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={running}
          >
            {taskKeys.map((k) => (
              <option key={k} value={k}>{TASK_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Notes</label>
          <input
            type="text"
            value={timerNote}
            onChange={(e) => setTimerNote(e.target.value)}
            placeholder="Quick note..."
            disabled={running}
          />
        </div>
        <div className="fld">
          <label>
            {running ? (
              <span className="tw-live"><i></i>Recording</span>
            ) : "Elapsed"}
          </label>
          <div className={`tw-clock${running ? " run" : ""}`}>
            {fmtClock(elapsed)}
          </div>
        </div>
        <button
          className={`tw-go${running ? " stop" : ""}`}
          onClick={running ? stopTimer : startTimer}
          disabled={!running && (!selectedClient || !selectedPerson)}
        >
          {running ? "\u25A0 Stop & log" : "\u25B6 Start"}
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="stats">
        <div className="statcard">
          <div className="sn" style={{ color: "var(--green)" }}>{fmtDur(totalToday)}</div>
          <div className="sl">Logged today</div>
        </div>
        {whoCards.map((name) => (
          <div key={name} className="statcard">
            <div className="sn" style={{ color: "var(--ink)" }}>{fmtDur(byWho[name])}</div>
            <div className="sl">{name}</div>
          </div>
        ))}
      </div>

      {/* ── Today's entries ── */}
      <div className="count">Today&rsquo;s entries</div>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Who</th>
              <th>Client</th>
              <th>Task</th>
              <th style={{ whiteSpace: "nowrap" }}>Time &amp; When</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {running && (() => {
              const p = staff.find((s) => s.id === selectedPerson);
              const c = sorted.find((cl) => cl.id === selectedClient);
              const svc = selectedService ? (SERVICE_META as any)[selectedService] : null;
              return (
                <tr style={{ background: "var(--surface-bg, rgba(0,0,0,.02))" }}>
                  <td style={{ fontWeight: 500 }}>{p?.name || "..."}</td>
                  <td className="lname">{shortName(c?.name || "")}</td>
                  <td style={{ color: "var(--muted)" }}>{svc?.label || TASK_LABEL[selectedService] || "-"}</td>
                  <td className="mono" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", animation: "twpulse 1.1s infinite", display: "inline-block" }}></i>
                    {fmtClock(elapsed)}
                    <span style={{ color: "var(--green)", fontWeight: 600, fontSize: 12, marginLeft: 4 }}>Now</span>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              );
            })()}
            {displayEntries.length > 0 ? (
              displayEntries.map((entry, idx) => {
                const isEditing = editIdx === idx;
                const h = Math.floor(entry.duration / 3600);
                const m = Math.floor((entry.duration % 3600) / 60);

                if (isEditing) {
                  return (
                    <tr key={entry.id}>
                      <td>
                        <select
                          className="edit-sel"
                          defaultValue={entry.personName}
                          onChange={(e) => handleEdit(idx, "personName", e.target.value)}
                        >
                          {whoOpts.map((s) => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="edit-sel"
                          defaultValue={entry.clientName}
                          onChange={(e) => handleEdit(idx, "clientName", e.target.value)}
                          style={{ maxWidth: 220 }}
                        >
                          {sorted.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="edit-sel"
                          defaultValue={entry.serviceLabel}
                          onChange={(e) => handleEdit(idx, "serviceLabel", e.target.value)}
                        >
                          {taskKeys.map((k) => (
                            <option key={k} value={TASK_LABEL[k]}>{TASK_LABEL[k]}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <input
                          className="edit-inp"
                          type="number" min={0}
                          defaultValue={h}
                          onChange={(e) => {
                            const newH = parseInt(e.target.value) || 0;
                            const newM = m;
                            setEntries((prev) => prev.map((ev, i) =>
                              i !== idx ? ev : { ...ev, duration: newH * 3600 + newM * 60, edited: true }
                            ));
                          }}
                        />h{" "}
                        <input
                          className="edit-inp"
                          type="number" min={0} max={59}
                          defaultValue={m}
                          onChange={(e) => {
                            const newM = parseInt(e.target.value) || 0;
                            const newH = h;
                            setEntries((prev) => prev.map((ev, i) =>
                              i !== idx ? ev : { ...ev, duration: newH * 3600 + newM * 60, edited: true }
                            ));
                          }}
                        />m
                      </td>
                      <td>
                        <input
                          className="edit-note-inp"
                          type="text"
                          value={entry.note}
                          onChange={(e) => handleEdit(idx, "note", e.target.value)}
                          placeholder="note..."
                        />
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="reveal" onClick={() => saveEdit(idx)} style={{ marginRight: 10 }}>Save</button>
                        <button className="reveal" onClick={cancelEdit}>Cancel</button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 500, color: "var(--ink)" }}>{entry.personName}</td>
                    <td className="lname">{shortName(entry.clientName)}</td>
                    <td style={{ color: "var(--muted)" }}>{entry.serviceLabel}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="mono">
                        {fmtDur(entry.duration)}
                        {entry.edited && <span className="edited">edited</span>}
                      </span>
                      <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 12 }}>
                        {entry.date.slice(0, 10) === today
                          ? ""
                          : new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.note || "\u2014"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="reveal" onClick={() => setEditIdx(idx)} style={{ marginRight: 10 }}>edit</button>
                      <button className="reveal" onClick={() => deleteEntry(entry.id)} style={{ color: "var(--red)" }}>delete</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)", textAlign: "center", padding: "24px" }}>
                  No time logged yet — start the timer above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Fine print ── */}
      <p className="fineprint">
        Lean &amp; live: pick a client, hit Start, the clock runs in real time, Stop logs it — built to replace the separate QuickBooks Time subscription. <b>Entries are editable</b> — anyone can fix their own time (wrong client, fat-fingered minutes, forgot to stop) without asking an admin; corrected rows show an &ldquo;edited&rdquo; tag. Profitability (time vs. fee) and baseline standard-times come as the first enhancement.
      </p>
    </div>
  );
}
