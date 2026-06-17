"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchT9Data, type T9Client } from "@/lib/supabase-data";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function T9Page() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [clients, setClients] = useState<T9Client[]>([]);
  const [loading, setLoading] = useState(true);
  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  useEffect(() => {
    setLoading(true);
    fetchT9Data(year).then((data) => {
      setClients(data.clients);
      setLoading(false);
    });
  }, [year]);

  const totalExpected = useMemo(() => clients.reduce((s, c) => s + c.expected_annual, 0), [clients]);
  const totalProcessed = useMemo(() => clients.reduce((s, c) => s + c.periods.reduce((a, p) => a + p.processed, 0), 0), [clients]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ink)] m-0" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
            1099s
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Annual 1099 issuance tracking — counts per month, remaining to complete
          </p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Clients with 1099s" value={clients.length} color="var(--teal)" />
        <StatCard label="Total Expected" value={totalExpected} color="#8b6914" />
        <StatCard label="Processed" value={totalProcessed} color="var(--green)" />
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)] py-10 text-center">Loading 1099 data...</div>
      ) : clients.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-10 text-center">No 1099 clients found for {year}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                <th className="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Annual Target</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="text-center px-1.5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{m}</th>
                ))}
                <th className="text-center px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Done</th>
                <th className="text-center px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Left</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const totalDone = client.periods.reduce((s, p) => s + p.processed, 0);
                const remaining = client.expected_annual - totalDone;
                const pct = client.expected_annual > 0 ? Math.round((totalDone / client.expected_annual) * 100) : 0;
                return (
                  <tr key={client.id} className="hover:bg-[var(--teal-soft)]/30 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--ink)]">{client.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{client.group_owner}</div>
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <span className="text-sm font-bold text-[#8b6914]">{client.expected_annual}</span>
                    </td>
                    {client.periods.map((p) => (
                      <td key={p.period} className="text-center px-1.5 py-2.5">
                        {p.processed > 0 ? (
                          <span className="inline-flex items-center justify-center w-8 h-7 rounded text-[10px] font-bold"
                            style={{ backgroundColor: "var(--green-soft)", color: "var(--green)" }}>
                            {p.processed}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--muted)]">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2.5">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 rounded-full" style={{ backgroundColor: "var(--line)" }}>
                          <div className="h-2 rounded-full" style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 100 ? "var(--green)" : pct > 0 ? "var(--amber)" : "transparent",
                          }}/>
                        </div>
                        <span className="text-[11px] font-bold text-[var(--ink)]">{totalDone}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className={`text-[11px] font-bold ${remaining > 0 ? "text-[var(--red)]" : "text-[var(--green)]"}`}>
                        {remaining > 0 ? remaining : "✓"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span>Cells show 1099 forms processed per month</span>
        <span>·</span>
        <span>Progress bar: {totalExpected > 0 ? Math.round((totalProcessed / totalExpected) * 100) : 0}% complete across all clients</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)", borderLeft: `3px solid ${color}` }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="text-xl font-bold leading-tight" style={{ color }}>{value}</span>
    </div>
  );
}
