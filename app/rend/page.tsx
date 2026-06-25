"use client";

import { useState, useMemo } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable, { type WorklistStage } from "@/components/worklist-table";

export default function RendPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tap_hub_rend_year");
      return saved ? Number(saved) : currentYear;
    }
    return currentYear;
  });
  const { clients, loading, updateServiceMonth } = useClientsState();
  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <select value={year} onChange={(e) => { setYear(Number(e.target.value)); localStorage.setItem("tap_hub_rend_year", String(e.target.value)); }}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <WorklistTable serviceKey="renditions" clients={clients} year={year} loading={loading}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "renditions", monthIdx, stage)} />
    </div>
  );
}
