"use client";

import { useState, useMemo, useCallback } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable from "@/components/worklist-table";

export default function T9Page() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tap_hub_t9_year");
      return saved ? Number(saved) : currentYear;
    }
    return currentYear;
  });
  const { clients, updateServiceMonth } = useClientsState();
  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  const enabledCount = useMemo(
    () => clients.filter((c) => c.services?.find((s) => s.key === "1099s")?.enabled).length,
    [clients],
  );

  const handleClientClick = useCallback((clientId: string) => {
    // TODO: open client side panel — will be wired to a slide-over component
    console.log("Open client panel:", clientId);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--ink)]">1099s</h1>
          <p className="text-xs text-[var(--muted)]">{enabledCount} active clients</p>
        </div>
        <select value={year} onChange={(e) => { setYear(Number(e.target.value)); localStorage.setItem("tap_hub_t9_year", String(e.target.value)); }}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <WorklistTable serviceKey="1099s" variant="t9" clients={clients} year={year}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "1099s", monthIdx, stage)}
        onClientClick={handleClientClick} />
    </div>
  );
}
