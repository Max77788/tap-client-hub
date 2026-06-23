"use client";

import { useClientsState } from "@/hooks/use-clients-state";

export default function WorkloadPage() {
  const { clients, loading, error } = useClientsState();

  if (loading) return <div className="p-8 text-[var(--muted)]">Loading workload...</div>;

  if (error) {
    return (
      <div className="p-8">
        <p className="text-[var(--red)] font-semibold">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-lg font-semibold">Team Workload</h2>
      <p className="text-sm text-[var(--muted)]">{clients.length} clients loaded</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[var(--card)] shadow-sm">
          <p className="text-[11px] text-[var(--muted)] uppercase font-semibold">Clients</p>
          <p className="text-2xl font-semibold">{clients.length}</p>
        </div>
      </div>
      <div className="text-xs text-[var(--muted)]">
        {clients.slice(0, 5).map((c) => (
          <div key={c.id}>{c.name} — {(c as any).group || "No group"}</div>
        ))}
      </div>
    </div>
  );
}
