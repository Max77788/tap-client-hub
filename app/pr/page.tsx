"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPayrollData, type PayrollClient } from "@/lib/supabase-data";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PrPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [clients, setClients] = useState<PayrollClient[]>([]);
  const [loading, setLoading] = useState(true);
  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  useEffect(() => {
    setLoading(true);
    fetchPayrollData(year).then((data) => {
      setClients(data.clients);
      setLoading(false);
    });
  }, [year]);

  // Summary stats
  const totalRuns = useMemo(() => clients.reduce((s, c) => s + c.periods.reduce((a, p) => a + p.processed, 0), 0), [clients]);
  const totalExpected = useMemo(() => clients.reduce((s, c) => s + c.periods.reduce((a, p) => a + (p.expected || 0), 0), 0), [clients]);

  const cellColor = (processed: number, expected: number) => {
    if (processed === 0) return { bg: "var(--line)", fg: "var(--muted)" };
    if (processed >= expected) return { bg: "var(--green-soft)", fg: "var(--green)" };
    return { bg: "var(--amber-soft)", fg: "var(--amber)" };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ink)] m-0" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
            Payroll
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Payroll run tracking — counts per month (completed / expected)
          </p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Clients" value={clients.length} color="var(--teal)" />
        <StatCard label="Runs Completed" value={totalRuns} color="var(--green)" />
        <StatCard label="Runs Expected" value={totalExpected} color="var(--blue)" />
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)] py-10 text-center">Loading payroll data...</div>
      ) : clients.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-10 text-center">No payroll clients found for {year}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Client</th>
                <th className="text-left px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Freq</th>
                <th className="text-left px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Processor</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="text-center px-1.5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{m}</th>
                ))}
                <th className="text-center px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const totalDone = client.periods.reduce((s, p) => s + p.processed, 0);
                const totalExp = client.periods.reduce((s, p) => s + (p.expected || 0), 0);
                return (
                  <tr key={client.id} className="hover:bg-[var(--teal-soft)]/30 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--ink)]">{client.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{client.group_owner}</div>
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-[var(--muted)] capitalize">{client.frequency?.replace("_"," ")}</td>
                    <td className="px-2 py-2.5 text-[11px] text-[var(--muted)]">{client.processor}</td>
                    {client.periods.map((p) => {
                      const c = cellColor(p.processed, p.expected || 0);
                      return (
                        <td key={p.period} className="text-center px-1.5 py-2.5">
                          <span className="inline-flex items-center justify-center w-9 h-7 rounded text-[10px] font-bold"
                            style={{ backgroundColor: c.bg, color: c.fg }}>
                            {p.processed}{p.expected ? `/${p.expected}` : ""}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2.5">
                      <span className={`text-[11px] font-bold ${totalDone >= totalExp ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
                        {totalDone}/{totalExp}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: "var(--green-soft)" }}/> Completed</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: "var(--amber-soft)" }}/> Partial</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: "var(--line)" }}/> Not started</span>
        <span className="italic">Cells show completed / expected runs per month</span>
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
