"use client";

import { useState, useMemo, useEffect } from "react";
import { MONTHS_SHORT, SERVICE_META } from "@/lib/data";
import type { ServiceKey } from "@/lib/types";
import { PageSkeleton } from "@/components/loading-skeleton";

// ── Types ──
interface StaffSummary {
  name: string;
  initials: string;
  clientCount: number;
  totalTouchpoints: number;
  services: Record<string, number>;
  monthCounts: number[]; // touchpoints per month
  clients: string[];
}

interface ClientData {
  id: string;
  name: string;
  assignedStaff: string;
}

// ── Month colors (progress indicators) ──
function getMonthColor(count: number, maxCount: number): string {
  if (count === 0) return "var(--line)";
  const ratio = count / (maxCount || 1);
  if (ratio >= 0.8) return "var(--green)";
  if (ratio >= 0.4) return "var(--amber)";
  return "var(--teal)";
}

function getMonthBg(count: number, maxCount: number): string {
  if (count === 0) return "transparent";
  const ratio = count / (maxCount || 1);
  if (ratio >= 0.8) return "var(--green-soft)";
  if (ratio >= 0.4) return "var(--amber-soft)";
  return "var(--teal-soft)";
}

// ── Main Workload Page ──
export default function WorkloadPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffLoads, setStaffLoads] = useState<StaffSummary[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/workload");
        if (!res.ok) throw new Error("Failed to load workload data");
        const data = await res.json();
        if (!cancelled) {
          setStaffLoads(Array.isArray(data.staffLoads) ? data.staffLoads : []);
          setTotalClients(data.totalClients || 0);
          setStaffCount(data.staffCount || 0);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load workload data");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const totalTouch = staffLoads.reduce((s, l) => s + l.totalTouchpoints, 0);
    const busiest = staffLoads[0];
    return { totalTouch, busiest };
  }, [staffLoads]);

  // Find max month count for color scaling
  const maxMonthCount = useMemo(() => {
    let max = 0;
    for (const staff of staffLoads) {
      for (const count of staff.monthCounts) {
        if (count > max) max = count;
      }
    }
    return max || 1;
  }, [staffLoads]);

  if (loading) return <PageSkeleton rows={6} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 rounded-xl text-center" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--red-soft)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--ink)] mb-1">Failed to load workload data</h3>
        <p className="text-sm text-[var(--muted)]">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--teal)" }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Members" value={staffCount} color="var(--teal)" />
        <StatCard label="Total Clients" value={totalClients} color="var(--blue)" />
        <StatCard
          label="Busiest Person"
          value={stats.busiest?.totalTouchpoints ?? 0}
          suffix={stats.busiest ? ` (${(stats.busiest.name || "").split(" ")[0]})` : ""}
          color="var(--amber)"
        />
        <StatCard label="Touchpoints / yr" value={stats.totalTouch} color="var(--green)" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "var(--green)" }} />
          Busy (80%+)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "var(--amber)" }} />
          Moderate (40-80%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "var(--teal)" }} />
          Light (&lt;40%)
        </span>
      </div>

      {/* Workload table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "18%" }}>Staff</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "8%" }}>Clients</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "8%" }}>Load/yr</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ width: "24%" }}>Services</th>
                {MONTHS_SHORT.map((m, i) => {
                  const isCurrentMonth = i === new Date().getMonth();
                  return (
                    <th
                      key={m}
                      className="text-center text-[10px] font-semibold uppercase tracking-tight px-1 py-3"
                      style={{
                        width: "3.5%",
                        color: isCurrentMonth ? "var(--teal)" : "var(--muted)",
                        backgroundColor: isCurrentMonth ? "var(--teal-soft)" : "transparent",
                      }}
                    >
                      {m}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staffLoads.map((load) => (
                <tr
                  key={load.name}
                  style={{ borderBottom: "1px solid var(--line)" }}
                  className="hover:bg-[var(--teal-soft)]/30 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                    {load.name}
                    <span className="text-[10px] text-[var(--muted)] ml-1">{load.initials}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{load.clientCount}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: load.totalTouchpoints > 50 ? "var(--amber)" : "var(--ink)" }}>
                    {load.totalTouchpoints}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(load.services) as ServiceKey[]).map((key) => {
                        const val = load.services[key];
                        if (!val || val <= 0) return null;
                        const meta = SERVICE_META[key];
                        if (!meta) return null;
                        return (
                          <span
                            key={key}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: meta.pillBg, color: meta.pillColor }}
                          >
                            {meta.label}: {val}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  {load.monthCounts.map((count, idx) => {
                    const isCurrentMonth = idx === new Date().getMonth();
                    return (
                      <td
                        key={idx}
                        className="px-1 py-3 text-center"
                        style={{
                          backgroundColor: isCurrentMonth ? "var(--teal-soft)" : "transparent",
                        }}
                      >
                        {count > 0 ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: getMonthBg(count, maxMonthCount),
                              color: getMonthColor(count, maxMonthCount),
                            }}
                            title={`${load.name}: ${count} touchpoints in ${MONTHS_SHORT[idx]}`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-[var(--line)]">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {staffLoads.length === 0 && (
                <tr>
                  <td colSpan={4 + 12} className="px-4 py-8 text-center text-xs text-[var(--muted)]">
                    No workload data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 text-xs text-[var(--muted)] border-t border-[var(--line)]">
          {staffLoads.length} staff members · {totalClients} active clients
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color?: string }) {
  return (
    <div className="p-[13px_16px] rounded-[13px] flex flex-col justify-between border" style={{ backgroundColor: "var(--card)", borderColor: "var(--line)", boxShadow: "0 1px 2px rgba(33,31,26,0.04)" }}>
      {color && <div className="h-0.5 rounded-t-xl mb-2" style={{ backgroundColor: color, margin: "-13px -16px 8px -16px", width: "calc(100% + 32px)" }} />}
      <p className="text-[12px] text-[var(--muted)] mb-1 leading-tight" style={{ fontFamily: '"Public Sans", sans-serif' }}>{label}</p>
      <p className="text-[26px] font-semibold m-0 leading-none" style={{ fontFamily: '"Fraunces", Georgia, serif', color: "var(--ink)" }}>{value}{suffix && <span className="text-xs text-[var(--muted)] ml-1">{suffix}</span>}</p>
    </div>
  );
}
