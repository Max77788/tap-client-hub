"use client";

import { useState, useMemo, useCallback } from "react";
import { useClients } from "@/hooks/use-clients-context";
import WorklistTable, { type WorklistStage } from "@/components/worklist-table";
import ClientSlideover from "@/components/client-slideover";

export default function TaxPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const y = params.get("year");
      return y ? Number(y) : currentYear;
    }
    return currentYear;
  });
  const { clients, loading, updateServiceMonth, updateClient } = useClients();
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
      <WorklistTable serviceKey="tax_returns" clients={clients} year={year} loading={loading}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "tax_returns", monthIdx, stage)}
        onClientClick={handleClientClick} />
      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          open={slideoverOpen}
          moduleKey="tax_returns"
          onClose={() => { setSlideoverOpen(false); setSelectedClientId(null); }}
          onSave={handleSlideoverSave}
        />
      )}
    </div>
  );
}
