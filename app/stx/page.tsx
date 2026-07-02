"use client";

import { useState, useMemo, useCallback } from "react";
import { useClients } from "@/hooks/use-clients-context";
import WorklistTable from "@/components/worklist-table";
import ClientSlideover from "@/components/client-slideover";

export default function StxPage() {
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

  // Flatten: each sales_tax service entry becomes its own row
  // Clients with multiple sales_tax services get duplicated with unique composite IDs
  // Sort by line item/service name so same-name items are adjacent
  const flatClients = useMemo(() => {
    const result: any[] = [];
    for (const client of clients) {
      const stxServices = (client.services || []).filter(
        (s: any) => s.key === "sales_tax" && s.enabled
      );
      if (stxServices.length === 0) continue;
      for (const svc of stxServices) {
        result.push({
          ...client,
          id: `${client.id}::${svc.csId || ""}`,
          _originalClientId: client.id,
          _csId: svc.csId,
          services: [svc],
        });
      }
    }
    // Sort by the service name / first line item name for clubbed grouping
    result.sort((a, b) => {
      const svcA = a.services?.[0];
      const svcB = b.services?.[0];
      const nameA = svcA?.salesTaxLineItems?.[0]?.serviceName || svcA?.name || a.name;
      const nameB = svcB?.salesTaxLineItems?.[0]?.serviceName || svcB?.name || b.name;
      return nameA.localeCompare(nameB);
    });
    return result;
  }, [clients]);

  const selectedClient = useMemo(
    () => {
      if (!selectedClientId) return null;
      return clients.find((c: any) => c.id === selectedClientId) ?? null;
    },
    [clients, selectedClientId],
  );

  const handleClientClick = useCallback((flatId: string) => {
    const origId = flatId.split("::")[0];
    setSelectedClientId(origId);
    setSlideoverOpen(true);
  }, []);

  const handleStageChange = useCallback(
    (flatId: string, monthIdx: number, stage: any, csId?: string) => {
      const parts = flatId.split("::");
      const origId = parts[0];
      const entryCsId = csId || parts[1] || undefined;
      updateServiceMonth(origId, "sales_tax", monthIdx, stage, entryCsId);
    },
    [updateServiceMonth],
  );

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
      <WorklistTable serviceKey="sales_tax" clients={flatClients} year={year} loading={loading}
        onStageChange={handleStageChange}
        onClientClick={handleClientClick} />
      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          open={slideoverOpen}
          moduleKey="sales_tax"
          onClose={() => { setSlideoverOpen(false); setSelectedClientId(null); }}
          onSave={handleSlideoverSave}
        />
      )}
    </div>
  );
}
