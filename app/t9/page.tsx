"use client";

import { useState, useMemo, useCallback } from "react";
import { useClientsState } from "@/hooks/use-clients-state";
import WorklistTable from "@/components/worklist-table";
import ClientSlideover from "@/components/client-slideover";

export default function T9Page() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const y = params.get("year");
      return y ? Number(y) : currentYear;
    }
    return currentYear;
  });
  const { clients, loading, updateServiceMonth, updateClient } = useClientsState();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);

  const selectedClient = useMemo(
    () => (selectedClientId ? clients.find((c: any) => c.id === selectedClientId) ?? null : null),
    [clients, selectedClientId],
  );

  const handleClientClick = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setSlideoverOpen(true);
  }, []);

  const handleSlideoverSave = useCallback(async (updated: any) => {
    updateClient(updated.id, updated);
    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) console.error("PUT /api/clients failed:", res.status);
    } catch (e) {
      console.error("Failed to save client:", e);
    }
  }, [updateClient]);

  return (
    <div className="space-y-4">
      <WorklistTable serviceKey="1099s" variant="t9" clients={clients} year={year} loading={loading}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "1099s", monthIdx, stage)}
        onClientClick={handleClientClick} />
      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          open={slideoverOpen}
          onClose={() => { setSlideoverOpen(false); setSelectedClientId(null); }}
          onSave={handleSlideoverSave}
        />
      )}
    </div>
  );
}
