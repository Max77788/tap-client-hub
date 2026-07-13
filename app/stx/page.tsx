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
  const { clients, loading, updateClient } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [stxLineItemFocus, setStxLineItemFocus] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, any>>({});

  const flatClients = useMemo(() => {
    const result: any[] = [];
    for (const client of clients) {
      const stxServices = (client.services || []).filter(
        (s: any) => s.key === "sales_tax" && s.enabled
      );
      if (stxServices.length === 0) continue;

      const allLineItems: any[] = [];
      for (const svc of stxServices) {
        if (svc.salesTaxLineItems?.length) {
          for (const item of svc.salesTaxLineItems) {
            allLineItems.push({ ...item, _csId: svc.csId, _svcName: svc.serviceName });
          }
        }
      }

      if (allLineItems.length > 0) {
        for (const item of allLineItems) {
          // Deep clone service so each line item has independent months/salesTaxLineItems
          const svcClone = JSON.parse(JSON.stringify(stxServices[0]));
          result.push({
            ...client,
            id: `${client.id}::${item._csId}::${item.serviceName}`,
            _originalClientId: client.id,
            _csId: item._csId,
            services: [svcClone],
            _mergedLineItems: allLineItems,
            _stxItem: item,
            _stxName: item._svcName || item.serviceName,
          });
        }
      } else {
        for (const svc of stxServices) {
          const svcClone = JSON.parse(JSON.stringify(svc));
          result.push({
            ...client,
            id: `${client.id}::${svcClone.csId || ""}`,
            _originalClientId: client.id,
            _csId: svcClone.csId,
            services: [svcClone],
            _mergedLineItems: svc.salesTaxLineItems || [],
          });
        }
      }
    }
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
    // Split composite ID: clientId::csId::serviceName or clientId::csId
    const parts = flatId.split("::");
    const origId = parts[0];
    const lineItemName = parts.length > 2 ? parts.slice(2).join("::") : null;
    setSelectedClientId(origId);
    setStxLineItemFocus(lineItemName);
    setSlideoverOpen(true);
  }, []);

  const handleStageChange = useCallback(
    (flatId: string, monthIdx: number, stage: any, csId?: string) => {
      const parts = flatId.split("::");
      const entryCsId = csId || parts[1] || undefined;
      // Persist directly — don't use updateServiceMonth (mutates shared source, duplicates across line items)
      const now = new Date();
      const period = `${now.getFullYear()}-${String(monthIdx + 1).padStart(2, "0")}`;
      const wStage = (() => {
        switch (stage) {
          case "ip": return "in_progress";
          case "wc": return "waiting_client";
          case "pp": return "pending_payment";
          case "dn": return "done";
          case "dl": return "delayed";
          case "na": return "not_applicable";
          default: return "not_started";
        }
      })();
      fetch("/api/clients/service-month", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csId: entryCsId, period, stage: wStage }),
      }).catch(() => {});
    },
    [],
  );

  const handleSlideoverSave = useCallback((updated: any) => {
    const key = `save_${updated.id}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(async () => {
      delete debounceRef.current[key];
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
          stxLineItemFocus={stxLineItemFocus}
          onClose={() => { setSlideoverOpen(false); setSelectedClientId(null); setStxLineItemFocus(null); }}
          onSave={handleSlideoverSave}
        />
      )}
    </div>
  );
}
