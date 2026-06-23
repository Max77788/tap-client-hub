"use client";

import { useState, useEffect, useMemo } from "react";
import { SERVICE_META } from "@/lib/data";
import type { ServiceKey } from "@/lib/types";

const FREQ_TOUCHPOINTS: Record<string, number> = {
  monthly: 12, quarterly: 4, yearly: 1, annually: 1, "n/a": 0,
};

export default function WorkloadPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cr, sr] = await Promise.all([
          fetch("/api/clients").then(r => r.ok ? r.json() : Promise.reject("clients API failed")),
          fetch("/api/profiles").then(r => r.ok ? r.json() : Promise.reject("profiles API failed")),
        ]);
        if (cancelled) return;
        setClients(Array.isArray(cr?.clients) ? cr.clients : []);
        setStaff(Array.isArray(sr) ? sr : []);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-8 text-[var(--muted)]">Loading workload data...</div>;
  if (error) return <div className="p-8 text-[var(--red)]">Error: {error}</div>;
  if (clients.length === 0) return <div className="p-8 text-[var(--muted)]">No clients loaded.</div>;

  // Build staff map
  const staffMap = new Map<string, { name: string; initials: string; role: string }>();
  for (const s of staff) {
    const name = String(s.name || "Unknown");
    const initials = name.split(" ").map((n: string) => n[0] || "").join("").toUpperCase() || "??";
    staffMap.set(name, { name, initials, role: String(s.role || "") });
  }

  // Compute loads
  const staffLoads = useMemo(() => {
    const loads = new Map<string, { totalTouchpoints: number; clientCount: number; services: Record<string, number> }>();
    const counted = new Set<string>();

    for (const c of clients) {
      if (!c?.services) continue;
      for (const svc of c.services) {
        if (!svc?.enabled) continue;
        const freq = FREQ_TOUCHPOINTS[String(svc.frequency || "").toLowerCase()] || 0;
        const proc = String(svc.processor || "");
        // Match processor initials or name to staff
        let staffName = proc;
        for (const [sName, sInfo] of staffMap) {
          if (sInfo.initials === proc || sName === proc || sName.split(" ")[0] === proc) {
            staffName = sName;
            break;
          }
        }
        if (!staffName) continue;
        const load = loads.get(staffName) || { totalTouchpoints: 0, clientCount: 0, services: {} };
        const key = String(svc.key || "financials");
        load.services[key] = (load.services[key] || 0) + freq;
        load.totalTouchpoints += freq;
        const cid = String(c.id || "") + staffName;
        if (!counted.has(cid)) { load.clientCount++; counted.add(cid); }
        loads.set(staffName, load);
      }
    }

    // Fill in staff with no load
    for (const [name] of staffMap) {
      if (!loads.has(name)) {
        loads.set(name, { totalTouchpoints: 0, clientCount: 0, services: {} });
      }
    }

    return Array.from(loads.entries()).map(([name, data]) => ({
      name,
      initials: staffMap.get(name)?.initials || "??",
      role: staffMap.get(name)?.role || "",
      ...data,
      services: data.services as Record<ServiceKey, number>,
    })).sort((a, b) => b.totalTouchpoints - a.totalTouchpoints);
  }, [clients, staff]);

  const busiest = staffLoads[0];
  const totalTouch = staffLoads.reduce((s, l) => s + l.totalTouchpoints, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Members" value={staff.length} color="var(--teal)" />
        <StatCard label="Total Clients" value={clients.length} color="var(--blue)" />
        <StatCard label="Busiest Person" value={busiest?.totalTouchpoints ?? 0}
          suffix={busiest ? ` (${(busiest.name || "").split(" ")[0]})` : ""}
          color="var(--amber)" />
        <StatCard label="Touchpoints / yr" value={totalTouch} color="var(--green)" />
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
              <tr key={load.name} style={{ borderBottom: "1px solid var(--line)" }}>
                <td className="p-3 font-semibold">{load.name} <span className="text-[10px] text-[var(--muted)]">{load.initials}</span></td>
                <td className="p-3 text-right">{load.clientCount}</td>
                <td className="p-3 text-right">{load.totalTouchpoints}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(load.services) as ServiceKey[]).map((key) => {
                      const val = load.services[key];
                      if (!val || val <= 0) return null;
                      const meta = SERVICE_META[key];
                      if (!meta) return null;
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
