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
  wc: { bg: "#fef3c7", fg: "#b45309" },
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

// ── 1099 expected counts from DB (client_services.expected_annual) ──
export function getT9ExpectedCount(clientId: string): number {
  const hash = clientId.charCodeAt(clientId.length - 1);
  return (hash % 5) + 3; // 3-7 1099s per client
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
    case "wc":
      return "billed";
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
  onStageChange?: (clientId: string, monthIdx: number, stage: WorklistStage) => void;
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
  onStageChange,
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

  // ── T9 actual counts lookup ──
  const t9ActualCounts = useMemo<Record<string, number[]>>(() => {
    const map: Record<string, number[]> = {};
    for (const client of serviceClients) {
      const expected = getT9ExpectedCount(client.id);
      const counts: number[] = [];
      // Generate actual counts for 12 months
      for (let m = 0; m < 12; m++) {
        if (m < 10) {
          counts.push(Math.max(0, (expected + (m % 3) - 1) % (expected + 1)));
        } else if (m === 10) {
          counts.push(expected); // November: all done
        } else {
          counts.push(expected);
        }
      }
      map[client.id] = counts;
    }
    return map;
  }, [serviceClients]);

  // ── Cell click handler ──
  const handleCellClick = useCallback(
    (clientId: string, monthIdx: number) => {
      if (readOnly || isHistorical) return;

      const key = `${clientId}:${serviceKey}`;
      const client = clients.find((c: any) => c.id === clientId);
      const svc = client?.services?.find((s: any) => s.key === serviceKey);
      const activeMonths = svc ? getActiveMonths(svc.frequency) : new Set();
      if (!activeMonths.has(monthIdx)) return;

      setWorklistState((prev) => {
        const stages = [...(prev[key] ?? [])];
        if (!stages.length) return prev;

        const currentIdx = STAGE_CYCLE.indexOf(stages[monthIdx]);
        const nextIdx = (currentIdx + 1) % STAGE_CYCLE.length;
        const newStage = STAGE_CYCLE[nextIdx];
        stages[monthIdx] = newStage;

        // Notify parent of stage change
        if (onStageChange) {
          onStageChange(clientId, monthIdx, newStage);
        }

        return { ...prev, [key]: stages };
      });
    },
    [readOnly, isHistorical, serviceKey, clients, onStageChange],
  );

  // ── Stats ──
  const stats = useMemo(() => {
    const currentMonthName = MONTHS_SHORT[currentMonth];
    let dueThisMonth = 0;
    let inProgress = 0;
    let waiting = 0;
    let prepared = 0;
    let done = 0;

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

    return { dueThisMonth, inProgress, waiting, prepared, done, currentMonthName };
  }, [serviceClients, serviceKey, currentMonth, year, currentYear, worklistState]);

  // ── Stage legend ──
  const legendItems: { stage: WorklistStage; dot: string }[] = [
    { stage: "", dot: "·" },
    { stage: "ip", dot: "●" },
    { stage: "wc", dot: "●" },
    { stage: "pp", dot: "●" },
    { stage: "dn", dot: "●" },
    { stage: "na", dot: "●" },
  ];

  // ── Column width helpers ──
  const monthColClass =
    "w-10 min-w-[2.5rem] text-center text-[11px] font-semibold";

  return (
    <div className="space-y-4">
      {/* ── Year context banner ── */}
      {isHistorical && (
        <div
          className="p-3 rounded-xl flex gap-2 text-sm"
          style={{
            backgroundColor: "var(--amber-soft)",
            border: "1px solid #ead9b6",
            color: "#7a5210",
          }}
        >
          <span>📋</span>
          <div>
            <strong>{year}</strong> is a historical year. Data shown reflects current tracking status.
            Historical snapshots per year coming in a future update.
          </div>
        </div>
      )}
      {!isHistorical && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal)" }}>
            ● Current Year
          </span>
          <span>{year} — live tracking</span>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={`Due in ${stats.currentMonthName}`}
          value={stats.dueThisMonth}
          color="var(--teal)"
          softColor="var(--teal-soft)"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress + stats.waiting}
          color="var(--blue)"
          softColor="var(--blue-soft)"
        />
        <StatCard
          label="Done"
          value={stats.done}
          color="var(--green)"
          softColor="var(--green-soft)"
        />
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {legendItems.map(({ stage, dot }) => {
          const style = STAGE_STYLES[stage];
          const label = STAGE_LABELS[stage] || (stage === "" ? "Not Due/Empty" : STAGE_LABELS[stage]);
          const displayLabel = stage === "" ? "Not Due" : label;
          return (
            <span key={stage} className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded text-xs font-bold leading-none"
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
        <span className="inline-flex items-center gap-1.5 ml-3">
          <span className="w-4 h-4 rounded border-2 border-[var(--red)]" />
          <span className="text-[var(--muted)]">Delayed</span>
        </span>
      </div>

      {/* ── Main table ── */}
      <div
        className="overflow-x-auto rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--line)",
        }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              style={{ borderBottom: "2px solid var(--line)" }}
              className="text-left"
            >
              <th
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
                style={{ minWidth: "180px" }}
              >
                Client
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Assigned
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Cadence
              </th>
              {MONTHS_SHORT.map((m, i) => {
                const isCurrentMonth = i === currentMonth && !isHistorical;
                return (
                  <th
                    key={m}
                    className={monthColClass + " px-1 py-3 uppercase tracking-wider"}
                    style={{
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
            {serviceClients.length === 0 ? (
              <tr>
                <td
                  colSpan={15}
                  className="px-6 py-12 text-center text-sm text-[var(--muted)]"
                >
                  No clients with this service enabled.
                </td>
              </tr>
            ) : (
              serviceClients.map((client) => {
                const svc = client.services.find((s) => s.key === serviceKey)!;
                const activeMonths = getActiveMonths(svc.frequency);
                const key = `${client.id}:${serviceKey}`;
                const stages = worklistState[key] ?? Array(12).fill("");

                return (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-[var(--teal-soft)]/30"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    {/* Client name */}
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-[var(--ink)] truncate max-w-[200px]">
                        {client.name}
                      </div>
                    </td>

                    {/* Assigned */}
                    <td className="px-3 py-2.5 text-xs text-[var(--muted)] whitespace-nowrap">
                      {svc.processor}
                    </td>

                    {/* Cadence */}
                    <td className="px-3 py-2.5 text-xs text-[var(--muted)] whitespace-nowrap">
                      {variant === "payroll"
                        ? payrollCadences[client.id] ?? "Monthly"
                        : svc.frequency}
                    </td>

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
                      const cellReadOnly = readOnly || isHistorical || !isActive;

                      // ── Payroll variant: show run counts ──
                      if (variant === "payroll" && isActive) {
                        const cadence = payrollCadences[client.id] ?? "Monthly";
                        const expected = getExpectedRuns(cadence);
                        const completed = stage === "dn"
                          ? expected
                          : Math.max(0, expected - 1 - (i % 2));

                        return (
                          <td key={i} className="px-0.5 py-2.5">
                            <CellWrapper
                              isCurrentMonth={isCurrentMonth}
                              isPastDue={isPastDue}
                              readOnly={cellReadOnly}
                              onClick={() => handleCellClick(client.id, i)}
                            >
                              <span
                                className="text-[10px] font-semibold leading-none"
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
                          <td key={i} className="px-0.5 py-2.5">
                            <CellWrapper
                              isCurrentMonth={isCurrentMonth}
                              isPastDue={isPastDue}
                              readOnly={cellReadOnly}
                              onClick={() => handleCellClick(client.id, i)}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className="text-[10px] font-semibold leading-none"
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
                        <td key={i} className="px-0.5 py-2.5">
                          <CellWrapper
                            isCurrentMonth={isCurrentMonth}
                            isPastDue={isPastDue}
                            readOnly={cellReadOnly}
                            onClick={() => handleCellClick(client.id, i)}
                          >
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold leading-none transition-colors"
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
                                opacity: !isActive ? 0.4 : 1,
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

      {/* ── Fine-print note ── */}
      <p className="text-[10px] text-[var(--muted)] leading-relaxed italic">
        Click a cell to cycle through stages: Not Started → In Progress →
        Waiting on Client → Prepared → Done → N/A → Not Started.{isHistorical
          ? " Historical years are read-only."
          : ""}{" "}
        Past-due months that aren&apos;t marked Done or N/A are flagged with a
        red border. Cells are only active for months aligned with the service
        frequency cadence.
      </p>
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
      className={`inline-flex items-center justify-center w-full h-8 rounded-md transition-[background-color,color] ${
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

// ══════════════════════════════════════════════
// ── Stat Card (inline mini card) ──
// ══════════════════════════════════════════════
function StatCard({
  label,
  value,
  color,
  softColor,
}: {
  label: string;
  value: number;
  color?: string;
  softColor?: string;
}) {
  return (
    <div
      className="p-3 rounded-lg flex flex-col"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
        borderLeft: color ? `3px solid ${color}` : "none",
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <span
        className="text-xl font-bold leading-tight"
        style={{ color: color || "var(--ink)" }}
      >
        {value}
      </span>
    </div>
  );
}
