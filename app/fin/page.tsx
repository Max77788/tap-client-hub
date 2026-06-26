"use client";

import { useState, useMemo, useCallback } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable from "@/components/worklist-table";

export default function FinPage() {
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
  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  const enabledCount = useMemo(
    () => clients.filter((c) => c.services?.find((s) => s.key === "financials")?.enabled).length,
    [clients],
  );

  const handleClientClick = useCallback((clientId: string) => {
    // TODO: open client side panel — will be wired to a slide-over component
    console.log("Open client panel:", clientId);
  }, []);

  return (
    <div className="space-y-4">
      <WorklistTable serviceKey="financials" clients={clients} year={year} loading={loading}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "financials", monthIdx, stage)}
        onClientClick={handleClientClick} />
    </div>
  );
}
