"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { CLIENTS, STAFF, SERVICE_META } from "@/lib/data";
import type { ServiceKey } from "@/lib/types";

interface TimeEntry {
  id: string;
  clientName: string;
  personName: string;
  serviceKey: string;
  serviceLabel: string;
  duration: number;
  date: string;
  note: string;
  comment: string;
}

export default function TimePage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load saved entries from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tap-timesheet-entries");
      if (saved) setEntries(JSON.parse(saved));
    } catch {}
  }, []);

  // Save entries to localStorage
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
    }, 1000);
  }, [elapsed, selectedClient, selectedPerson]);

  const stopTimer = useCallback(() => {
    const client = CLIENTS.find((c) => c.id === selectedClient);
    const person = STAFF.find((s) => s.id === selectedPerson);
    if (elapsed > 0 && client && person) {
      const svc = selectedService
        ? SERVICE_META[selectedService as ServiceKey]
        : null;
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        clientName: client.name,
        personName: person.name,
        serviceKey: selectedService,
        serviceLabel: svc?.label || "",
        duration: elapsed,
        date: new Date().toISOString(),
        note: note.trim(),
        comment: comment.trim(),
      };
      setEntries((prev) => [entry, ...prev]);
      setNote("");
      setComment("");
    }
    setRunning(false);
    setElapsed(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [elapsed, selectedClient, selectedPerson, note, comment]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Aggregate stats
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter((e) => e.date.slice(0, 10) === today);
  const todayTotalSecs = todayEntries.reduce((s, e) => s + e.duration, 0);
  const weekTotalSecs = entries
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return d >= weekAgo;
    })
    .reduce((s, e) => s + e.duration, 0);

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
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)] m-0" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
          Timesheet
        </h1>
        <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
          Live time tracker with client/project notes. Data saved locally.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Today</span>
          <span className="text-xl font-bold text-[var(--ink)]">{formatDuration(todayTotalSecs)}</span>
          <span className="text-[10px] text-[var(--muted)]">{todayEntries.length} entries</span>
        </div>
        <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">This Week</span>
          <span className="text-xl font-bold text-[var(--ink)]">{formatDuration(weekTotalSecs)}</span>
        </div>
        <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Total Saved</span>
          <span className="text-xl font-bold text-[var(--ink)]">{entries.length}</span>
          <span className="text-[10px] text-[var(--muted)]">entries</span>
        </div>
      </div>

      {/* Timer card */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="text-6xl font-mono font-bold tracking-wider select-none"
            style={{ color: running ? "var(--green)" : "var(--ink)" }}
          >
            {formatTime(elapsed)}
          </div>

          {running && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--green)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--green)" }}>
                Timing - {CLIENTS.find(c => c.id === selectedClient)?.name}
                {selectedPerson ? ` · ${STAFF.find(s => s.id === selectedPerson)?.name}` : ""}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={running}
              className="flex-1 text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50"
            >
              <option value="">Select client...</option>
              {CLIENTS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              disabled={running}
              className="flex-1 text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50"
            >
              <option value="">Select person...</option>
              {STAFF.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Service / Module picker */}
          <div className="w-full max-w-md">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              disabled={running}
              className="w-full text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none disabled:opacity-50"
            >
              <option value="">Module (any)</option>
              {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => (
                <option key={key} value={key}>{SERVICE_META[key].label}</option>
              ))}
            </select>
          </div>

          {/* Note input */}
          <div className="w-full max-w-md">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={running}
              placeholder="Notes"
              rows={2}
              className="w-full text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none resize-none disabled:opacity-50 placeholder:text-[var(--muted)]/50"
            />
          </div>

          {/* Comment input */}
          <div className="w-full max-w-md">
            <textarea
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= 300) setComment(e.target.value);
              }}
              disabled={running}
              placeholder="Add a comment (max 300 chars — visible on expand)"
              rows={2}
              maxLength={300}
              className="w-full text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none resize-none disabled:opacity-50 placeholder:text-[var(--muted)]/50"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] ${comment.length >= 280 ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>
                {comment.length}/300
              </span>
            </div>
          </div>

          <button
            onClick={running ? stopTimer : startTimer}
            disabled={!running && (!selectedClient || !selectedPerson)}
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-[background-color,color] ${
              running
                ? "bg-[var(--red)] text-white hover:opacity-90"
                : "bg-[var(--teal)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {running ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Stop & Save
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent entries */}
      <hr className="border-[var(--line)]" />
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--line)" }}>
          <h3 className="text-sm font-semibold text-[var(--ink)] m-0">Recent Time Entries</h3>
        </div>
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="w-8 px-2 py-3" />
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Person</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Module</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Note</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Duration</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isExpanded = expandedRow === entry.id;
                  return (
                    <Fragment key={entry.id}>
                      {/* Main row */}
                      <tr
                        className="hover:bg-[var(--teal-soft)] transition-colors cursor-pointer"
                        style={{ borderBottom: isExpanded ? "none" : "1px solid var(--line)" }}
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                      >
                        <td className="px-2 py-3 text-center">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className={`inline-block transition-transform text-[var(--muted)] ${isExpanded ? "rotate-90" : ""}`}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </td>
                        <td className="px-5 py-3 font-medium text-[var(--ink)]">{entry.clientName}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{entry.personName}</td>
                        <td className="px-5 py-3">
                          {entry.serviceLabel ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: SERVICE_META[entry.serviceKey as ServiceKey]?.pillBg || "var(--teal-soft)", color: SERVICE_META[entry.serviceKey as ServiceKey]?.pillColor || "var(--teal)" }}>
                              {entry.serviceLabel}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3" style={{ maxWidth: 250 }}>
                          {editingNote === entry.id ? (
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onBlur={() => {
                                setEntries((prev) => prev.map((e) =>
                                  e.id === entry.id ? { ...e, note: editText.trim() } : e
                                ));
                                setEditingNote(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setEntries((prev) => prev.map((en) =>
                                    en.id === entry.id ? { ...en, note: editText.trim() } : en
                                  ));
                                  setEditingNote(null);
                                }
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-2 py-1 rounded border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none w-full"
                            />
                          ) : (
                            <span
                              onClick={(e) => { e.stopPropagation(); setEditingNote(entry.id); setEditText(entry.note || ""); }}
                              className="text-xs cursor-pointer hover:text-[var(--teal)] block truncate"
                              style={{ color: entry.note ? "var(--ink)" : "var(--muted)" }}
                            >
                              {entry.note || "Click to add note..."}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[var(--teal)]">{formatDuration(entry.duration)}</td>
                        <td className="px-5 py-3 text-right text-xs text-[var(--muted)]">
                          {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                          {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>

                      {/* Expanded comment row */}
                      {isExpanded && (
                        <tr style={{ borderBottom: "1px solid var(--line)", backgroundColor: "var(--teal-soft)" }}>
                          <td colSpan={7} className="px-8 py-3">
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mt-0.5 shrink-0">
                                Comment
                              </span>
                              {editingComment === entry.id ? (
                                <div className="flex-1">
                                  <textarea
                                    value={editCommentText}
                                    onChange={(e) => {
                                      if (e.target.value.length <= 300) setEditCommentText(e.target.value);
                                    }}
                                    maxLength={300}
                                    rows={2}
                                    autoFocus
                                    className="text-xs px-2 py-1 rounded border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none w-full resize-none"
                                  />
                                  <div className="flex justify-between items-center mt-1">
                                    <span className={`text-[10px] ${editCommentText.length >= 280 ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>
                                      {editCommentText.length}/300
                                    </span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingComment(null);
                                        }}
                                        className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)] px-2 py-0.5 rounded"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEntries((prev) => prev.map((en) =>
                                            en.id === entry.id ? { ...en, comment: editCommentText.trim() } : en
                                          ));
                                          setEditingComment(null);
                                        }}
                                        className="text-[10px] font-semibold text-white bg-[var(--teal)] hover:opacity-90 px-3 py-1 rounded"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-start justify-between gap-3">
                                  <span
                                    className="text-xs cursor-pointer hover:text-[var(--teal)]"
                                    style={{ color: entry.comment ? "var(--ink)" : "var(--muted)" }}
                                    onClick={(e) => { e.stopPropagation(); setEditingComment(entry.id); setEditCommentText(entry.comment || ""); }}
                                  >
                                    {entry.comment || "Click to add comment..."}
                                  </span>
                                  {entry.comment && (
                                    <span className="text-[10px] text-[var(--muted)] shrink-0">{entry.comment.length}/300</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted)]">No time entries yet. Start the timer to begin tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
