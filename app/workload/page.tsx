"use client";

import { useState, useEffect, useMemo } from "react";
import { SERVICE_META } from "@/lib/data";
import { useClientsState } from "@/hooks/use-clients-state";
import type { ServiceKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const FREQ_TOUCHPOINTS: Record<string, number> = {
  monthly: 12, quarterly: 4, yearly: 1, annually: 1, "n/a": 0,
};

interface StaffLoad {
  name: string; initials: string; role: string;
  totalTouchpoints: number; clientCount: number;
  services: Record<ServiceKey, number>;
}

export default function WorkloadPage() {
  const { clients, loading: clientsLoading, error: clientsError } = useClientsState();
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setStaff(data); })
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, []);

  if (clientsLoading || loadingStaff) {
    return <div className="p-8 text-[var(--muted)]">Loading...</div>;
  }
  if (clientsError) {
    return <div className="p-8 text-[var(--red)]">Error: {String(clientsError)}</div>;
  }

  // Compute staff workloads
  const staffLoads = useMemo(() => {
    const map = new Map<string, StaffLoad>();
    for (const s of staff) {
      const name = s.name || "Unknown";
      const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase();
      map.set(name, { name, initials, role: s.role || "", totalTouchpoints: 0, clientCount: 0, services: { financials: 0, payroll: 0, sales_tax: 0, "1099s": 0, renditions: 0, tax_returns: 0 } });
    }
    const counted = new Set<string>();
    for (const c of clients) {
      for (const svc of (c.services || [])) {
        if (!svc || !svc.enabled) continue;
        const freqKey = String(svc.frequency || "").toLowerCase();
        const freq = FREQ_TOUCHPOINTS[freqKey] || 0;
        const proc = String(svc.processor || "");
        const staffName = staff.find((s) => {
          const sName = String(s.name || "");
          const initials = sName.split(" ").map((n: string) => n[0]).join("").toUpperCase();
          return initials === proc || sName === proc || sName.split(" ")[0] === proc;
        })?.name || proc;
        const load = map.get(staffName);
        if (load) {
          const key = (svc.key || "financials") as ServiceKey;
          load.services[key] = (load.services[key] || 0) + freq;
          load.totalTouchpoints += freq;
          const cid = c.id + staffName;
          if (!counted.has(cid)) { load.clientCount++; counted.add(cid); }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalTouchpoints - a.totalTouchpoints);
  }, [clients, staff]);

  const busiestPerson = staffLoads[0] || null;
  const totalTouchpoints = staffLoads.reduce((s, l) => s + l.totalTouchpoints, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Members" value={staff.length} color="var(--teal)" />
        <StatCard label="Total Clients" value={clients.length} color="var(--blue)" />
        <StatCard label="Busiest Person" value={busiestPerson?.totalTouchpoints ?? 0} suffix={busiestPerson ? ` (${busiestPerson.name.split(" ")[0]})` : ""} color="var(--amber)" />
        <StatCard label="Touchpoints / yr" value={totalTouchpoints} color="var(--green)" />
      </div>

      <div className="p-5 rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Workload by Person</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th className="text-left p-3 text-[10px] uppercase text-[var(--muted)]">Person</th>
              <th className="text-right p-3 text-[10px] uppercase text-[var(--muted)]">Clients</th>
              <th className="text-right p-3 text-[10px] uppercase text-[var(--muted)]">Load/yr</th>
              <th className="text-left p-3 text-[10px] uppercase text-[var(--muted)]">Services</th>
            </tr>
          </thead>
          <tbody>
            {staffLoads.map((load) => (
              <tr key={load.name} className="hover:bg-[var(--teal-soft)]/30" style={{ borderBottom: "1px solid var(--line)" }}>
                <td className="p-3 font-semibold">{load.name} <span className="text-[10px] text-[var(--muted)]">{load.initials}</span></td>
                <td className="p-3 text-right">{load.clientCount}</td>
                <td className="p-3 text-right">{load.totalTouchpoints}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(load.services) as ServiceKey[]).map((key) => {
                      const val = load.services[key];
                      if (val <= 0) return null;
                      const meta = SERVICE_META[key];
                      return <span key={key} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.pillBg, color: meta.pillColor }}>{meta.label}: {val}</span>;
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {staffLoads.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-[var(--muted)]">No workload data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color?: string }) {
  return (
    <div className="p-[13px_16px] rounded-[13px] flex flex-col justify-between border" style={{ backgroundColor: "var(--card)", borderColor: "var(--line)", boxShadow: "0 1px 2px rgba(33,31,26,0.04)" }}>
      {color && <div className="h-0.5 rounded-t-xl mb-2" style={{ backgroundColor: color, margin: "-13px -16px 8px -16px", width: "calc(100% + 32px)" }} />}
      <p className="text-[12px] text-[var(--muted)] mb-1 leading-tight" style={{ fontFamily: '"Public Sans", sans-serif' }}>{label}</p>
      <p className="text-[26px] font-semibold m-0 leading-none" style={{ fontFamily: '"Fraunces", Georgia, serif', color: "var(--ink)" }}>{value}{suffix && <span className="text-xs text-[var(--muted)] ml-1">{suffix}</span>}</p>
    </div>
  );
}
