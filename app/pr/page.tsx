"use client";

import { useState, useMemo, useCallback } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable from "@/components/worklist-table";

export default function PrPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const y = params.get("year");
      return y ? Number(y) : currentYear;
    }
    return currentYear;
  });
  const { clients, loading, updateServiceMonth } = useClientsState();


  const handleClientClick = useCallback((clientId: string) => {
    console.log("Open client:", clientId);
  }, []);

  return (
    <div className="space-y-4">
      <WorklistTable serviceKey="payroll" variant="payroll" clients={clients} year={year} loading={loading}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "payroll", monthIdx, stage)}
        onClientClick={handleClientClick} />
    </div>
  );
}
