"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { Client, ServiceConfig, ServiceKey, MonthStatus } from "@/lib/types";
import { MONTHS_SHORT } from "@/lib/data";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

// Variant-aware stage label — tax_returns uses "Filed" instead of "Done"
function getStageLabel(stage: WorklistStage, variant?: string): string {
  if (variant === "tax_returns" && stage === "dn") return "Filed";
  return STAGE_LABELS[stage];
}

const STAGE_CYCLE: WorklistStage[] = ["", "ip", "wc", "pp", "dn", "na"];

// ── Stage colors (matching demo v7 mcell classes exactly) ──
const PAYROLL_PROCESSOR_OPTIONS = ["ADP", "QBO", "Quickbooks Desktop", "Quickbooks Desktop 24"];

const BIWEEKLY_CODES = ["", "1 - ODD", "2 - EVEN"];
const PAY_PERIOD_FREQ = ["", "Monthly", "Semi-Monthly", "Bi-Weekly", "Quarterly"];
const REPORTING_METHODS = ["", "PR Reports only", "Email Paystub to Client", "Log into Client"];
const PAYROLL_CATEGORIES = ["", "Monthly", "Salary", "SAME", "Right Network", "Tushar"];
const PAYDAY_OPTIONS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "EOM", "15th & EOM", "5th/20th", "16th/EOM",
];
const FILING_TYPES = ["C Corp.", "S Corp.", "Partnership", "SMLLC", "Trust", "Non Profit", "Retirem Plan"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];
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
    case "Weekly":
    case "Bi-Weekly":
    case "Semi-Monthly": {
      // If a start month is set, only mark months from start onwards as active
      if (startMonth !== undefined && startMonth >= 0) {
        const s = new Set<number>();
        for (let m = startMonth; m < 12; m++) s.add(m);
        return s;
      }
      return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
    case "Quarterly": {
      const s = startMonth ?? 0; // default Jan
      return new Set([s % 12, (s + 3) % 12, (s + 6) % 12, (s + 9) % 12]);
    }
    case "Annually":
    case "Yearly":
      return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); // All months — yearly services can have work done in any month
    default:
      return new Set();
  }
}

// ── Payroll: max runs per month by cadence ──
type PayrollCadence = "Weekly" | "Bi-Weekly" | "Monthly";
function getMaxRunsPerMonth(cadence: PayrollCadence): number {
  switch (cadence) {
    case "Weekly":   return 5;
    case "Bi-Weekly": return 2;
    case "Monthly":  return 1;
  }
}

// ── Payroll: calculate next processing date from cadence + payStartDate ──
function getNextProcessingDate(cadence: PayrollCadence, payStartDate?: string): string {
  if (!payStartDate) return "·";
  const now = new Date();
  const [sm, sd] = payStartDate.split("/").map(Number);
  if (isNaN(sm) || isNaN(sd) || sm < 1 || sm > 12 || sd < 1 || sd > 31) return payStartDate;

  if (cadence === "Monthly") {
    // Next month starting from the day-of-month in payStartDate
    let m = now.getMonth() + 1; // 0-indexed → 1-indexed
    let y = now.getFullYear();
    if (now.getDate() >= sd) m++; // already past this month's date
    if (m > 11) { m = 0; y++; }
    return `${m + 1}/${sd}`;
  }

  if (cadence === "Weekly") {
    // Next occurrence of the day-of-week matching payStartDate's day-of-week interpretation
    // We'll treat sd as a day-of-week indicator or just find next week
    const dayOfWeek = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
    // For simplicity, show "Next week" or compute precisely
    const next = new Date(now);
    next.setDate(now.getDate() + (7 - now.getDay())); // next Monday
    return `${next.getMonth() + 1}/${next.getDate()}`;
  }

  // Bi-Weekly: find next date based on start date
  const startDate = new Date(now.getFullYear(), sm - 1, sd);
  let next = new Date(startDate);
  while (next <= now) {
    next.setDate(next.getDate() + 14);
  }
  return `${next.getMonth() + 1}/${next.getDate()}`;
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
  variant?: "default" | "payroll" | "t9" | "tax_returns";
  readOnly?: boolean;
  loading?: boolean;
  onStageChange?: (clientId: string, monthIdx: number, stage: WorklistStage, csId?: string) => void;
  onClientClick?: (clientId: string) => void;
  onPayrollMissingRuns?: (count: number) => void;
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
  onPayrollMissingRuns,
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
  const [cadenceFilter, setCadenceFilter] = useState<string>("All");

  // ── Cadence filter options (dynamic per module) ──
  const cadenceOptions = useMemo(() => {
    if (variant === "payroll") {
      return ["Weekly", "Bi-Weekly", "Monthly"];
    }
    if (serviceKey === "financials" || serviceKey === "sales_tax") {
      return ["Monthly", "Quarterly", "Annually"];
    }
    if (variant === "t9") {
      return ["Yearly"];
    }
    return [];
  }, [serviceKey, variant]);
  // ── Stage dropdown picker ──
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeDropdown]);

  // ── Filter clients by search + cadence ──
  const filteredClients = useMemo(
    () => {
      let list = serviceClients;
      if (search) {
        list = list.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase()),
        );
      }
      if (cadenceFilter !== "All") {
        if (variant === "payroll") {
          list = list.filter((c) => {
            const svc = c.services?.find((s: any) => s.key === "payroll");
            const freq = svc?.frequency || "Monthly";
            const cadence = freq === "Weekly" ? "Weekly"
              : (freq === "Bi-Weekly" || freq === "Semi-Monthly") ? "Bi-Weekly"
              : "Monthly";
            return cadence === cadenceFilter;
          });
        } else {
          // financials, sales_tax — filter by frequency directly
          list = list.filter((c) => {
            const svc = c.services?.find((s: any) => s.key === serviceKey);
            return svc?.frequency === cadenceFilter;
          });
        }
      }
      return list;
    },
    [serviceClients, search, cadenceFilter, variant, serviceKey],
  );

  // Short name from "Last, First" format → "First"
  const toShortName = (name: string) => {
    if (!name.includes(",")) return name;
    return name.split(",")[1].trim();
  };

  // ── Staff list for dropdowns — only active members, full names, no duplicates ──
  const [staffList, setStaffList] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/profiles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const names = data
            .filter((p: any) => p.status === "Active")
            .map((p: any) => (p.name || "").trim())
            .filter(Boolean);
          setStaffList([...new Set(names)]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Handle Assigned change (payroll inline dropdown) ──
  const [assignedOverrides, setAssignedOverrides] = useState<Record<string, string>>({});
  const handleAssignedChange = useCallback(
    (client: any, svc: any, value: string) => {
      if (!svc?.csId) return;
      const key = `${client.id}:${svc.key || serviceKey}`;
      setAssignedOverrides((prev) => ({ ...prev, [key]: value }));
      fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csId: svc.csId, assignedTo: value }),
      }).catch((e) => console.error("Failed to update assigned:", e));
    },
    [serviceKey],
  );

  // ── Handle Processor change (inline dropdown) ──
  const [processorOverrides, setProcessorOverrides] = useState<Record<string, string>>({});
  const handleProcessorChange = useCallback(
    (client: any, svc: any, value: string) => {
      if (!svc?.csId) return;
      const key = `${client.id}:${svc.key || serviceKey}`;
      setProcessorOverrides((prev) => ({ ...prev, [key]: value }));
      fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csId: svc.csId, processor: value }),
      }).catch((e) => console.error("Failed to update processor:", e));
    },
    [serviceKey],
  );

  // ── Handle Frequency / Cadence change (inline dropdown) ──
  const [frequencyOverrides, setFrequencyOverrides] = useState<Record<string, string>>({});
  const handleFrequencyChange = useCallback(
    (client: any, svc: any, value: string) => {
      if (!svc?.csId) return;
      const key = `${client.id}:${svc.key || serviceKey}`;
      setFrequencyOverrides((prev) => ({ ...prev, [key]: value }));
      fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csId: svc.csId, frequency: value }),
      }).catch((e) => console.error("Failed to update frequency:", e));
    },
    [serviceKey],
  );

  // ── Initialize worklist state from client data ──
  const [worklistState, setWorklistState] = useState<
    Record<string, WorklistStage[]>
  >(() => buildWorklistState(clients, serviceKey));

  // Re-sync when clients or service key changes (edits flow through updateServiceMonth)
  useEffect(() => {
    setWorklistState(buildWorklistState(clients, serviceKey));
  }, [clients, serviceKey]);

  // ── Payroll count state (number of runs completed per month) ──
  const [prCounts, setPrCounts] = useState<Record<string, number[]>>(() => {
    const map: Record<string, number[]> = {};
    for (const client of clients) {
      const svc = client.services.find((s: any) => s.key === "payroll");
      if (!svc?.enabled) continue;
      const key = `${client.id}:payroll`;
      if (svc.prCounts && Array.isArray(svc.prCounts)) {
        map[key] = [...svc.prCounts];
      } else {
        map[key] = Array(12).fill(0);
      }
    }
    return map;
  });

  // Re-sync prCounts when clients change
  useEffect(() => {
    setPrCounts((prev) => {
      const next: Record<string, number[]> = {};
      for (const client of clients) {
        const svc = client.services.find((s: any) => s.key === "payroll");
        if (!svc?.enabled) continue;
        const key = `${client.id}:payroll`;
        if (prev[key]) { next[key] = prev[key]; }
        else if (svc.prCounts && Array.isArray(svc.prCounts)) { next[key] = [...svc.prCounts]; }
        else { next[key] = Array(12).fill(0); }
      }
      return next;
    });
  }, [clients]);

  // Load payroll counts from period_counts API on mount
  useEffect(() => {
    if (variant !== "payroll" || serviceClients.length === 0) return;
    const yearStr = String(year);
    const promises = serviceClients.map(async (client) => {
      const svc = client.services?.find((s: any) => s.key === "payroll");
      if (!svc?.csId) return;
      try {
        const res = await fetch(`/api/period-counts?client_service_id=${svc.csId}&year=${yearStr}`);
        const data = await res.json();
        if (!data.counts || !Array.isArray(data.counts)) return;
        const counts = Array(12).fill(0);
        for (const c of data.counts) {
          const parts = c.period?.split("-");
          if (parts && parts.length >= 2) {
            const monthIdx = parseInt(parts[1]) - 1;
            if (monthIdx >= 0 && monthIdx < 12) {
              counts[monthIdx] = Math.max(0, c.processed || 0);
            }
          }
        }
        const key = `${client.id}:payroll`;
        setPrCounts((prev) => ({ ...prev, [key]: counts }));
      } catch {}
    });
    Promise.all(promises).catch(() => {});
  }, [variant, serviceClients, year]);

  // Load t9 counts from period_counts API on mount
  useEffect(() => {
    if (variant !== "t9" || serviceClients.length === 0) return;
    const yearStr = String(year);
    const promises = serviceClients.map(async (client) => {
      const svc = client.services?.find((s: any) => s.key === "1099s");
      if (!svc?.csId) return;
      try {
        const res = await fetch(`/api/period-counts?client_service_id=${svc.csId}&year=${yearStr}`);
        const data = await res.json();
        if (!data.counts || !Array.isArray(data.counts)) return;
        const counts = Array(12).fill(0);
        for (const c of data.counts) {
          const parts = c.period?.split("-");
          if (parts && parts.length >= 2) {
            const monthIdx = parseInt(parts[1]) - 1;
            if (monthIdx >= 0 && monthIdx < 12) {
              counts[monthIdx] = Math.max(0, c.processed || 0);
            }
          }
        }
        const key = `${client.id}:1099s`;
        setT9Counts((prev) => ({ ...prev, [key]: counts }));
      } catch {}
    });
    Promise.all(promises).catch(() => {});
  }, [variant, serviceClients, year]);

  // ── Payroll: get real cadence from client service ──
  function getClientPayrollCadence(client: any): PayrollCadence {
    const svc = client.services?.find((s: any) => s.key === "payroll");
    const freq = svc?.frequency || "Monthly";
    if (freq === "Weekly") return "Weekly";
    if (freq === "Bi-Weekly" || freq === "Semi-Monthly") return "Bi-Weekly";
    return "Monthly";
  }

  // ── Payroll bump handler ──
  const prBump = useCallback((clientId: string, monthIdx: number, ev: React.MouseEvent) => {
    if (isHistorical) return;
    const client = serviceClients.find((c: any) => c.id === clientId);
    if (!client) return;
    const svc = client.services?.find((s: any) => s.key === "payroll");
    const maxRuns = getMaxRunsPerMonth(getClientPayrollCadence(client));
    const key = `${clientId}:payroll`;
    setPrCounts((prev) => {
      const counts = [...(prev[key] ?? Array(12).fill(0))];
      const current = counts[monthIdx] || 0;
      // Regular click: if count > 0, decrement; if 0, increment (toggle)
      // Shift-click: always decrement (same behavior for non-zero cells)
      const next = ev.shiftKey
        ? Math.max(0, current - 1)
        : current > 0
          ? Math.max(0, current - 1)
          : Math.min(maxRuns, current + 1);
      counts[monthIdx] = next;
      // Persist
      if (svc?.csId) {
        const period = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
        fetch("/api/period-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_service_id: svc.csId, period, processed: next }),
        }).catch(() => {});
      }
      return { ...prev, [key]: counts };
    });
  }, [isHistorical, serviceClients, year]);

  // ── Payroll start edit ──
  const [editingPr, setEditingPr] = useState<string | null>(null);
  const [editPrValue, setEditPrValue] = useState("");

  const prStartEdit = useCallback((clientId: string, monthIdx: number, currentVal: number) => {
    if (isHistorical) return;
    setEditingPr(`${clientId}:${monthIdx}`);
    setEditPrValue(String(currentVal || 0));
  }, [isHistorical]);

  const prCommitEdit = useCallback((clientId: string, monthIdx: number) => {
    const client = serviceClients.find((c: any) => c.id === clientId);
    if (!client) return;
    const svc = client.services?.find((s: any) => s.key === "payroll");
    const maxRuns = getMaxRunsPerMonth(getClientPayrollCadence(client));
    let val = parseInt(editPrValue) || 0;
    val = Math.max(0, Math.min(maxRuns, val));
    const key = `${clientId}:payroll`;
    setPrCounts((prev) => {
      const counts = [...(prev[key] ?? Array(12).fill(0))];
      counts[monthIdx] = val;
      // Persist
      if (svc?.csId) {
        const period = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
        fetch("/api/period-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_service_id: svc.csId, period, processed: val }),
        }).catch(() => {});
      }
      return { ...prev, [key]: counts };
    });
    setEditingPr(null);
  }, [editPrValue, serviceClients, year]);

  // ── Cell click handler — opens stage picker dropdown ──
  const handleCellClick = useCallback(
    (clientId: string, monthIdx: number) => {
      if (readOnly || isHistorical) return;
      const key = `${clientId}:${monthIdx}`;
      setActiveDropdown((prev) => (prev === key ? null : key));
    },
    [readOnly, isHistorical],
  );

  // ── Select a stage from dropdown ──
  const handleStageSelect = useCallback(
    (clientId: string, monthIdx: number, stage: WorklistStage, csId?: string) => {
      if (readOnly || isHistorical) return;
      const key = `${clientId}:${serviceKey}`;
      const stages = [...(worklistState[key] ?? [])];
      if (!stages.length) return;
      stages[monthIdx] = stage;
      setWorklistState((prev) => ({ ...prev, [key]: stages }));
      if (onStageChange) onStageChange(clientId, monthIdx, stage, csId);
      setActiveDropdown(null);
    },
    [readOnly, isHistorical, serviceKey, worklistState, onStageChange],
  );


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

  // ── T9 count edit-in-place state ──
  const [editingT9, setEditingT9] = useState<string | null>(null);
  const [editT9Value, setEditT9Value] = useState("");

  const t9StartEdit = useCallback((clientId: string, monthIdx: number, currentVal: number) => {
    if (isHistorical) return;
    setEditingT9(`${clientId}:${monthIdx}`);
    setEditT9Value(String(currentVal || 0));
  }, [isHistorical]);

  const t9CommitEdit = useCallback((clientId: string, monthIdx: number) => {
    const val = parseInt(editT9Value) || 0;
    const key = `${clientId}:1099s`;
    setT9Counts((prev) => {
      const counts = [...(prev[key] ?? Array(12).fill(0))];
      counts[monthIdx] = Math.max(0, val);
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
    setEditingT9(null);
  }, [editT9Value, clients, year]);

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

    if (variant === "payroll") {
      const isCur = !isHistorical;
      let totalRuns = 0;
      let totalMax = 0;
      let monthRuns = 0;
      for (const client of serviceClients) {
        const cadence = getClientPayrollCadence(client);
        const maxRuns = getMaxRunsPerMonth(cadence);
        totalMax += maxRuns * 12;
        const key = `${client.id}:payroll`;
        const counts = prCounts[key] ?? Array(12).fill(0);
        for (let m = 0; m < 12; m++) {
          totalRuns += (counts[m] || 0);
        }
        if (isCur) {
          monthRuns += (counts[currentMonth] || 0);
        }
      }
      const pct = totalMax > 0 ? Math.round((totalRuns / totalMax) * 100) : 0;
      return {
        totalRuns, totalMax, pct,
        monthRuns, currentMonthName: MONTHS_SHORT[currentMonth], isCur,
      };
    }

    const currentMonthName = MONTHS_SHORT[currentMonth];
    let dueThisMonth = 0;
    let inProgress = 0;
    let waiting = 0;
    let prepared = 0;
    let done = 0;
    let behind = 0;
    let notStarted = 0;
    let yDue = 0, yDone = 0;

    for (const client of serviceClients) {
      const svc = client.services.find((s) => s.key === serviceKey);
      if (!svc) continue;
      const activeMonths = getActiveMonths(svc.frequency, svc.financialsMonth);

      const key = `${client.id}:${serviceKey}`;
      const stages = worklistState[key] ?? [];
      for (let m = 0; m < 12; m++) {
        if (!activeMonths.has(m)) continue;
        yDue++;
        if (stages[m] === "dn") yDone++;

        if (m === currentMonth && year === currentYear) {
          dueThisMonth++;
          if (!stages[m] || stages[m] === "") notStarted++;
        }
        // Past due check: month is before current, not done, not na, not empty
        if (m < currentMonth && stages[m] !== "dn" && stages[m] !== "na" && stages[m] !== "" && !isHistorical) {
          behind++;
        }
        switch (stages[m]) {
          case "ip": inProgress++; break;
          case "wc": waiting++; break;
          case "pp": prepared++; break;
          case "dn": done++; break;
        }
      }
    }

    return { dueThisMonth, inProgress, waiting, prepared, done, behind, notStarted, currentMonthName, yDue, yDone };
  }, [serviceClients, serviceKey, currentMonth, year, currentYear, worklistState, isHistorical, prCounts, t9Counts]);

  // ── Pipe payroll missing runs up to parent ──
  useEffect(() => {
    if (variant === "payroll" && onPayrollMissingRuns) {
      onPayrollMissingRuns(Math.max(0, stats.totalMax - stats.totalRuns));
    }
  }, [variant, onPayrollMissingRuns, stats.totalMax, stats.totalRuns]);

  // ── Stage legend ──
  const legendItems: { stage: WorklistStage; dot: string }[] = [
    { stage: "", dot: "·" },
    { stage: "ip", dot: "●" },
    { stage: "wc", dot: "●" },
    { stage: "pp", dot: "●" },
    { stage: "dn", dot: "●" },
    { stage: "na", dot: "●" },
  ];

  // ── Count of columns before month columns (for colspan) ──
  const baseCols = 2; // Client + Assigned
  const payrollCols = variant === "payroll" ? 2 : 0; // PayDay, QBO
  const taxReturnCols = variant === "tax_returns" ? 2 : 0; // Filing State, Filing Type
  const extraCols = serviceKey !== "renditions" && serviceKey !== "tax_returns" ? 1 : 0; // Cadence
  const t9PostCols = variant === "t9" ? 1 : 0; // Left
  const t9PreCols = variant === "t9" ? 1 : 0; // Expected
  const colCount = baseCols + payrollCols + taxReturnCols + extraCols + t9PreCols + 12 + t9PostCols;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-[var(--muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Stats row (demo: stat cards) ── */}
      {variant === "t9" ? (
        <div className="stats" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <StatCard label="Expected (year)" value={stats.expTot} color="var(--ink)" />
          <StatCard label="Processed" value={stats.doneTot} color="var(--green)" />
          <StatCard label="Remaining" value={Math.max(0, stats.expTot - stats.doneTot)} color="var(--amber)" />
          <StatCard label={stats.isCur ? `In ${stats.currentMonthName}` : `Period total`} value={stats.isCur ? stats.curMonthCount : stats.doneTot} color="var(--blue)" />
        </div>
      ) : variant === "payroll" && !onPayrollMissingRuns ? (
        <div className="stats" style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <StatCard label="Total missing runs" value={Math.max(0, stats.totalMax - stats.totalRuns)} color="var(--red)" />
        </div>
      ) : variant === "payroll" ? null : (
      <div className="stats" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        {!isHistorical ? (
          <>
            <StatCard label={`Due in ${stats.currentMonthName}`} value={stats.dueThisMonth} color="var(--ink)" />
            <StatCard label="In progress" value={stats.inProgress} color="var(--blue)" />
            <StatCard label="Waiting on client" value={stats.waiting} color="var(--amber)" />
            <StatCard label="Prepared" value={stats.prepared} color="var(--teal)" />
            <StatCard label={variant === "tax_returns" ? "Filed" : "Done"} value={stats.done} color="var(--green)" />
            <StatCard label="Not started" value={stats.notStarted || 0} color="var(--red)" />
          </>
        ) : (
          <>
            <StatCard label="Total periods" value={stats.yDue} color="var(--ink)" />
            <StatCard label="Completed" value={stats.yDone} color="var(--green)" />
            <StatCard label="Not completed" value={Math.max(0, stats.yDue - stats.yDone)} color="var(--amber)" />
          </>
        )}
        {/* ── Comment month markers ── */}
        <CommentMarkers clients={serviceClients} serviceKey={serviceKey} currentMonth={currentMonth} />
      </div>
      )}

      {/* ── Search + Cadence filter ── */}
      <div className="flex gap-2 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[13px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]"
        />
        {cadenceOptions.length > 0 && (
          <select
            value={cadenceFilter}
            onChange={(e) => setCadenceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[13px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] cursor-pointer"
          >
            <option value="All">All cadences</option>
            {cadenceOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
        {search && filteredClients.length < serviceClients.length && (
          <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">
            {filteredClients.length} of {serviceClients.length}
          </span>
        )}
      </div>

      {/* ── Legend ── */}
      {variant !== "tax_returns" && (
      <div className="flex flex-wrap items-center gap-3.5 text-xs" style={{ margin: "14px 0 2px" }}>
        {STAGE_CYCLE.filter(s => s !== "").map(s => (
          <span key={s} className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: STAGE_STYLES[s].fg }}></i>
            {STAGE_STYLES[s].label}
          </span>
        ))}
        {!isHistorical && <span className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "var(--red)" }}></i>Delayed (auto)</span>}
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "repeating-linear-gradient(45deg, var(--red) 0px, var(--red) 2px, transparent 2px, transparent 4px)" }}></i>N/A</span>
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--muted)" }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "#c2c8d4" }}></i>Not due</span>
        <span style={{ marginLeft: "auto", fontStyle: "italic", opacity: 0.8, fontSize: 11, color: "var(--muted)" }}>
          {!isHistorical ? "click a cell to advance · red ring = past due, flagged automatically" : `${year} — read-only history`}
        </span>
      </div>
      )}

      {/* ── Count line ── */}
      <div className="text-xs" style={{ color: "var(--muted)", margin: "6px 2px 6px" }}>
        {serviceKey === "sales_tax"
          ? "Grouped by client — each registration tracked on its own row. Open one for its bank details and notes."
          : variant === "payroll"
          ? `${serviceClients.length} client${serviceClients.length !== 1 ? "s" : ""} · highlighted column = this month (${MONTHS_SHORT[currentMonth]})`
          : variant === "tax_returns"
          ? `${serviceClients.length} client${serviceClients.length !== 1 ? "s" : ""} · highlighted column = this month (${MONTHS_SHORT[currentMonth]}) · filing month shows visual highlight`
          : !isHistorical
          ? `${serviceClients.length} client${serviceClients.length !== 1 ? "s" : ""} · highlighted column = this month (${MONTHS_SHORT[currentMonth]})`
          : `${serviceClients.length} client${serviceClients.length !== 1 ? "s" : ""} · ${year} history`}
      </div>

      {/* ── Main table with scroll arrows ── */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => {
            const el = document.getElementById(`table-scroll-${serviceKey}`);
            if (el) el.scrollBy({ left: -200, behavior: "smooth" });
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-md border border-[var(--line)] cursor-pointer hover:scale-110 transition-transform"
          style={{ background: "var(--card)", color: "var(--ink)", fontSize: 14, lineHeight: 1 }}
          aria-label="Scroll left"
        >{'\u2039'}</button>
      <div id={`table-scroll-${serviceKey}`} style={{ overflowX: "auto", borderRadius: 14, border: "1px solid var(--line)", scrollBehavior: "smooth" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--card)", borderBottom: "2px solid var(--line)" }}>
             <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1.5 py-2" style={{ width: 160, minWidth: 120, maxWidth: 220 }}>Client / Line Item</th>
            {variant === "payroll" && (
            <>
              <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 80, maxWidth: 100 }}>Pay Day</th>
              <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 65, maxWidth: 80 }}>QBO</th>
            </>
            )}
            {variant === "tax_returns" && (
            <>
              <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 70, maxWidth: 80 }}>Filing St</th>
              <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 80, maxWidth: 100 }}>Filing Type</th>
            </>
            )}
            <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 120, maxWidth: 150 }}>Assigned</th>
            {serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
            <th className="text-left text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 90, maxWidth: 100 }}>Cadence</th>
            )}
            {variant === "t9" && (
            <th className="text-center text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1 py-2" style={{ width: 60, minWidth: 60 }}>Expected</th>
            )}
            {MONTHS_SHORT.map((m, mi) => {
              // For tax_returns, check if any client has this month as filingMonth
              const isFileMonth = variant === "tax_returns" && serviceClients.some((c) => {
                const s = c.services?.find((s: any) => s.key === serviceKey);
                const fm = s?.filingMonth || "";
                return MONTH_NAMES.indexOf(fm) === mi;
              });
              return (
                <th key={m}
                  className="text-center text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-0.5 py-2"
                  style={{
                    width: variant === "t9" ? 44 : 30,
                    backgroundColor: isFileMonth ? "var(--teal-soft)" : undefined,
                    borderBottom: isFileMonth ? "2px solid var(--teal)" : undefined,
                  }}
                >{m}</th>
              );
            })}
            {variant === "t9" && (
            <>
              <th className="text-center text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-0.5 py-2" style={{ width: 60, minWidth: 60 }}>Left</th>
            </>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredClients.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="text-center py-8 text-sm text-[var(--muted)]">
                No clients found.
              </td>
            </tr>
          ) : (
            (serviceKey === "sales_tax"
              ? // ── Sales Tax: expand line items, group by client, add group header rows ──
                (() => {
                  // First: expand by line items
                  const expanded: any[] = [];
                  for (const client of filteredClients) {
                    const svc = client.services?.find((s: any) => s.key === "sales_tax");
                    const items = svc?.salesTaxLineItems;
                    if (items?.length > 0) {
                      items.forEach((item: any, idx: number) => {
                        expanded.push({
                          ...client,
                          _stxItem: item,
                          _stxIdx: idx,
                          _stxName: item.serviceName,
                        });
                      });
                    } else {
                      expanded.push({ ...client, _stxItem: null, _stxIdx: -1, _stxName: client.name });
                    }
                  }
                  // Count registrations per original client
                  const regCounts = new Map<string, number>();
                  for (const client of filteredClients) {
                    const origId = client._originalClientId || client.id;
                    regCounts.set(origId, (regCounts.get(origId) || 0) + 1);
                  }
                  // Build final array with group headers inserted
                  const rows: any[] = [];
                  let prevOrigId: string | null = null;
                  for (const row of expanded) {
                    const origId = row._originalClientId || row.id;
                    if (origId !== prevOrigId) {
                      const count = regCounts.get(origId) || 0;
                      rows.push({ _isGroupHeader: true, _groupOrigId: origId, _groupCount: count });
                      prevOrigId = origId;
                    }
                    rows.push(row);
                  }
                  return rows;
                })()
              : filteredClients
            ).map((client: any, _mapIdx: number) => {
              // ── Group header row (sales tax only) ──
              if (client._isGroupHeader) {
                return (
                  <tr className="stxband">
                    <td colSpan={colCount}>
                      <b>{client._groupOrigId ? (filteredClients.find((c: any) => (c._originalClientId || c.id) === client._groupOrigId)?.name || '') : ''}</b> <span style={{ color: "rgba(255,255,255,.7)" }}>· {client._groupCount} registration{client._groupCount !== 1 ? "s" : ""}</span>
                    </td>
                  </tr>
                );
              }
              const svc = client.services.find((s: any) => s.key === serviceKey)!;
              const isStxItem = serviceKey === "sales_tax" && client._stxItem;
              const stxItem = client._stxItem;
              const stxIdx = client._stxIdx;
              const displayName = isStxItem ? client._stxName : client.name;
              const activeMonths = getActiveMonths(svc.frequency, svc.financialsMonth);
              const key = `${client.id}:${serviceKey}`;
              const stages = worklistState[key] ?? Array(12).fill("");

              const payrollSvc = client.services.find((s: any) => s.key === "payroll");
              const processor = payrollSvc?.processor || "-";
              const prCadence = getClientPayrollCadence(client);
              const maxRuns = getMaxRunsPerMonth(prCadence);
              const prKey = `${client.id}:payroll`;
              const prCountsArr = prCounts[prKey] ?? Array(12).fill(0);

              // ── T9 variant: count-based table ──
              if (variant === "t9") {
                const exp = svc.expectedAnnual || 0;
                const t9key = `${client.id}:1099s`;
                const counts = t9Counts[t9key] ?? Array(12).fill(0);
                const done = counts.reduce((a: number, b: number) => a + (b || 0), 0);
                const left = Math.max(0, exp - done);
                return (
                  <tr key={client.id} className="transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="px-1.5 py-1" style={{ width: 160, minWidth: 120, maxWidth: 220 }}>
                      <button onClick={() => onClientClick?.(client.id)}
                        className="text-xs font-medium text-[var(--ink)] truncate text-left w-full bg-transparent border-none cursor-pointer hover:text-[var(--teal)] transition-colors p-0">{client.name}</button>
                    </td>
                    <td className="px-1 py-1 text-[11px] text-[var(--muted)] whitespace-nowrap truncate" style={{ width: 120, maxWidth: 150 }}>
                      <select
                        value={assignedOverrides[`${client.id}:1099s`] ?? (svc.assignedTo || svc.processor || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignedOverrides((prev) => ({ ...prev, [`${client.id}:1099s`]: val }));
                          fetch("/api/clients", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ csId: svc.csId, assignedTo: val }),
                          }).catch(() => {});
                        }}
                        className="text-[11px] bg-transparent border border-[var(--line)] rounded px-1 py-0.5 text-[var(--ink)] outline-none focus:border-[var(--teal)] cursor-pointer min-w-[100px] max-w-[140px]"
                      >
                        <option value="">Unassigned</option>
                        {staffList.map((s) => (
                          <option key={s} value={s}>{toShortName(s)}</option>
                        ))}
                      </select>
                    </td>
                    {serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
                    <td className="px-1.5 py-1 text-[11px] text-[var(--muted)] whitespace-nowrap truncate">{svc.frequency}</td>
                    )}
                    <td className="px-1.5 py-1 text-center text-[11px] font-semibold text-[var(--ink)] tabular-nums" style={{ width: 60, minWidth: 60 }}>{exp || "—"}</td>
                    {MONTHS_SHORT.map((mo, i) => {
                      const n = +counts[i] || 0;
                      const isCM = i === currentMonth && !isHistorical;
                      const cellEditKey = `${client.id}:${i}`;
                      const isEditing = editingT9 === cellEditKey;
                      return (
                        <td key={mo} className={`mtd${isCM ? " mtd-now" : ""}`} style={{ width: 44, minWidth: 44, maxWidth: 44 }}>
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editT9Value}
                              onChange={(e) => setEditT9Value(e.target.value)}
                              onBlur={() => t9CommitEdit(client.id, i)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") t9CommitEdit(client.id, i);
                                if (e.key === "Escape") setEditingT9(null);
                              }}
                              autoFocus
                              className="inline-flex items-center justify-center w-full h-6 rounded text-[11px] font-semibold tabular-nums text-center"
                              style={{
                                backgroundColor: "#fff",
                                border: "2px solid var(--teal)",
                                color: "var(--ink)",
                                outline: "none",
                              }}
                            />
                          ) : (
                            <div
                              onClick={!isHistorical ? () => t9StartEdit(client.id, i, n) : undefined}
                              className={`inline-flex items-center justify-center w-full h-6 rounded text-[11px] font-semibold tabular-nums transition-colors ${!isHistorical ? "cursor-pointer" : "cursor-default"} hover:scale-110 hover:shadow-sm active:scale-95`}
                              style={{
                                backgroundColor: n > 0 ? "var(--green-soft)" : "transparent",
                                color: n > 0 ? "var(--green)" : "var(--muted)",
                              }}
                              title={`${mo}: ${n} processed — click to edit`}
                            >{n || "·"}</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-1 text-center text-[11px] font-semibold tabular-nums" style={{ width: 60, minWidth: 60 }}>
                      <span className={left > 0 ? "text-[var(--amber)]" : "text-[var(--green)]"}>{done}/{exp}</span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={client.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  {/* Client / Line Item name (clickable) */}
                  <td className="px-1.5 py-1" style={{ width: 160, minWidth: 120, maxWidth: 220 }}>
                      <button onClick={() => onClientClick?.(client.id)}
                        className="text-xs font-medium text-[var(--ink)] truncate text-left w-full bg-transparent border-none cursor-pointer hover:text-[var(--teal)] transition-colors p-0"
                        title={`Open ${displayName} details`}
                      >{displayName}</button>
                    </td>

                  {/* Payroll-specific columns: Pay Day, QBO (read-only) */}
                  {variant === "payroll" && (
                  <>
                    {/* Pay Day */}
                    <td className="px-1 py-1 text-[11px] text-[var(--ink)] whitespace-nowrap truncate" style={{ width: 80, maxWidth: 100 }}>
                      {svc.paydate || "—"}
                    </td>
                    {/* QBO (processor) */}
                    <td className="px-1 py-1 text-[11px] text-[var(--ink)] whitespace-nowrap truncate" style={{ width: 65, maxWidth: 80 }}>
                      {processor === "QBO" ? "✓" : processor === "ADP" ? "ADP" : processor === "Quickbooks Desktop" ? "QB Desktop" : processor === "Quickbooks Desktop 24" ? "QB24" : processor !== "-" ? processor : "—"}
                    </td>
                  </>
                  )}

                  {/* Tax Return columns: Filing State, Filing Type */}
                  {variant === "tax_returns" && (
                  <>
                    {/* Filing State */}
                    <td className="px-1 py-1 text-[11px] text-[var(--muted)] whitespace-nowrap truncate" style={{ width: 70, maxWidth: 80 }}>
                      <select
                        value={svc.filingState || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          fetch("/api/clients", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ csId: svc.csId, filingState: val }),
                          }).catch(() => {});
                        }}
                        className="text-[11px] bg-transparent border border-[var(--line)] rounded px-1 py-0.5 text-[var(--ink)] outline-none focus:border-[var(--teal)] cursor-pointer min-w-[55px] max-w-[75px]"
                      >
                        <option value="">—</option>
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
                    {/* Filing Type */}
                    <td className="px-1 py-1 text-[11px] text-[var(--muted)] whitespace-nowrap truncate" style={{ width: 80, maxWidth: 100 }}>
                      <select
                        value={svc.filingType || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          fetch("/api/clients", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ csId: svc.csId, filingType: val }),
                          }).catch(() => {});
                        }}
                        className="text-[11px] bg-transparent border border-[var(--line)] rounded px-1 py-0.5 text-[var(--ink)] outline-none focus:border-[var(--teal)] cursor-pointer min-w-[70px] max-w-[95px]"
                      >
                        <option value="">—</option>
                        {FILING_TYPES.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                  </>
                  )}

                  {/* Assigned — read-only text for payroll, inline editable dropdown for others */}
                  <td className="px-1 py-1 text-[11px] text-[var(--muted)] whitespace-nowrap truncate" style={{ width: 120, maxWidth: 150 }}>
                    {variant === "payroll" ? (
                      <span className="text-[var(--ink)]">{svc.assignedTo || svc.processor || "—"}</span>
                    ) : (
                    <select
                      value={assignedOverrides[`${client.id}:${serviceKey}:${stxIdx}`] ?? (isStxItem ? (stxItem.assignedTo || svc.assignedTo || svc.processor || "") : (svc.assignedTo || svc.processor || ""))}
                      onChange={(e) => {
                        const val = e.target.value;
                        const key = `${client.id}:${serviceKey}:${stxIdx}`;
                        setAssignedOverrides((prev) => ({ ...prev, [key]: val }));
                        if (isStxItem && stxIdx >= 0) {
                          // Update line item's assignedTo in the JSONB
                          const updated = [...(svc.salesTaxLineItems || [])];
                          if (updated[stxIdx]) {
                            updated[stxIdx] = { ...updated[stxIdx], assignedTo: val };
                            fetch("/api/clients", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ csId: svc.csId, salesTaxLineItems: updated }),
                            }).catch(() => {});
                          }
                        } else {
                          fetch("/api/clients", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ csId: svc.csId, assignedTo: val }),
                          }).catch((e) => console.error("Failed to update assigned:", e));
                        }
                      }}
                      className="text-[11px] bg-transparent border border-[var(--line)] rounded px-1 py-0.5 text-[var(--ink)] outline-none focus:border-[var(--teal)] cursor-pointer min-w-[100px] max-w-[140px]"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s} value={s}>{toShortName(s)}</option>
                      ))}
                    </select>
                    )}
                  </td>

                  {/* Cadence — read-only text for payroll, inline editable dropdown for others */}
                  {serviceKey !== "renditions" && serviceKey !== "tax_returns" && (
                  <td className="px-1 py-1 text-[11px] text-[var(--muted)] whitespace-nowrap truncate" style={{ width: 90, maxWidth: 100 }}>
                    {variant === "payroll" ? (
                      <span className="text-[var(--ink)]">{prCadence}</span>
                    ) : (
                    <select
                      value={frequencyOverrides[`${client.id}:${serviceKey}:${stxIdx}`] ?? (isStxItem ? (stxItem.frequency || svc.frequency || "Monthly") : (svc.frequency || "Monthly"))}
                      onChange={(e) => {
                        const val = e.target.value;
                        const key = `${client.id}:${serviceKey}:${stxIdx}`;
                        setFrequencyOverrides((prev) => ({ ...prev, [key]: val }));
                        if (isStxItem && stxIdx >= 0) {
                          const updated = [...(svc.salesTaxLineItems || [])];
                          if (updated[stxIdx]) {
                            updated[stxIdx] = { ...updated[stxIdx], frequency: val };
                            fetch("/api/clients", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ csId: svc.csId, salesTaxLineItems: updated }),
                            }).catch(() => {});
                          }
                        } else {
                          handleFrequencyChange(client, svc, val);
                        }
                      }}
                      className="text-[11px] bg-transparent border border-[var(--line)] rounded px-1 py-0.5 text-[var(--ink)] outline-none focus:border-[var(--teal)] cursor-pointer min-w-[80px] max-w-[95px]"
                    >
                      {(cadenceOptions.length > 0 ? cadenceOptions : ["Monthly", "Quarterly", "Annually"]).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    )}
                  </td>
                  )}

                  {/* Month cells — skip for payroll (read-only tab) */}
                  {MONTHS_SHORT.map((_m, i) => {
                    const isActive = activeMonths.has(i);
                    const isCurrentMonth = i === currentMonth && !isHistorical;
                    const cellReadOnly = readOnly || isHistorical;

                    // ── Default variant: mcell squares (demo v7 style) ──
                    const stage = (stages[i] || "") as WorklistStage;
                    const style = STAGE_STYLES[stage];

                    // ── Tax returns: filingMonth highlight ──
                    const clientFilingMonth = variant === "tax_returns" ? (svc.filingMonth || "") : "";
                    const filingMonthIdx = clientFilingMonth ? MONTH_NAMES.indexOf(clientFilingMonth) : -1;
                    const isFilingMonth = filingMonthIdx === i;
                    const isPastDue =
                      isActive &&
                      i < currentMonth &&
                      stage !== "dn" &&
                      stage !== "na" &&
                      stage !== "" &&
                      !isHistorical;

                    const t = stage === "" ? (isPastDue && !isHistorical ? "!" : "·")
                      : stage === "ip" ? "•"
                      : stage === "wc" ? "⏳"
                      : stage === "pp" ? "✓"
                      : stage === "dn" ? "✓"
                      : stage === "na" ? "–" : "";
                    const delayed = isPastDue && !isHistorical;
                    const lockHist = isHistorical && isActive;
                    // ── Comment marker: check if any comment exists for this month ──
                    const hasCmt = (svc.comments || []).some((c: any) => c.month === i);
                    return (
                      <td key={i} className={`mtd${isCurrentMonth ? " mtd-now" : ""}`} style={{ position: "relative" }}>
                        <div
                          onClick={cellReadOnly ? undefined : () => handleCellClick(client.id, i)}
                          className="mcell"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            border: `1px solid ${!isActive ? "transparent" : delayed ? "var(--red)" : isFilingMonth ? "var(--teal)" : style.border}`,
                            background: !isActive ? "transparent" : stage === "na" ? `repeating-linear-gradient(45deg, ${style.bg} 0px, ${style.bg} 3px, #c0c4cc40 3px, #c0c4cc40 5px)` : (isFilingMonth ? "var(--teal-soft)" : style.bg),
                            color: !isActive ? (lockHist ? "var(--muted)" : "transparent") : (isFilingMonth ? "var(--teal-ink)" : style.fg),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto",
                            fontWeight: 600, fontSize: 11, userSelect: "none",
                            cursor: (!isActive || cellReadOnly) ? "default" : "pointer",
                            boxShadow: delayed ? "0 0 0 2px var(--red)" : isFilingMonth ? "0 0 0 2px var(--teal)" : "none",
                            opacity: !isActive && !lockHist ? 0 : 1,
                          } as React.CSSProperties}
                          title={`${MONTHS_SHORT[i]} — ${delayed ? "DELAYED · " : ""}${getStageLabel(stage, variant)}${isHistorical ? ` (${year})` : ""}${isFilingMonth ? " · Filing month" : ""}`}
                        >{isActive || lockHist ? t : ""}</div>
                        {/* ── Comment marker blue dot ── */}
                        {hasCmt && (
                          <div className="cdot" style={{ position: "absolute", top: -2, right: -2, zIndex: 2 }} />
                        )}
                        {activeDropdown === `${client.id}:${i}` && !cellReadOnly && (
                          <div
                            ref={dropdownRef}
                            className="stage-picker"
                            style={{
                              position: "absolute", zIndex: 50, top: "100%", left: "50%",
                              transform: "translateX(-50%)", marginTop: 4,
                              background: "#fff", border: "1px solid #d8d2c4",
                              borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.12)",
                              padding: "4px 0", minWidth: 160,
                            }}
                          >
                            {STAGE_CYCLE.map((s) => {
                              const ss = STAGE_STYLES[s];
                              const isCurrent = stage === s;
                              return (
                                <div
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); handleStageSelect(client.id, i, s); }}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    padding: "7px 14px", cursor: "pointer", fontSize: 13,
                                    fontWeight: isCurrent ? 700 : 400,
                                    color: isCurrent ? "var(--ink)" : "var(--muted)",
                                    background: isCurrent ? "#f0f4f8" : "transparent",
                                    borderBottom: s !== "na" ? "1px solid #f0ede8" : "none",
                                  }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f7fa"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isCurrent ? "#f0f4f8" : "transparent"; }}
                                >
                                  <i style={{
                                    width: 12, height: 12, borderRadius: 4,
                                    display: "inline-block", flexShrink: 0,
                                    background: s === "na" ? "repeating-linear-gradient(45deg, var(--red) 0px, var(--red) 2px, transparent 2px, transparent 4px)"
                                      : s === "" ? "#c2c8d4" : ss.fg,
                                  }} />
                                  <span>{s === "" ? "Not Started" : getStageLabel(s, variant)}</span>
                                  {isCurrent && <span style={{ marginLeft: "auto", color: "var(--teal)", fontSize: 14 }}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
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
        <button
          onClick={() => {
            const el = document.getElementById(`table-scroll-${serviceKey}`);
            if (el) el.scrollBy({ left: 200, behavior: "smooth" });
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-md border border-[var(--line)] cursor-pointer hover:scale-110 transition-transform"
          style={{ background: "var(--card)", color: "var(--ink)", fontSize: 14, lineHeight: 1 }}
          aria-label="Scroll right"
        >{'\u203A'}</button>
      </div>

      {/* ── Fine-print note ── */}
      {variant === "t9" ? (
        <p className="text-[11px] text-[var(--muted)] leading-relaxed" style={{ margin: "14px 2px 0", fontStyle: "italic" }}>
          Set each client&rsquo;s expected total on their card; log how many you
          process each month here. &ldquo;Left&rdquo; stays amber until the
          expected count is cleared. Click a month to add one, shift-click to
          subtract.
        </p>
      ) : variant === "payroll" ? (
        <p className="text-[11px] text-[var(--muted)] leading-relaxed" style={{ margin: "14px 2px 0", fontStyle: "italic" }}>
          Click any month cell to toggle its run count -- click 0 to add one, click a nonzero cell to reduce it.
          Shift-click always removes one. Cadence (Weekly=&thinsp;5, Bi-Weekly=&thinsp;2, Monthly=&thinsp;1) sets the maximum
          runs per month for each client. Double-click to type a specific number.
        </p>
      ) : variant === "tax_returns" ? (
        <p className="text-[11px] text-[var(--muted)] leading-relaxed" style={{ margin: "14px 2px 0", fontStyle: "italic" }}>
          Every service uses one workflow: In progress → Waiting on Client → Prepared → Filed.
          &ldquo;Waiting on client&rdquo; signals you&rsquo;re blocked; anything past due flags red
          automatically. Filing month is highlighted with a teal ring and background.
        </p>
      ) : (
      <p className="text-[11px] text-[var(--muted)] leading-relaxed" style={{ margin: "14px 2px 0", fontStyle: "italic" }}>
        {!isHistorical
          ? serviceKey === "financials"
            ? "Every service uses one workflow: In progress → Waiting on client → Prepared → Done. Anything past due flags red on its own. Fees and billing are owner-only and stay out of the team&rsquo;s view."
            : "Every service uses one workflow: In progress → Waiting on client → Prepared → Done. &ldquo;Waiting on client&rdquo; signals you&rsquo;re blocked; anything past due flags red automatically."
          : `Read-only history for ${year}. Switch the Year selector back to ${currentYear} to make changes.`}
      </p>
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

// ══════════════════════════════════════════════
// ── Comment Month Markers ──
// ══════════════════════════════════════════════
function CommentMarkers({
  clients,
  serviceKey,
  currentMonth,
}: {
  clients: any[];
  serviceKey: string;
  currentMonth: number;
}) {
  // Collect all months that have at least one comment in the current year
  const monthsWithComments = useMemo(() => {
    const set = new Set<number>();
    for (const client of clients) {
      const svc = client.services?.find((s: any) => s.key === serviceKey);
      if (svc?.comments && Array.isArray(svc.comments)) {
        for (const c of svc.comments) {
          if (c.month !== undefined && c.month >= 0 && c.month < 12) {
            set.add(c.month);
          }
        }
      }
    }
    return set;
  }, [clients, serviceKey]);

  if (monthsWithComments.size === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        padding: "0 0 2px 0",
        minWidth: 180,
      }}
      title="Months with comments"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: 13,
            lineHeight: 1,
            opacity: monthsWithComments.has(i) ? 1 : 0.12,
            filter: monthsWithComments.has(i) ? "none" : "grayscale(1)",
            transition: "opacity 0.15s",
          }}
        >
          <span className="cdot" style={{ position: "relative", display: "inline-block", width: 7, height: 7, top: 0, right: 0 }} />
        </span>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Stat Card (demo v7 exact, shared) ──
// ══════════════════════════════════════════════
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      className="statcard"
      style={{
        flex: 1, minWidth: 120,
        backgroundColor: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 13,
        padding: "13px 16px",
        boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
      }}
    >
      <div style={{
        fontFamily: '"Fraunces",Georgia,serif',
        fontWeight: 600, fontSize: 26, lineHeight: 1,
        color: color || "var(--ink)",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
