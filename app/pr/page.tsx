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

      <WorklistTable serviceKey="payroll" variant="payroll" clients={clients} year={year} onStageChange={handleStageChange} />
    </div>
  );
}
