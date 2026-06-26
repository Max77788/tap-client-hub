"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import type { Client, ServiceConfig, ServiceKey, MonthStatus } from "@/lib/types";
import { MONTHS_SHORT } from "@/lib/data";

// ── Worklist stage types ──
export type WorklistStage = "" | "ip" | "wc" | "pp" | "dn" | "na";

const STAGE_LABELS: Record<WorklistStage, string> = {
  "": "Not Started",
  ip: "In Progress",
  wc: "Waiting on Client",
  pp: "Prepared",
  dn: "Done",
  na: "N/A",
};

const STAGE_CYCLE: WorklistStage[] = ["", "ip", "wc", "pp", "dn", "na"];

// ── Stage colors (matching demo v7 mcell classes exactly) ──
// prog=blue, wait=amber, prep=teal, done=green, na=red, lock=not due
const STAGE_STYLES: Record<
  WorklistStage,
  { bg: string; fg: string; border: string; cls: string; label: string }
> = {
  "": { bg: "transparent", fg: "#c2c8d4", border: "transparent", cls: "lock", label: "Not due" },
  ip: { bg: "var(--blue-soft)", fg: "var(--blue)", border: "#bcd0e2", cls: "prog", label: "In progress" },
  wc: { bg: "var(--amber-soft)", fg: "var(--amber)", border: "#e8d3a6", cls: "wait", label: "Waiting on client" },
  pp: { bg: "var(--teal-soft)", fg: "var(--teal-ink)", border: "#c5d0ec", cls: "prep", label: "Prepared" },
  dn: { bg: "var(--green-soft)", fg: "var(--green)", border: "#bcdcc6", cls: "done", label: "Done" },
  na: { bg: "var(--red-soft)", fg: "var(--red)", border: "#e8c4bf", cls: "na", label: "N/A" },
};

// Single-click cycling: advances to next stage, wraps from na back to blank
function nextStage(current: WorklistStage): WorklistStage {
  const cycle: WorklistStage[] = ["", "ip", "wc", "pp", "dn", "na"];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

// ── Map existing MonthStatus → WorklistStage ──
function mapMonthStatus(status: MonthStatus): WorklistStage {
  switch (status) {
    case "done":
    case "paid":
      return "dn";
    case "billed":
      return "pp";
    case "na":
      return "na";
    case "in_progress":
      return "ip";
    case "waiting":
      return "wc";
    case "lock":
    default:
      return "";
  }
}

// ── Active months by frequency ──
function getActiveMonths(
  frequency: ServiceConfig["frequency"],
  startMonth?: number,
): Set<number> {
  switch (frequency) {
    case "Monthly":
      return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    case "Quarterly": {
      const s = startMonth ?? 0; // default Jan
      return new Set([s % 12, (s + 3) % 12, (s + 6) % 12, (s + 9) % 12]);
    }
    case "Annually":
    case "Yearly":
      return new Set([startMonth ?? 3]); // default April
    default:
      return new Set();
  }
}

// ── Payroll run count logic ──
type PayrollCadence = "Weekly" | "Bi-Weekly" | "Monthly";
function getExpectedRuns(cadence: PayrollCadence): number {
  switch (cadence) {
    case "Weekly":
      return 4;
    case "Bi-Weekly":
      return 2;
    case "Monthly":
      return 1;
  }
}

// ── 1099 expected counts — use real client_services.expected_annual
export function getT9ExpectedCount(clientId: string, svc?: any): number {
  if (svc?.expectedAnnual && svc.expectedAnnual > 0) return svc.expectedAnnual;
  return 0;
}

// ══════════════════════════════════════════════
// ── Worklist Table Component ──
// ══════════════════════════════════════════════

// ── Map WorklistStage → MonthStatus for persistence ──
export function stageToMonthStatus(stage: WorklistStage): MonthStatus {
  switch (stage) {
    case "dn":
      return "done";
    case "pp":
      return "billed";
    case "":
      return "lock";
    case "na":
      return "na";
    case "ip":
      return "in_progress";
    case "wc":
      return "waiting";
    default:
      return "lock";
  }
}

export interface WorklistTableProps {
  serviceKey: ServiceKey;
  clients: any[];
  year: number;
  variant?: "default" | "payroll" | "t9";
  readOnly?: boolean;
  loading?: boolean;
  onStageChange?: (clientId: string, monthIdx: number, stage: WorklistStage) => void;
  onClientClick?: (clientId: string) => void;
}

// ── Build initial worklist state from clients ──
function buildWorklistState(clients: any[], serviceKey: ServiceKey): Record<string, WorklistStage[]> {
  const state: Record<string, WorklistStage[]> = {};
  for (const client of clients) {
    const svc = client.services.find((s: any) => s.key === serviceKey);
    if (!svc?.enabled) continue;
    const key = `${client.id}:${serviceKey}`;
    state[key] = (svc.months as any[]).map(mapMonthStatus);
  }
  return state;
}

export default function WorklistTable({
  serviceKey,
  clients,
  year,
  variant = "default",
  readOnly = false,
  loading = false,
  onStageChange,
  onClientClick,
}: WorklistTableProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const isHistorical = year < currentYear;

  // ── Filter clients with this service enabled ──
  const serviceClients = useMemo(
    () =>
      clients.filter((c) => {
        const svc = c.services.find((s) => s.key === serviceKey);
        return svc?.enabled;
      }),
    [clients, serviceKey],
  );

  // ── Search state ──
  const [search, setSearch] = useState("");
  const filteredClients = useMemo(
    () =>
      search
        ? serviceClients.filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase()),
          )
        : serviceClients,
    [serviceClients, search],
  );

  // ── Initialize worklist state from client data ──
  const [worklistState, setWorklistState] = useState<
    Record<string, WorklistStage[]>
  >(() => buildWorklistState(clients, serviceKey));

  // Re-sync when clients or service key changes (edits flow through updateServiceMonth)
  useEffect(() => {
    setWorklistState(buildWorklistState(clients, serviceKey));
  }, [clients, serviceKey]);

  // ── Payroll cadence lookup ──
  const payrollCadences = useMemo<Record<string, PayrollCadence>>(() => {
    const map: Record<string, PayrollCadence> = {};
    const cadences: PayrollCadence[] = [
      "Weekly",
      "Bi-Weekly",
      "Monthly",
    ];
    let idx = 0;
    for (const client of serviceClients) {
      map[client.id] = cadences[idx % cadences.length];
      idx++;
    }
    return map;
  }, [serviceClients]);

  // ── T9 counts local state ──
  const [t9Counts, setT9Counts] = useState<Record<string, number[]>>(() => {
    const map: Record<string, number[]> = {};
    for (const client of clients) {
      const svc = client.services.find((s: any) => s.key === "1099s");
      if (!svc?.enabled) continue;
      const key = `${client.id}:1099s`;
      if (svc.t9Counts && Array.isArray(svc.t9Counts)) {
        map[key] = [...svc.t9Counts];
      } else {
        map[key] = Array(12).fill(0);
      }
    }
    return map;
  });

  // Re-sync t9 counts when clients change
  useEffect(() => {
    setT9Counts((prev) => {
      const next: Record<string, number[]> = {};
      for (const client of clients) {
        const svc = client.services.find((s: any) => s.key === "1099s");
        if (!svc?.enabled) continue;
        const key = `${client.id}:1099s`;
        if (prev[key]) { next[key] = prev[key]; }
        else if (svc.t9Counts && Array.isArray(svc.t9Counts)) { next[key] = [...svc.t9Counts]; }
        else { next[key] = Array(12).fill(0); }
      }
      return next;
    });
  }, [clients]);

  // ── T9 bump handler ──
  const t9Bump = useCallback((clientId: string, monthIdx: number, ev: React.MouseEvent) => {
    if (isHistorical) return;
    const key = `${clientId}:1099s`;
    setT9Counts((prev) => {
      const counts = [...(prev[key] ?? Array(12).fill(0))];
      const delta = ev.shiftKey ? -1 : 1;
      counts[monthIdx] = Math.max(0, (counts[monthIdx] || 0) + delta);
      // Persist
      const svc = clients.find((c) => c.id === clientId)?.services.find((s: any) => s.key === "1099s");
      if (svc?.csId) {
        const period = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
        fetch("/api/period-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_service_id: svc.csId, period, processed: counts[monthIdx] }),
        }).catch(() => {});
      }
      return { ...prev, [key]: counts };
    });
  }, [isHistorical, clients, year]);

  // ── Cell click handler — directly cycles stage (no picker) ──
  const handleCellClick = useCallback(
    (clientId: string, monthIdx: number) => {
      if (readOnly || isHistorical) return;
      const key = `${clientId}:${serviceKey}`;
      const stages = [...(worklistState[key] ?? [])];
      if (!stages.length) return;
      const current = (stages[monthIdx] || "") as WorklistStage;
      const next = nextStage(current);
      stages[monthIdx] = next;
      setWorklistState((prev) => ({ ...prev, [key]: stages }));
      if (onStageChange) onStageChange(clientId, monthIdx, next);
    },
    [readOnly, isHistorical, serviceKey, worklistState, onStageChange],
  );

  // ── Stats ──
  const stats = useMemo(() => {
    if (variant === "t9") {
      const isCur = !isHistorical;
      let expTot = 0, doneTot = 0;
      for (const client of serviceClients) {
        const svc = client.services.find((s) => s.key === serviceKey);
        if (!svc) continue;
        const exp = svc.expectedAnnual || 0;
        expTot += exp;
        const t9key = `${client.id}:1099s`;
        const counts = t9Counts[t9key] ?? Array(12).fill(0);
        const done = counts.reduce((s: number, n: number) => s + (n || 0), 0);
        doneTot += done;
      }
      const curMonthCount = isCur ? (() => {
        let c = 0;
        for (const client of serviceClients) {
          const t9key = `${client.id}:1099s`;
          const counts = t9Counts[t9key] ?? Array(12).fill(0);
          c += (counts[currentMonth] || 0);
        }
        return c;
      })() : 0;
      return { expTot, doneTot, rem: Math.max(0, expTot - doneTot), curMonthCount, currentMonthName: MONTHS_SHORT[currentMonth], isCur };
    }

    const currentMonthName = MONTHS_SHORT[currentMonth];
    let dueThisMonth = 0;
    let inProgress = 0;
    let waiting = 0;
    let prepared = 0;
    let done = 0;
    let behind = 0;

    for (const client of serviceClients) {
      const svc = client.services.find((s) => s.key === serviceKey);
      if (!svc) continue;
      const activeMonths = getActiveMonths(svc.frequency, svc.financialsMonth);

      if (activeMonths.has(currentMonth) && year === currentYear) {
        dueThisMonth++;
      }

      const key = `${client.id}:${serviceKey}`;
      const stages = worklistState[key] ?? [];
      for (let m = 0; m < 12; m++) {
        if (activeMonths.has(m)) {
          // Past due check: month is before current, not done, not na, not empty
          if (m < currentMonth && stages[m] !== "dn" && stages[m] !== "na" && stages[m] !== "" && !isHistorical) {
            behind++;
          }
          switch (stages[m]) {
            case "ip":
              inProgress++;
              break;
            case "wc":
              waiting++;
              break;
            case "pp":
              prepared++;
              break;
            case "dn":
              done++;
              break;
          }
        }
      }
    }

    return { dueThisMonth, inProgress, waiting, prepared, done, behind, currentMonthName };
  }, [serviceClients, serviceKey, currentMonth, year, currentYear, worklistState, isHistorical]);

  // ── Stage legend ──
  const legendItems: { stage: WorklistStage; dot: string }[] = [
    { stage: "", dot: "·" },
    { stage: "ip", dot: "●" },
    { stage: "wc", dot: "●" },
    { stage: "pp", dot: "●" },
    { stage: "dn", dot: "●" },
    { stage: "na", dot: "●" },
  ];

  // ── Compact month column class ──
  const monthColClass =
    "text-center text-[11px] font-semibold uppercase tracking-tight";

  // ── Count of columns before month columns (for colspan) ──
  const baseCols = 2; // Client + Assigned
  const extraCols = serviceKey !== "renditions" && serviceKey !== "tax_returns" ? 1 : 0; // Cadence
  const payrollCols = variant === "payroll" ? 1 : 0;
  const t9PostCols = variant === "t9" ? 2 : 0; // Done + Left
  const t9PreCols = variant === "t9" ? 1 : 0; // Expected
  const colCount = baseCols + extraCols + payrollCols + t9PreCols + 12 + t9PostCols;

  return (
    <div className="space-y-3">
      {/* ── Compact stats row ── */}
      {variant === "t9" ? (
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span style={{ color: "var(--ink)" }}>
            <strong>{stats.expTot}</strong> Expected (year)
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span style={{ color: "var(--green)" }}>
            <strong>{stats.doneTot}</strong> Processed
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span style={{ color: stats.rem > 0 ? "var(--amber)" : "var(--green)" }}>
            <strong>{stats.rem}</strong> Remaining
          </span>
          <span className="text-[var(--muted)]">·</span>
          <span style={{ color: "var(--blue)" }}>
            <strong>{stats.curMonthCount}</strong> In {stats.currentMonthName}
          </span>
        </div>
      ) : (
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="font-semibold text-[var(--ink)]">{serviceClients.length} clients</span>
        <span className="text-[var(--muted)]">·</span>
        <span style={{ color: "var(--teal)" }}>
          <strong>{stats.dueThisMonth}</strong> due in {stats.currentMonthName}
        </span>
        <span className="text-[var(--muted)]">·</span>
        <span style={{ color: stats.behind > 0 ? "var(--red)" : "var(--green)" }}>
          <strong>{stats.behind}</strong> behind
        </span>
        <span className="text-[var(--muted)]">·</span>
        <span style={{ color: "var(--blue)" }}>
          <strong>{stats.inProgress + stats.waiting}</strong> in progress
        </span>
        <span className="text-[var(--muted)]">·</span>
        <span style={{ color: "var(--green)" }}>
          <strong>{stats.done}</strong> done
        </span>
      </div>
      )}

      {/* ── Search ── */}
      {variant !== "t9" && (
      <div className="flex gap-2 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[13px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]"
        />
        {search && filteredClients.length < serviceClients.length && (
          <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">
            {filteredClients.length} of {serviceClients.length}
          </span>
        )}
      </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3.5 text-xs" style={{ margin: "14px 0 2px" }}>
        {STAGE_CYCLE.filter(s => s !== "").map(s => (
          <span key={s} className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: STAGE_STYLES[s].fg }}></i>
            {STAGE_STYLES[s].label}
          </span>
        ))}
        {!isHistorical && <span className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "var(--red)" }}></i>Delayed (auto)</span>}
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "var(--red)" }}></i>N/A</span>
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "#c2c8d4" }}></i>Not due</span>
        <span style={{ marginLeft: "auto", fontStyle: "italic", opacity: 0.8, fontSize: 11, color: "var(--muted)" }}>
          {!isHistorical ? "click a cell to advance · red ring = past due, flagged automatically" : `${year} — read-only history`}
        </span>
      </div>

      {/* ── Count line ── */}
      <div className="text-xs" style={{ color: "var(--muted)", margin: "6px 2px 6px" }}>
        {!isHistorical
          ? `${serviceClients.length} client${serviceClients.length !== 1 ? "s" : ""} · highlighted column = this month (${MONTHS_SHORT[currentMonth]})`
          : `${serviceClients.length} client${serviceClients.length !== 1 ? "s" : ""} · ${year} history`}
      </div>

      {/* ── Historical banner (if applicable) ── */}
      {isHistorical && (
        <div
          className="px-3 py-2 rounded-lg flex gap-2 text-xs"
          style={{
            backgroundColor: "var(--amber-soft)",
            border: "1px solid var(--amber)",
            color: "var(--amber)",
          }}
        >
          <span>📋</span>
          <span>Historical view for <strong>{year}</strong>. Read-only.</span>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 rounded-lg" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)", border: "1px solid var(--line)" }}>
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "var(--teal)" }}>Loading data...</span>
          </div>
        </div>
      )}

      {/* ── T9 count text ── */}
      {variant === "t9" && (
        <div className="text-xs text-[var(--muted)]" style={{ margin: "8px 2px 6px" }}>
          {!isHistorical
            ? "Counted by month — a client\u2019s 1099s don\u2019t all arrive together. Counts feed your per-1099 billing."
            : `${year} history — read-only. Switch the Year selector back to ${currentYear} to log counts.`}
        </div>
      )}

      {/* ── Main table (horizontally scrollable on mobile) ── */}
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
        }}
      >
        <div className="overflow-x-auto">
        <table className="border-collapse table-fixed" style={{ minWidth: 800, width: "100%" }}>
          <thead>
            {variant === "t9" ? (
            <tr style={{ borderBottom: "2px solid var(--line)" }} className="text-left">
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "22%" }}>Client</th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "12%" }}>Assigned</th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)] text-center" style={{ width: "7%" }}>Expected</th>
              {MONTHS_SHORT.map((m, i) => {
                const isCM = i === currentMonth && !isHistorical;
                return <th key={m} className={monthColClass + " px-0.5 py-2"} style={{ width: "auto", color: isCM ? "var(--teal)" : "var(--muted)", backgroundColor: isCM ? "var(--teal-soft)" : "transparent", borderBottom: isCM ? "2px solid var(--teal)" : "none" }}>{m}</th>;
              })}
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)] text-center" style={{ width: "6%" }}>Done</th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)] text-center" style={{ width: "6%" }}>Left</th>
            </tr>
            ) : (
            <tr
              style={{ borderBottom: "2px solid var(--line)" }}
              className="text-left"
            >
              <th
                className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)]"
                style={{ width: "22%" }}
              >
                Client
              </th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "12%" }}>
                Assigned
              </th>
              {serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "11%" }}>
                Cadence
              </th>
              )}
              {variant === "payroll" && (
              <th className="px-2 py-2 font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "12%" }}>
                Processor
              </th>
              )}
              {MONTHS_SHORT.map((m, i) => {
                const isCurrentMonth = i === currentMonth && !isHistorical;
                return (
                  <th
                    key={m}
                    className={monthColClass + " px-0.5 py-2"}
                    style={{
                      width: "auto",
                      color: isCurrentMonth
                        ? "var(--teal)"
                        : "var(--muted)",
                      backgroundColor: isCurrentMonth
                        ? "var(--teal-soft)"
                        : "transparent",
                      borderBottom: isCurrentMonth
                        ? "2px solid var(--teal)"
                        : "none",
                    }}
                  >
                    {m}
                  </th>
                );
              })}
            </tr>
            )}
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-8 text-center text-xs text-[var(--muted)]"
                >
                  {variant === "t9" ? "No 1099 clients yet. Open a client and switch 1099 Filing on." : "No clients with this service enabled."}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const svc = client.services.find((s) => s.key === serviceKey)!;
                const activeMonths = getActiveMonths(svc.frequency, svc.financialsMonth);
                const key = `${client.id}:${serviceKey}`;
                const stages = worklistState[key] ?? Array(12).fill("");

                const payrollSvc = client.services.find((s: any) => s.key === "payroll");
                const processor = payrollSvc?.processor || "-";

                // ── T9 variant: count-based table ──
                if (variant === "t9") {
                  const exp = svc.expectedAnnual || 0;
                  const t9key = `${client.id}:1099s`;
                  const counts = t9Counts[t9key] ?? Array(12).fill(0);
                  const done = counts.reduce((a: number, b: number) => a + (b || 0), 0);
                  const left = Math.max(0, exp - done);
                  return (
                    <tr key={client.id} className="transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="px-2 py-1.5">
                        <button onClick={() => onClientClick?.(client.id)}
                          className="text-sm font-medium text-[var(--ink)] truncate text-left w-full bg-transparent border-none cursor-pointer hover:text-[var(--teal)] transition-colors p-0">{client.name}</button>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-[var(--muted)] whitespace-nowrap truncate">{svc.processor || svc.assignedTo || "-"}</td>
                      <td className="px-2 py-1.5 text-center text-xs font-semibold text-[var(--ink)] tabular-nums">{exp || "—"}</td>
                      {MONTHS_SHORT.map((mo, i) => {
                        const n = +counts[i] || 0;
                        const isCM = i === currentMonth && !isHistorical;
                        const clickable = !isHistorical;
                        return (
                          <td key={mo} className={`px-0 py-1.5 ${isCM ? "bg-[var(--teal-soft)]" : ""}`}>
                            <div
                              onClick={clickable ? (e) => t9Bump(client.id, i, e) : undefined}
                              className={`inline-flex items-center justify-center w-full h-7 rounded text-xs font-semibold tabular-nums transition-colors cursor-${clickable ? "pointer" : "default"} hover:scale-110 hover:shadow-sm active:scale-95`}
                              style={{
                                backgroundColor: n > 0 ? "var(--green-soft)" : "transparent",
                                color: n > 0 ? "var(--green)" : "var(--muted)",
                              }}
                              title={`${mo}: ${n} processed${clickable ? " — click +1, shift-click -1" : ""}`}
                            >{n || "·"}</div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center text-xs font-semibold tabular-nums" style={{ color: "var(--green)" }}>{done}</td>
                      <td className={`px-2 py-1.5 text-center text-xs font-semibold tabular-nums ${left > 0 ? "text-[var(--amber)]" : "text-[var(--green)]"}`}>{left}</td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={client.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    {/* Client name (clickable) */}
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => onClientClick?.(client.id)}
                        className="text-sm font-medium text-[var(--ink)] truncate text-left w-full bg-transparent border-none cursor-pointer hover:text-[var(--teal)] transition-colors p-0"
                        title={`Open ${client.name} details`}
                      >
                        {client.name}
                      </button>
                    </td>

                    {/* Assigned */}
                    <td className="px-2 py-1.5 text-[11px] text-[var(--muted)] whitespace-nowrap truncate">
                      {svc.processor || svc.assignedTo || "-"}
                    </td>

                    {/* Cadence */}
                    {serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
                    <td className="px-2 py-1.5 text-[11px] text-[var(--muted)] whitespace-nowrap truncate">
                      {variant === "payroll"
                        ? payrollCadences[client.id] ?? "Monthly"
                        : svc.frequency}
                    </td>
                    )}

                    {/* Processor column (payroll only) */}
                    {variant === "payroll" && (
                    <td className="px-2 py-1.5 text-[11px] text-[var(--muted)] whitespace-nowrap truncate">
                      {processor}
                    </td>
                    )}

                    {/* Month cells */}
                    {MONTHS_SHORT.map((_m, i) => {
                      const stage = (stages[i] || "") as WorklistStage;
                      const style = STAGE_STYLES[stage];
                      const isActive = activeMonths.has(i);
                      const isPastDue =
                        isActive &&
                        i < currentMonth &&
                        stage !== "dn" &&
                        stage !== "na" &&
                        stage !== "" &&
                        !isHistorical;

                      const isCurrentMonth = i === currentMonth && !isHistorical;
                      const cellReadOnly = readOnly || isHistorical;

                      // ── Payroll variant: show run counts ──
                      if (variant === "payroll" && isActive) {
                        const cadence = payrollCadences[client.id] ?? "Monthly";
                        const expected = getExpectedRuns(cadence);
                        const completed = stage === "dn"
                          ? expected
                          : Math.max(0, expected - 1 - (i % 2));

                        return (
                          <td key={i} className="px-0 py-1.5">
                            <CellWrapper
                              isCurrentMonth={isCurrentMonth}
                              isPastDue={isPastDue}
                              readOnly={cellReadOnly}
                              onClick={() => handleCellClick(client.id, i)}
                            >
                              <span
                                className="text-[9px] font-semibold leading-none"
                                style={{ color: style.fg }}
                              >
                                {completed}/{expected}
                              </span>
                            </CellWrapper>
                          </td>
                        );
                      }

                      // ── Default variant: mcell squares (demo v7 style) ──
                      const t = stage === "" ? (isPastDue && !isHistorical ? "!" : "·")
                        : stage === "ip" ? "•"
                        : stage === "wc" ? "⏳"
                        : stage === "pp" ? "✓"
                        : stage === "dn" ? "✓"
                        : stage === "na" ? "–" : "";
                      const delayed = isPastDue && !isHistorical;
                      const lockHist = isHistorical && isActive;
                      return (
                        <td key={i} className="px-0 py-1.5">
                          <div
                            onClick={cellReadOnly ? undefined : () => handleCellClick(client.id, i)}
                            className="mcell"
                            style={{
                              width: 30, height: 30, borderRadius: 8,
                              border: `1px solid ${!isActive ? "transparent" : delayed ? "var(--red)" : style.border}`,
                              background: !isActive ? "transparent" : style.bg,
                              color: !isActive ? (lockHist ? "var(--muted)" : "transparent") : style.fg,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              margin: "0 auto",
                              fontWeight: 700, fontSize: 14, userSelect: "none",
                              cursor: (!isActive || cellReadOnly) ? "default" : "pointer",
                              boxShadow: delayed ? "0 0 0 2px var(--red)" : "none",
                              opacity: !isActive && !lockHist ? 0 : 1,
                            } as React.CSSProperties}
                            title={`${MONTHS_SHORT[i]} — ${delayed ? "DELAYED · " : ""}${STAGE_LABELS[stage]}${isHistorical ? ` (${year})` : ""}`}
                          >{isActive || lockHist ? t : ""}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* ── Fine-print note ── */}
      {variant === "t9" ? (
        <p className="text-[11px] text-[var(--muted)] leading-relaxed" style={{ margin: "14px 2px 0", fontStyle: "italic" }}>
          Set each client&rsquo;s expected total on their card; log how many you
          process each month here. &ldquo;Left&rdquo; stays amber until the
          expected count is cleared. Click a month to add one, shift-click to
          subtract.
        </p>
      ) : (
      <p className="text-[11px] text-[var(--muted)] leading-relaxed" style={{ margin: "14px 2px 0", fontStyle: "italic" }}>
        {!isHistorical
          ? "Every service uses one workflow: In progress → Waiting on client → Prepared → Done. Anything past due flags red on its own. Click a cell to advance through the stages."
          : `Read-only history for ${year}. Switch the Year selector back to ${currentYear} to make changes.`}
      </p>
      )}

      {/* ── Stage Picker — removed: single-click cycling now ── */}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Cell Wrapper (handles delayed ring, current month highlight) ──
// ══════════════════════════════════════════════
function CellWrapper({
  isCurrentMonth,
  isPastDue,
  readOnly,
  onClick,
  children,
}: {
  isCurrentMonth: boolean;
  isPastDue: boolean;
  readOnly: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={readOnly ? undefined : onClick}
      disabled={readOnly}
      className={`inline-flex items-center justify-center w-full h-8 rounded transition-[background-color,color] ${
        readOnly ? "" : "hover:scale-110 hover:shadow-sm active:scale-95"
      }`}
      style={{
        backgroundColor: isCurrentMonth ? "var(--teal-soft)" : "transparent",
        boxShadow: isPastDue
          ? "0 0 0 2px var(--red)"
          : isCurrentMonth
            ? "inset 0 0 0 1px var(--teal)"
            : "none",
        border: "none",
        outline: "none",
      }}
      title={isPastDue ? "Delayed — past due and not completed" : undefined}
    >
      {children}
    </button>
  );
}
