"use client";

import { useState, useMemo, useCallback } from "react";
import { useClients } from "@/hooks/use-clients-context";
import WorklistTable from "@/components/worklist-table";
import ClientSlideover from "@/components/client-slideover";

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
  const { clients, loading, updateServiceMonth, updateClient } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [payrollMissingRuns, setPayrollMissingRuns] = useState(0);

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

  // Payroll-specific metrics
  const payrollMetrics = useMemo(() => {
    const prClients = clients.filter((c: any) =>
      c.services?.some((s: any) => s.key === "payroll" && s.enabled)
    );
    const total = prClients.length;
    const weekly = prClients.filter((c: any) =>
      c.services?.some((s: any) => s.key === "payroll" && s.frequency === "Weekly")
    ).length;
    const biWeekly = prClients.filter((c: any) =>
      c.services?.some((s: any) => s.key === "payroll" && (s.frequency === "Bi-Weekly" || s.frequency === "Semi-Monthly"))
    ).length;
    const monthly = prClients.filter((c: any) =>
      c.services?.some((s: any) => s.key === "payroll" && s.frequency === "Monthly")
    ).length;

    // Count unique processors
    const processors = new Set(
      prClients.map((c: any) =>
        c.services?.find((s: any) => s.key === "payroll")?.processor
      ).filter(Boolean)
    );

    return { total, weekly, biWeekly, monthly, processorCount: processors.size };
  }, [clients]);

  return (
    <div className="space-y-4">
      {/* Payroll-specific metrics bar */}
      <div className="stats" style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <StatCard label="Clients on Payroll" value={payrollMetrics.total} color="var(--ink)" />
        <StatCard label="Weekly" value={payrollMetrics.weekly} color="var(--blue)" />
        <StatCard label="Bi-Weekly / Semi-Mo" value={payrollMetrics.biWeekly} color="var(--amber)" />
        <StatCard label="Monthly" value={payrollMetrics.monthly} color="var(--teal)" />
        <StatCard label="Unique Processors" value={payrollMetrics.processorCount} color="var(--green)" />
        <StatCard label="Total missing runs" value={payrollMissingRuns} color="var(--red)" />
      </div>

      <WorklistTable serviceKey="payroll" variant="payroll" clients={clients} year={year} loading={loading}
        onStageChange={(clientId, monthIdx, stage) => updateServiceMonth(clientId, "payroll", monthIdx, stage)}
        onClientClick={handleClientClick}
        onPayrollMissingRuns={setPayrollMissingRuns} />
      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          open={slideoverOpen}
          moduleKey="payroll"
          onClose={() => { setSlideoverOpen(false); setSelectedClientId(null); }}
          onSave={handleSlideoverSave}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="statcard" style={{
      flex: 1, minWidth: 120,
      backgroundColor: "var(--card)",
      border: "1px solid var(--line)",
      borderRadius: 13,
      padding: "13px 16px",
      boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
    }}>
      <div style={{
        fontFamily: '"Fraunces",Georgia,serif',
        fontWeight: 600, fontSize: 26, lineHeight: 1,
        color: color || "var(--ink)",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
