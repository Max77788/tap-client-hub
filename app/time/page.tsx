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
  task: string;
  taskLabel: string;
  duration: number;
  date: string;
  note: string;
  edited?: boolean;
  isRunning?: boolean;
  manual?: boolean;
}

interface StaffMember { id: string; name: string; role: string; firstName: string; }

const TASK_LABEL: Record<string, string> = {
  fin: "Financials",
  pr: "Payroll",
  stx: "Sales Tax",
  t9: "1099s",
  rend: "Renditions",
  tax: "Tax Returns",
  admin: "Admin/Other",
};

const TASK_KEYS = Object.keys(TASK_LABEL);

type EntryTab = "timer" | "manual";

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
  const [entryTab, setEntryTab] = useState<EntryTab>("timer");

  // Timer
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedService, setSelectedService] = useState("fin");
  const [timerRunning, setTimerRunning] = useState(false);

  // Manual entry
  const [manualPerson, setManualPerson] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [manualService, setManualService] = useState("fin");
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Table
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [viewingAs, setViewingAs] = useState<string | null>(null);
  const [impersonatingAs, setImpersonatingAs] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  const { clients, loading: clientsLoading } = useClients();

  // Live tick — forces re-render every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Staff + current user detection
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          const active = data.filter((u: any) => u.status === "Active").map((u: any) => {
            const fullName = u.name || "";
            // Extract first name from "Patil, Tushar" → "Tushar" or "Tushar Patil" → "Tushar"
            const firstName = fullName.includes(",")
              ? (fullName.split(",")[1] || "").trim()
              : (fullName.split(" ")[0] || "").trim();
            return { id: u.id, name: fullName, role: u.role, firstName: firstName || fullName };
          });
          setStaff(active);
          // Identify current user from cookie
          const cookieMatch = document.cookie.match(/(?:^|;\s*)tap_demo_user=([^;]*)/);
          const userName = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
          if (userName) {
            // Try full name match first (both "First Last" and "Last, First" formats)
            const nameParts = userName.trim().split(/\s+/);
            const match = active.find((u: any) => {
              const dbName = (u.name || "").trim().toLowerCase();
              const searchName = userName.toLowerCase();
              // Exact match: "Tushar Patil" vs "tushar patil" OR "Patil, Tushar" vs "tushar patil"
              if (dbName === searchName) return true;
              // Comma-separated match: "patil, tushar" vs "tushar patil"
              const commaForm = nameParts.filter(Boolean).reverse().join(", ").toLowerCase();
              if (dbName === commaForm) return true;
              // Surname match — but only if unique to avoid matching wrong person
              const surname = nameParts[nameParts.length - 1]?.toLowerCase() || "";
              if (surname) {
                const sameSurname = active.filter((u2: any) => (u2.name || "").trim().toLowerCase().startsWith(surname));
                if (sameSurname.length === 1) return dbName.startsWith(surname);
              }
              return false;
            });
            if (match) setCurrentUser(match);
          }
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load entries — mark 0-sec entries from today as running
  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries");
      if (!res.ok) return;
      const data = await res.json();
      if (data.entries) {
        const today = new Date().toISOString().slice(0, 10);
        setEntries(data.entries.map((e: any) => {
          const isFromToday = (e.date || "").slice(0, 10) === today;
          return {
            id: e.id, clientName: e.clientName || "", clientId: e.clientId || "",
            personName: e.personName || "", personId: e.personId || "",
            task: "", taskLabel: e.serviceLabel || "",
            duration: e.duration || 0, date: e.date || "", note: e.note || "",
            edited: e.edited || false,
            isRunning: isFromToday && (e.duration || 0) === 0,
            manual: e.manual || false,
          };
        }));
        // Re-activate timer state if there's a running entry from today
        const running = data.entries.find((e: any) => (e.date || "").slice(0, 10) === today && (e.duration || 0) === 0);
        if (running) setTimerRunning(true);
      }
    } catch {}
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function uid() {
    try { return crypto.randomUUID(); }
    catch { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  function taskKeyFromLabel(label: string): string {
    for (const [k, v] of Object.entries(TASK_LABEL)) { if (v === label) return k; }
    return "admin";
  }

  function toTaskLabel(v: string): string {
    if (TASK_LABEL[v]) return TASK_LABEL[v];
    return v || "Admin/Other";
  }

  const clientOptions = useMemo(() => {
    const list = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    return [{ id: "tap-associates", name: "Tap Associates" }, ...list];
  }, [clients]);

  // ── Start timer — saves immediately so it survives reload ──
  const startTimer = useCallback(async () => {
    if (!selectedClient || !selectedPerson) return;
    const client = clientOptions.find((c) => c.id === selectedClient);
    const person = staff.find((s) => s.id === selectedPerson);
    if (!client || !person) return;

    const entryId = uid();
    const now = new Date().toISOString();

    const entry: TimeEntry = {
      id: entryId, clientName: client.name, clientId: client.id,
      personName: person.name, personId: person.id,
      task: selectedService, taskLabel: TASK_LABEL[selectedService] || "Admin/Other",
      duration: 0, date: now, note: "", isRunning: true,
    };

    // Add to table immediately
    setEntries((prev) => [entry, ...prev]);
    setTimerRunning(true);

    // Save to backend so it survives reload
    try {
      await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entryId, who: person.id, client_id: client.id,
          task: TASK_LABEL[selectedService] || "Admin/Other",
          seconds: 0, started_at: now, note: "",
        }),
      });
    } catch (e) { console.error("Save failed:", e); }
  }, [selectedClient, selectedPerson, selectedService, clientOptions, staff]);

  // ── Stop timer — patches the backend with final duration ──
  const stopTimer = useCallback(async (entryId?: string) => {
    // Find the running entry
    const runningEntry = entryId
      ? entries.find((e) => e.id === entryId)
      : entries.find((e) => e.isRunning);
    if (!runningEntry) return;

    const elapsed = Math.floor((Date.now() - new Date(runningEntry.date).getTime()) / 1000);
    if (elapsed < 1) {
      // Remove 0-sec entry from UI and backend
      setEntries((prev) => prev.filter((e) => e.id !== runningEntry.id));
      fetch(`/api/time-entries?id=${encodeURIComponent(runningEntry.id)}`, { method: "DELETE" }).catch(() => {});
      setTimerRunning(false);
      return;
    }

    setEntries((prev) => prev.map((e) =>
      e.id === runningEntry.id ? { ...e, duration: elapsed, isRunning: false } : e
    ));
    setTimerRunning(false);

    fetch(`/api/time-entries?id=${encodeURIComponent(runningEntry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds: elapsed }),
    }).catch(() => {});
  }, [entries]);

  // ── Manual entry submit ──
  async function submitManualEntry() {
    if (!manualPerson || !manualClient) return;
    const elapsed = manualHours * 3600 + manualMinutes * 60;
    if (elapsed < 1) return;

    const client = clientOptions.find((c) => c.id === manualClient);
    const person = staff.find((s) => s.id === manualPerson);
    if (!client || !person) return;

    const entryId = uid();
    const dateStr = manualDate + "T12:00:00.000Z";

    const entry: TimeEntry = {
      id: entryId, clientName: client.name, clientId: client.id,
      personName: person.name, personId: person.id,
      task: manualService, taskLabel: TASK_LABEL[manualService] || "Admin/Other",
      duration: elapsed, date: dateStr, note: "", edited: false, isRunning: false, manual: true,
    };
    setEntries((prev) => [entry, ...prev]);

    fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entryId, who: person.id, client_id: client.id,
        task: TASK_LABEL[manualService] || "Admin/Other",
        seconds: elapsed, started_at: dateStr, note: "", manual: true,
      }),
    }).catch((e) => console.error("Manual save failed:", e));

    setManualHours(0); setManualMinutes(0);
    setManualDate(new Date().toISOString().slice(0, 10));
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
    const client = clientOptions.find((c) => c.name === entry.clientName);
    fetch(`/api/time-entries?id=${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        who: person?.id || entry.personId,
        client_id: client?.id || entry.clientId,
        task: entry.taskLabel, seconds: entry.duration,
        note: entry.note, started_at: entry.date, edited: true,
      }),
    }).catch(() => {});
  }

  // Derived
  const today = new Date().toISOString().slice(0, 10);
  const whoOpts = useMemo(() => staff.filter((s) => s.name !== "Unassigned"), [staff]);
  const isStaff = currentUser && currentUser.role && !/owner|admin/i.test(currentUser.role);
  const effectiveIsStaff = isStaff || !!impersonatingAs;

  // Filters + filtered entries
  const [filterPerson, setFilterPerson] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterTask, setFilterTask] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const filteredEntries = useMemo(() => {
    let list = [...entries];
    if (filterPerson) list = list.filter((e) => e.personId === filterPerson);
    if (filterClient) list = list.filter((e) => e.clientId === filterClient);
    if (filterTask) list = list.filter((e) => e.task === filterTask || taskKeyFromLabel(e.taskLabel) === filterTask);
    if (filterDateFrom) list = list.filter((e) => e.date.slice(0, 10) >= filterDateFrom);
    if (filterDateTo) list = list.filter((e) => e.date.slice(0, 10) <= filterDateTo);
    if (!filterDateFrom && !filterDateTo) list = list.filter((e) => e.date.slice(0, 10) === today);
    if (viewingAs) list = list.filter((e) => e.personId === viewingAs);
    if (!impersonatingAs && effectiveIsStaff && currentUser) list = list.filter((e) => e.personId === currentUser.id);
    return [...list].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [entries, filterPerson, filterClient, filterTask, filterDateFrom, filterDateTo, today, viewingAs, effectiveIsStaff, impersonatingAs, currentUser]);

  const totalFiltered = filteredEntries.reduce((s, e) =>
    s + (e.isRunning ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000) : e.duration), 0);

  // Auto-select current user for staff
  useEffect(() => {
    if (effectiveIsStaff && !impersonatingAs && currentUser && !selectedPerson) {
      setSelectedPerson(currentUser.id);
    }
  }, [effectiveIsStaff, impersonatingAs, currentUser, selectedPerson]);

  // When impersonating, auto-select that person and set viewingAs
  useEffect(() => {
    if (impersonatingAs) {
      setSelectedPerson(impersonatingAs);
      setViewingAs(impersonatingAs);
      setEntryTab("timer");
    }
  }, [impersonatingAs]);

  const displayEntries = useMemo(() => {
    let list = entries.filter((e) => e.date.slice(0, 10) === today);
    if (viewingAs) list = list.filter((e) => e.personId === viewingAs);
    if (!impersonatingAs && effectiveIsStaff && currentUser) list = list.filter((e) => e.personId === currentUser.id);
    return [...list].sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [entries, today, viewingAs, effectiveIsStaff, impersonatingAs, isStaff, currentUser]);

  const totalToday = displayEntries.reduce((s, e) =>
    s + (e.isRunning ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000) : e.duration), 0);

  const byWho: Record<string, number> = {};
  displayEntries.forEach((e) => {
    const elapsed = e.isRunning ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000) : e.duration;
    byWho[e.personName] = (byWho[e.personName] || 0) + elapsed;
  });
  const whoCards = Object.keys(byWho).sort((a, b) => byWho[b] - byWho[a]);
  const [showStaffList, setShowStaffList] = useState(false);

  if (loading || clientsLoading) return <PageSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      {/* ── Entry mode tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
        <button onClick={() => setEntryTab("timer")} style={{
          all: "unset", cursor: "pointer",
          padding: "10px 20px", fontWeight: 700, fontSize: 13,
          borderBottom: entryTab === "timer" ? "2px solid var(--teal)" : "2px solid transparent",
          color: entryTab === "timer" ? "var(--teal)" : "var(--muted)",
          transition: ".12s",
        }}>Timer</button>
        {!effectiveIsStaff && <button onClick={() => setEntryTab("manual")} style={{
          all: "unset", cursor: "pointer",
          padding: "10px 20px", fontWeight: 700, fontSize: 13,
          borderBottom: entryTab === "manual" ? "2px solid var(--teal)" : "2px solid transparent",
          color: entryTab === "manual" ? "var(--teal)" : "var(--muted)",
          transition: ".12s",
        }}>Manual Entry</button>}
      </div>

      {/* ── Timer Form ── */}
      {entryTab === "timer" && (
        <div className="tw-timer">
          <div className="fld">
            <label>Who</label>
            <select value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)} disabled={effectiveIsStaff}>
              <option value="">— choose —</option>
              {whoOpts.map((s) => <option key={s.id} value={s.id}>{s.firstName}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Client</label>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="">— choose client —</option>
              {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Task</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              {TASK_KEYS.map((k) => <option key={k} value={k}>{TASK_LABEL[k]}</option>)}
            </select>
          </div>

          <button className="tw-go"
            onClick={startTimer}
            disabled={!selectedClient || !selectedPerson}>
            ▶ Start
          </button>
        </div>
      )}

      {/* ── Manual Entry Form ── */}
      {entryTab === "manual" && (
        <div className="tw-timer" style={{ border: "1px dashed var(--line)", background: "var(--card)" }}>
          <div className="fld">
            <label>Who</label>
            <select value={manualPerson} onChange={(e) => setManualPerson(e.target.value)}>
              <option value="">— choose —</option>
              {whoOpts.map((s) => <option key={s.id} value={s.id}>{s.firstName}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Client</label>
            <select value={manualClient} onChange={(e) => setManualClient(e.target.value)}>
              <option value="">— choose client —</option>
              {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Task</label>
            <select value={manualService} onChange={(e) => setManualService(e.target.value)}>
              {TASK_KEYS.map((k) => <option key={k} value={k}>{TASK_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Hours</label>
            <input type="number" min={0} value={manualHours}
              onChange={(e) => setManualHours(parseInt(e.target.value) || 0)}
              style={{ width: 80, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 14, font: "inherit" }} />
          </div>
          <div className="fld">
            <label>Minutes</label>
            <input type="number" min={0} max={59} value={manualMinutes}
              onChange={(e) => setManualMinutes(parseInt(e.target.value) || 0)}
              style={{ width: 80, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 14, font: "inherit" }} />
          </div>
          <div className="fld">
            <label>Date</label>
            <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 14, font: "inherit" }} />
          </div>
          <button className="tw-go" onClick={submitManualEntry}
            disabled={!manualPerson || !manualClient || (manualHours === 0 && manualMinutes === 0)}
            style={{ background: "var(--teal)", color: "#fff" }}>
            + Add Entry
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <select className="pick" value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={{ minWidth: 130, fontSize: 12, padding: "4px 6px" }}>
            <option value="">All staff</option>
            {whoOpts.map((s) => <option key={s.id} value={s.id}>{s.firstName}</option>)}
          </select>
          <select className="pick" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ minWidth: 130, fontSize: 12, padding: "4px 6px" }}>
            <option value="">All clients</option>
            {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="pick" value={filterTask} onChange={e => setFilterTask(e.target.value)} style={{ minWidth: 110, fontSize: 12, padding: "4px 6px" }}>
            <option value="">All tasks</option>
            {TASK_KEYS.map((k) => <option key={k} value={k}>{TASK_LABEL[k]}</option>)}
          </select>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            style={{ padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, font: "inherit" }} />
          <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            style={{ padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, font: "inherit" }} />
          {(filterPerson || filterClient || filterTask || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterPerson(""); setFilterClient(""); setFilterTask(""); setFilterDateFrom(""); setFilterDateTo(""); }}
              style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600, fontSize: 12 }}>✕ Clear</button>
          )}
        </div>
        {whoCards.length > 0 && (
          <button onClick={() => setShowStaffList((p) => !p)}
            style={{
              all: "unset", cursor: "pointer", fontSize: 13, fontWeight: 600,
              color: "var(--muted)", padding: "4px 8px", borderRadius: 6,
              whiteSpace: "nowrap",
            }}>
            {showStaffList ? "\u25bc" : "\u25b6"} {whoCards.length} staff
          </button>
        )}
      </div>
      {showStaffList && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: -4 }}>
          {whoCards.map((name) => (
            <div key={name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 12px", border: "1px solid var(--line)", borderRadius: 7,
              fontSize: 14,
            }}>
              <span style={{ fontWeight: 500 }}>{name}</span>
              <span className="mono" style={{ color: "var(--muted)", fontSize: 13 }}>{fmtDur(byWho[name])}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Impersonation: View as Staff (hidden) ── */}
      {false && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ color: "var(--muted)", fontWeight: 500 }}>View as Staff:</span>
          <select
            value={impersonatingAs ?? ""}
            onChange={(e) => setImpersonatingAs(e.target.value || null)}
            className="pick"
            style={{ minWidth: 180 }}
          >
            <option value="">— Admin view —</option>
            {whoOpts.map((s) => <option key={s.id} value={s.id}>{s.firstName}</option>)}
          </select>
          {impersonatingAs && (
            <button
              onClick={() => { setImpersonatingAs(null); setViewingAs(null); setSelectedPerson(""); }}
              style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: 12 }}
            >
              ✕ Exit impersonation
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <div className="count">Entries {filteredEntries.length > 0 && <span style={{ fontWeight: 400, color: "var(--muted)" }}>({filteredEntries.length})</span>}</div>
        {filteredEntries.length > 0 && (
          <button
            onClick={() => {
              const headers = ["Who","Client","Task","Minutes","Date","Note"];
              const rows = filteredEntries.map((e: TimeEntry) => {
                const dur = e.isRunning
                  ? Math.floor((Date.now() - new Date(e.date).getTime()) / 1000)
                  : (e.duration || 0);
                const mins = (dur / 60).toFixed(1); // decimal minutes for accuracy
                return [
                  e.personName || "",
                  e.clientName || "",
                  e.taskLabel || e.task || "",
                  mins,
                  e.date ? new Date(e.date).toLocaleDateString("en-US") : "",
                  (e.note || "").replace(/"/g, '""'),
                ];
              });
              const csv = [headers, ...rows]
                .map(r => r.map(c => `"${c}"`).join(","))
                .join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `timesheet_${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
            }}
            style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--teal)", padding: "2px 8px", borderRadius: 4 }}
          >
            ⬇ Export CSV
          </button>
        )}
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Who</th>
              <th>Client</th>
              <th>Task</th>
              <th style={{ whiteSpace: "nowrap" }}>Time</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => {
                  const idx = entries.indexOf(entry);
                  const isEditing = editIdx === idx;
                  const h = Math.floor(entry.duration / 3600);
                  const m = Math.floor((entry.duration % 3600) / 60);

                  // Running entry — live clock
                  if (entry.isRunning) {
                    const elapsed = Math.floor((Date.now() - new Date(entry.date).getTime()) / 1000);
                    return (
                      <tr key={entry.id} className="running-row">
                        <td style={{ fontWeight: 500 }}>{entry.personName}</td>
                        <td className="lname">{shortName(entry.clientName)}</td>
                        <td style={{ color: "var(--muted)" }}>{entry.taskLabel || "—"}</td>
                        <td className="mono" style={{ whiteSpace: "nowrap" }}>
                          <span className="tw-live"><i />{fmtClock(elapsed)}</span>
                        </td>
                        <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                          {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td>
                          <button className="stop-btn" onClick={() => stopTimer(entry.id)}>
                            {"\u25a0 Stop"}
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Inline editing
                  if (isEditing) {
                    return (
                      <tr key={entry.id}>
                        <td><select className="edit-sel" value={entry.personName}
                          onChange={(e) => handleEdit(idx, "personName", e.target.value)}>
                          {whoOpts.map((s) => <option key={s.id} value={s.name}>{s.firstName}</option>)}
                        </select></td>
                        <td><select className="edit-sel" value={entry.clientName}
                          onChange={(e) => handleEdit(idx, "clientName", e.target.value)} style={{ maxWidth: 220 }}>
                          {clientOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select></td>
                        <td><select className="edit-sel"
                          value={entry.task ? TASK_LABEL[entry.task] : entry.taskLabel}
                          onChange={(e) => { const key = taskKeyFromLabel(e.target.value); setEntries((prev) => prev.map((ev, i) => i !== idx ? ev : { ...ev, task: key, taskLabel: TASK_LABEL[key], edited: true })); }}>
                          {TASK_KEYS.map((k) => <option key={k} value={TASK_LABEL[k]}>{TASK_LABEL[k]}</option>)}
                        </select></td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <input className="edit-inp" type="number" min={0} value={h}
                            onChange={(e) => { const nh = parseInt(e.target.value) || 0; setEntries((prev) => prev.map((ev, i) => i !== idx ? ev : { ...ev, duration: nh * 3600 + m * 60, edited: true })); }} />h{" "}
                          <input className="edit-inp" type="number" min={0} max={59} value={m}
                            onChange={(e) => { const nm = parseInt(e.target.value) || 0; setEntries((prev) => prev.map((ev, i) => i !== idx ? ev : { ...ev, duration: h * 3600 + nm * 60, edited: true })); }} />m
                        </td>
                        <td><input className="edit-inp" type="date" value={entry.date.slice(0, 10)}
                          onChange={(e) => handleEdit(idx, "date", e.target.value + "T12:00:00.000Z")}
                          style={{ width: 130, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6, font: "inherit", fontSize: 13 }} /></td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="reveal" onClick={() => saveEdit(idx)} style={{ marginRight: 10 }}>Save</button>
                          <button className="reveal" onClick={() => setEditIdx(null)}>Cancel</button>
                        </td>
                      </tr>
                    );
                  }

                  // Normal row
                  return (
                    <tr key={entry.id}>
                      <td style={{ fontWeight: 500, color: "var(--ink)" }}>{entry.personName}</td>
                      <td className="lname">{shortName(entry.clientName)}</td>
                      <td style={{ color: "var(--muted)" }}>{entry.taskLabel || toTaskLabel(entry.task) || "—"}</td>
                      <td className="mono" style={{ whiteSpace: "nowrap" }}>
                        {fmtDur(entry.duration)}{entry.edited && <span className="edited">edited</span>}{entry.manual && <span className="edited" style={{ color: "var(--teal)" }}>manual</span>}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                  No time entries yet — pick a person, client, and task, then click Start, or use Manual Entry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="fineprint">
        Click <b>Start</b> — a row appears immediately with a live clock. Stop to save. Use <b>Manual Entry</b> to add past time.
        Entries survive reload.
      </p>
    </div>
  );
}
