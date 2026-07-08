"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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
  const debounceRef = useRef<Record<string, any>>({});

  // Flatten: each sales_tax service entry becomes its own row. Also merge all line items from all stx services.
  const flatClients = useMemo(() => {
    const result: any[] = [];
    for (const client of clients) {
      const stxServices = (client.services || []).filter(
        (s: any) => s.key === "sales_tax" && s.enabled
      );
      if (stxServices.length === 0) continue;

      // Merge all line items from all sales_tax services
      const allLineItems: any[] = [];
      for (const svc of stxServices) {
        if (svc.salesTaxLineItems?.length) {
          for (const item of svc.salesTaxLineItems) {
            allLineItems.push({ ...item, _csId: svc.csId });
          }
        }
      }

      // If there are line items, create one row per line item
      // If no line items, create one row per service
      if (allLineItems.length > 0) {
        for (const item of allLineItems) {
          result.push({
            ...client,
            id: `${client.id}::${item._csId}::${item.serviceName}`,
            _originalClientId: client.id,
            _csId: item._csId,
            services: [stxServices[0]], // Keep first service for months tracking
            _mergedLineItems: allLineItems,
            _stxItem: item,
            _stxName: item.serviceName,
          });
        }
      } else {
        for (const svc of stxServices) {
          result.push({
            ...client,
            id: `${client.id}::${svc.csId || ""}`,
            _originalClientId: client.id,
            _csId: svc.csId,
            services: [svc],
            _mergedLineItems: svc.salesTaxLineItems || [],
          });
        }
      }
    }
    // Sort by client name first, then by line item name
    result.sort((a, b) => {
      const clientCmp = a.name.localeCompare(b.name);
      if (clientCmp !== 0) return clientCmp;
      const nameA = a._stxName || "";
      const nameB = b._stxName || "";
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
    // Debounce network persist
    const key = `save_${updated.id}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(async () => {
      delete debounceRef.current[key];
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
    }, 400);
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
