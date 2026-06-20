"use client";

import { useState, useMemo } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable, { stageToMonthStatus, type WorklistStage } from "@/components/worklist-table";

export default function StxPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tap_hub_stx_year");
      return saved ? Number(saved) : currentYear;
    }
    return currentYear;
  });
  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2],
    [currentYear],
  );

  const handleYearChange = (y: number) => {
    setYear(y);
    localStorage.setItem("tap_hub_stx_year", String(y));
  };

  const { clients, updateServiceMonth } = useClientsState();

  const handleStageChange = (clientId: string, monthIdx: number, stage: WorklistStage) => {
    const status = stageToMonthStatus(stage);
    updateServiceMonth(clientId, "sales_tax", monthIdx, status);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <WorklistTable
        serviceKey="sales_tax"
        clients={clients}
        year={year}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
