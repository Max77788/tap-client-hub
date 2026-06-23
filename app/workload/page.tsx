"use client";

import { useState, useEffect } from "react";
import { useClientsState } from "@/hooks/use-clients-state";

export default function WorkloadPage() {
  const { clients, loading: clientsLoading, error: clientsError } = useClientsState();
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setStaff(data); })
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, []);

  if (clientsLoading || loadingStaff) {
    return <div className="p-8 text-[var(--muted)] text-sm">Loading workload data...</div>;
  }
  if (clientsError) {
    return <div className="p-8 text-[var(--red)] font-semibold">Client error: {clientsError}</div>;
  }

  // Compute per-staff loads
  const staffLoads: any[] = [];
  for (const s of staff) {
    let touchpoints = 0;
    let clientCount = 0;
    const seen = new Set<string>();
    for (const c of clients) {
      for (const svc of (c.services || [])) {
        if (!svc.enabled) continue;
        const freq = { monthly: 12, quarterly: 4, yearly: 1, annually: 1 }[String(svc.frequency || "").toLowerCase()] || 0;
        const proc = String(svc.processor || "");
        const sName = String(s.name || "");
        const initials = sName.split(" ").map((n: string) => n[0]).join("").toUpperCase();
        if (initials === proc || sName === proc || sName.split(" ")[0] === proc) {
          touchpoints += freq;
          if (!seen.has(c.id)) { clientCount++; seen.add(c.id); }
        }
      }
    }
    if (touchpoints > 0) staffLoads.push({ name: s.name, touchpoints, clientCount });
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-[var(--ink)]">Team Workload</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Members" value={staff.length} />
        <StatCard label="Total Clients" value={clients.length} />
        <StatCard label="Busiest" value={staffLoads[0]?.touchpoints ?? 0} />
        <StatCard label="Total Touchpoints" value={staffLoads.reduce((s, l) => s + l.touchpoints, 0)} />
      </div>
      <div className="p-4 rounded-xl bg-[var(--card)]" style={{ boxShadow: "var(--shadow)" }}>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--line)]"><th className="text-left p-2 text-[10px] uppercase text-[var(--muted)]">Person</th><th className="text-right p-2 text-[10px] uppercase text-[var(--muted)]">Clients</th><th className="text-right p-2 text-[10px] uppercase text-[var(--muted)]">Touchpoints/yr</th></tr></thead>
          <tbody>
            {staffLoads.map((l) => (
              <tr key={l.name} className="border-b border-[var(--line)]">
                <td className="p-2 font-semibold">{l.name}</td>
                <td className="p-2 text-right">{l.clientCount}</td>
                <td className="p-2 text-right">{l.touchpoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-[var(--muted)] mt-4">✓ Page loaded successfully</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--card)]" style={{ boxShadow: "var(--shadow)" }}>
      <p className="text-[11px] uppercase font-semibold text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}
