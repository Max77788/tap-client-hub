"use client";

import { useState, useMemo } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable, { type WorklistStage } from "@/components/worklist-table";
import type { MonthStatus } from "@/lib/types";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function stageToMonthStatus(stage: WorklistStage): MonthStatus {
  switch (stage) {
    case "dn": return "done";
    case "pp": return "billed";
    case "": return "lock";
    case "na": return "na";
    case "ip": return "billed"; // in-progress maps to billed (being worked on)
    case "wc": return "billed"; // waiting on client maps to billed
    default: return "lock";
  }
}

export default function PrPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tap_hub_pr_year");
      return saved ? Number(saved) : currentYear;
    }
    return currentYear;
  });
  const { clients, updateServiceMonth } = useClientsState();
  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  const handleYearChange = (y: number) => {
    setYear(y);
    localStorage.setItem("tap_hub_pr_year", String(y));
  };

  // Summary stats from clients with payroll service enabled
  const payrollClients = useMemo(
    () => clients.filter((c) => c.services.some((s) => s.key === "payroll" && s.enabled)),
    [clients],
  );

  const handleStageChange = (clientId: string, monthIdx: number, newStage: WorklistStage) => {
    updateServiceMonth(clientId, "payroll", monthIdx, stageToMonthStatus(newStage));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <select value={year} onChange={(e) => handleYearChange(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary stat card */}
      <div className="grid grid-cols-1 gap-3 max-w-[200px]">
        <StatCard label="Payroll Clients" value={payrollClients.length} color="var(--teal)" />
      </div>

      <WorklistTable serviceKey="payroll" variant="payroll" clients={clients} year={year} onStageChange={handleStageChange} />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: "var(--green-soft)" }}/> Completed</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: "var(--amber-soft)" }}/> Partial</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: "var(--line)" }}/> Not started</span>
        <span className="italic">Cells show completed / expected runs per month</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)", borderLeft: `3px solid ${color}` }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="text-xl font-bold leading-tight" style={{ color }}>{value}</span>
    </div>
  );
}
