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

// ── Stage colors (matching demo spec) ──
const STAGE_STYLES: Record<
  WorklistStage,
  { bg: string; fg: string; ring?: string }
> = {
  "": { bg: "transparent", fg: "var(--muted)" },
  ip: { bg: "var(--amber-soft)", fg: "var(--amber)" },
  wc: { bg: "var(--amber-soft)", fg: "var(--amber)" },
  pp: { bg: "var(--teal-soft)", fg: "var(--teal)" },
  dn: { bg: "var(--green-soft)", fg: "var(--green)" },
  na: { bg: "var(--red-soft)", fg: "var(--red)" },
};

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
): Set<number> {
  switch (frequency) {
    case "Monthly":
      return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    case "Quarterly":
      return new Set([0, 3, 6, 9]); // Jan, Apr, Jul, Oct
    case "Annually":
      return new Set([3]); // April
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

  // ── T9 actual counts lookup — uses real expected_annual from services
  const t9ActualCounts = useMemo<Record<string, number[]>>(() => {
    const map: Record<string, number[]> = {};
    for (const client of serviceClients) {
      const svc = client.services.find((s: any) => s.key === serviceKey);
      const expected = svc?.expectedAnnual || 0;
      const counts: number[] = [];
      for (let m = 0; m < 12; m++) {
        counts.push(m === 3 ? expected : 0); // Only April (month 3) has the expected count
      }
      map[client.id] = counts;
    }
    return map;
  }, [serviceClients, serviceKey]);

  // ── Stage picker state ──
  const [pickerTarget, setPickerTarget] = useState<{ clientId: string; monthIdx: number } | null>(null);

  // ── Cell click handler — opens stage picker ──
  const handleCellClick = useCallback(
    (clientId: string, monthIdx: number) => {
      if (readOnly || isHistorical) return;
      setPickerTarget({ clientId, monthIdx });
    },
    [readOnly, isHistorical],
  );

  // ── Stage select handler — applies stage and closes picker ──
  const handleStageSelect = useCallback(
    (clientId: string, monthIdx: number, stage: WorklistStage) => {
      const key = `${clientId}:${serviceKey}`;

      setWorklistState((prev) => {
        const stages = [...(prev[key] ?? [])];
        if (!stages.length) return prev;
        stages[monthIdx] = stage;
        return { ...prev, [key]: stages };
      });

      if (onStageChange) {
        onStageChange(clientId, monthIdx, stage);
      }

      setPickerTarget(null);
    },
    [serviceKey, onStageChange],
  );

  const closePicker = useCallback(() => setPickerTarget(null), []);

  // ── Stats ──
  const stats = useMemo(() => {
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
      const activeMonths = getActiveMonths(svc.frequency);

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
  const colCount = 2 + (variant !== "t9" && serviceKey !== "renditions" && serviceKey !== "tax_returns" ? 1 : 0) + (variant === "payroll" ? 1 : 0) + 12;

  return (
    <div className="space-y-3">
      {/* ── Compact stats row ── */}
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

      {/* ── Search ── */}
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

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {legendItems.map(({ stage, dot }) => {
          const style = STAGE_STYLES[stage];
          const label = STAGE_LABELS[stage] || (stage === "" ? "Not Due/Empty" : STAGE_LABELS[stage]);
          const displayLabel = stage === "" ? "Not Due" : label;
          return (
            <span key={stage} className="inline-flex items-center gap-1">
              <span
                className="inline-flex items-center justify-center w-3 h-3 rounded text-[9px] font-bold leading-none"
                style={{
                  backgroundColor: style.bg,
                  color: style.fg,
                  border: stage === "" ? "1px dashed var(--line)" : "1px solid transparent",
                }}
              >
                {stage === "" ? dot : ""}
              </span>
              <span className="text-[var(--muted)]">{displayLabel}</span>
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1 ml-2">
          <span className="w-3 h-3 rounded border-2 border-[var(--red)]" />
          <span className="text-[var(--muted)]">Delayed</span>
        </span>
      </div>

      {/* ── Historical banner (if applicable) ── */}
      {isHistorical && (
        <div
          className="px-3 py-2 rounded-lg flex gap-2 text-xs"
          style={{
            backgroundColor: "var(--amber-soft)",
            border: "1px solid #ead9b6",
            color: "#7a5210",
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
              {variant !== "t9" && serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
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
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-8 text-center text-xs text-[var(--muted)]"
                >
                  No clients with this service enabled.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const svc = client.services.find((s) => s.key === serviceKey)!;
                const activeMonths = getActiveMonths(svc.frequency);
                const key = `${client.id}:${serviceKey}`;
                const stages = worklistState[key] ?? Array(12).fill("");

                // Payroll processor lookup
                const payrollSvc = client.services.find((s: any) => s.key === "payroll");
                const processor = payrollSvc?.processor || "-";

                return (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-[var(--teal-soft)]/30"
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
                    {variant !== "t9" && serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
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

                      // ── T9 variant: show count badges ──
                      if (variant === "t9" && isActive) {
                        const expected = getT9ExpectedCount(client.id);
                        const actual = t9ActualCounts[client.id]?.[i] ?? 0;
                        const pct = Math.min(
                          100,
                          Math.round((actual / expected) * 100),
                        );

                        return (
                          <td key={i} className="px-0 py-1.5">
                            <CellWrapper
                              isCurrentMonth={isCurrentMonth}
                              isPastDue={isPastDue}
                              readOnly={cellReadOnly}
                              onClick={() => handleCellClick(client.id, i)}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className="text-[9px] font-semibold leading-none"
                                  style={{ color: style.fg }}
                                >
                                  {actual}/{expected}
                                </span>
                                <div
                                  className="w-full h-0.5 rounded-full"
                                  style={{
                                    backgroundColor: "var(--line)",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full transition-[width]"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: style.fg,
                                    }}
                                  />
                                </div>
                              </div>
                            </CellWrapper>
                          </td>
                        );
                      }

                      // ── Default variant: colored squares ──
                      return (
                        <td key={i} className="px-0 py-1.5">
                          <CellWrapper
                            isCurrentMonth={isCurrentMonth}
                            isPastDue={isPastDue}
                            readOnly={cellReadOnly}
                            onClick={() => handleCellClick(client.id, i)}
                          >
                            <div
                              className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold leading-none transition-colors"
                              style={{
                                backgroundColor: style.bg,
                                color: style.fg,
                                border:
                                  stage === ""
                                    ? "1px dashed var(--line)"
                                    : isActive
                                      ? "1px solid transparent"
                                      : "none",
                                cursor: cellReadOnly
                                  ? "default"
                                  : "pointer",
                                opacity: !isActive ? 0.3 : 1,
                              }}
                              title={`${MONTHS_SHORT[i]}: ${STAGE_LABELS[stage]}${isPastDue ? " (Delayed)" : ""}`}
                            >
                              {stage === "" ? "·" : stage === "ip" ? "" : ""}
                              {stage === "ip"
                                ? "◐"
                                : stage === "wc"
                                  ? "◑"
                                  : stage === "pp"
                                    ? "◕"
                                    : stage === "dn"
                                      ? "✓"
                                      : stage === "na"
                                        ? "✗"
                                        : ""}
                            </div>
                          </CellWrapper>
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
      <p className="text-[10px] text-[var(--muted)] leading-relaxed italic">
        Click a cell to open the stage picker. Past-due months that aren&apos;t
        marked Done or N/A are flagged with a red border. Cells are only active
        for months aligned with the service frequency cadence.
      </p>

      {/* ── Stage Picker overlay ── */}
      {pickerTarget && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={closePicker}
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          {/* Picker sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-4 pt-5 pb-8"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-[var(--ink)]">
                {MONTHS_SHORT[pickerTarget.monthIdx]} — Set Status
              </span>
              <button
                onClick={closePicker}
                className="text-xs text-[var(--muted)] bg-transparent border-none cursor-pointer px-2 py-1 rounded hover:bg-[var(--teal-soft)] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STAGE_CYCLE.map((stage) => {
                const style = STAGE_STYLES[stage];
                const label = STAGE_LABELS[stage] || "Not Due";
                const key = `${pickerTarget.clientId}:${serviceKey}`;
                const stages = worklistState[key] ?? [];
                const currentStage = stages[pickerTarget.monthIdx] || "";
                const isCurrent = stage === currentStage;
                return (
                  <button
                    key={stage}
                    onClick={() =>
                      handleStageSelect(pickerTarget.clientId, pickerTarget.monthIdx, stage)
                    }
                    className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-colors border"
                    style={{
                      backgroundColor: isCurrent ? style.bg : "transparent",
                      borderColor: isCurrent ? style.fg : "var(--line)",
                      color: isCurrent ? style.fg : "var(--muted)",
                      fontWeight: isCurrent ? 700 : 400,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold"
                      style={{
                        backgroundColor: isCurrent ? style.bg : style.bg || "transparent",
                        color: style.fg,
                        border: stage === "" && !isCurrent
                          ? "1px dashed var(--line)"
                          : "1px solid transparent",
                      }}
                    >
                      {stage === ""
                        ? "·"
                        : stage === "ip"
                          ? "◐"
                          : stage === "wc"
                            ? "◑"
                            : stage === "pp"
                              ? "◕"
                              : stage === "dn"
                                ? "✓"
                                : stage === "na"
                                  ? "✗"
                                  : ""}
                    </span>
                    <span className="text-[11px] leading-tight text-center">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
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
          ? "0 0 0 2px var(--red), 0 0 0 3px var(--red-soft)"
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
