"use client";

import { useState, useMemo, useCallback } from "react";
import { useClients } from "@/hooks/use-clients-context";
import WorklistTable, { type WorklistStage } from "@/components/worklist-table";
import ClientSlideover from "@/components/client-slideover";

export default function AnnualPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const y = params.get("year");
      return y ? Number(y) : currentYear;
    }
    return currentYear;
  });
  const { clients, loading, updateServiceMonth, updateClient, refresh } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);

  // Filter + expand: clients with annual_reports + stateRenewal=true, expand stateRenewalItems into rows
  const flatRenewalClients = useMemo(() => {
    const expanded: any[] = [];
    for (const client of clients) {
      const rendSvc = client.services?.find((s: any) => s.key === "annual_reports" && s.enabled);
      if (!rendSvc?.stateRenewal) continue;

      const items = rendSvc.stateRenewalItems || [];
      if (items.length > 0) {
        items.forEach((item: any, idx: number) => {
          // Deep clone services so each item has independent months
          const svcClone = JSON.parse(JSON.stringify(
            client.services.find((s: any) => s.key === "annual_reports")
          ));
          expanded.push({
            ...client,
            id: `${client.id}::${item.id}`,
            _originalClientId: client.id,
            services: [svcClone],
            _renewalItem: item,
            _renewalIdx: idx,
            _renewalName: `${item.state} Renewal`,
          });
        });
      } else {
        // No items yet but stateRenewal=true — show a single placeholder row
        expanded.push({
          ...client,
          id: `${client.id}::placeholder`,
          _originalClientId: client.id,
          _renewalItem: null,
          _renewalIdx: -1,
          _renewalName: null,
        });
      }
    }
    expanded.sort((a, b) => a.name.localeCompare(b.name));
    return expanded;
  }, [clients]);

  const selectedClient = useMemo(
    () => (selectedClientId ? clients.find((c: any) => c.id === selectedClientId) ?? null : null),
    [clients, selectedClientId],
  );

  const handleClientClick = useCallback((clientId: string) => {
    // Strip composite ID (UUID::state_renewal_id) to get the real client UUID
    const origId = clientId.includes("::") ? clientId.split("::")[0] : clientId;
    setSelectedClientId(origId);
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
      <WorklistTable serviceKey="annual_reports" clients={flatRenewalClients} year={year} loading={loading} showRenewalColumns
        onStageChange={(flatId, monthIdx, stage) => {
          const origId = flatId.includes("::") ? flatId.split("::")[0] : flatId;
          updateServiceMonth(origId, "annual_reports", monthIdx, stage);
        }}
        onClientClick={handleClientClick}
        onDataChange={refresh} />
      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          open={slideoverOpen}
          moduleKey="annual_reports"
          onClose={() => { setSlideoverOpen(false); setSelectedClientId(null); refresh(); }}
          onSave={handleSlideoverSave}
        />
      )}
    </div>
  );
}
