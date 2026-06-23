import { SERVICE_META } from "@/lib/data";
import type { ServiceKey } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const FREQ_TOUCHPOINTS: Record<string, number> = {
  monthly: 12, quarterly: 4, yearly: 1, annually: 1, "n/a": 0,
};

const CODE_TO_KEY: Record<string, ServiceKey> = {
  FIN: "financials", PR: "payroll", STX: "sales_tax",
  T9: "1099s", REND: "renditions", TAX: "tax_returns",
};

async function getWorkloadData() {
  const supabase = await createClient();

  // Fetch clients with services
  const { data: dbClients } = await supabase.from("clients").select("*").eq("status", "active").order("name");
  const { data: dbServices } = await supabase.from("client_services").select("*, service:services(*)").eq("active", true);
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  if (!dbClients) return { clients: [], staff: [], staffLoads: [] };

  // Build staff map
  const staffMap = new Map<string, { name: string; initials: string }>();
  for (const p of profiles || []) {
    const name = String(p.full_name || "Unknown");
    const initials = name.split(" ").map((n: string) => n[0] || "").join("").toUpperCase() || "??";
    staffMap.set(name, { name, initials });
  }

  // Group services by client
  const servicesByClient: Record<string, any[]> = {};
  for (const cs of dbServices || []) {
    if (!servicesByClient[cs.client_id]) servicesByClient[cs.client_id] = [];
    servicesByClient[cs.client_id].push(cs);
  }

  // Compute loads
  const loads = new Map<string, { totalTouchpoints: number; clientCount: number; services: Record<string, number> }>();
  const counted = new Set<string>();

  for (const c of dbClients) {
    const clientServices = servicesByClient[c.id] || [];
    for (const cs of clientServices) {
      const freq = FREQ_TOUCHPOINTS[String(cs.frequency || "").toLowerCase()] || 0;
      const proc = String(cs.processor || "");
      let staffName = proc;
      for (const [sName, sInfo] of staffMap) {
        if (sInfo.initials === proc || sName === proc || sName.split(" ")[0] === proc) {
          staffName = sName; break;
        }
      }
      if (!staffName) continue;
      const load = loads.get(staffName) || { totalTouchpoints: 0, clientCount: 0, services: {} };
      const key = CODE_TO_KEY[cs.service?.code || ""] || "financials";
      load.services[key] = (load.services[key] || 0) + freq;
      load.totalTouchpoints += freq;
      const cid = String(c.id) + staffName;
      if (!counted.has(cid)) { load.clientCount++; counted.add(cid); }
      loads.set(staffName, load);
    }
  }

  for (const [name] of staffMap) {
    if (!loads.has(name)) loads.set(name, { totalTouchpoints: 0, clientCount: 0, services: {} });
  }

  const staffLoads = Array.from(loads.entries()).map(([name, data]) => ({
    name,
    initials: staffMap.get(name)?.initials || "??",
    ...data,
  })).sort((a, b) => b.totalTouchpoints - a.totalTouchpoints);

  return { clients: dbClients, staff: profiles || [], staffLoads };
}

export default async function WorkloadPage() {
  const { clients, staff, staffLoads } = await getWorkloadData();

  const busiest = staffLoads[0];
  const totalTouch = staffLoads.reduce((s: number, l: any) => s + l.totalTouchpoints, 0);

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
            {staffLoads.map((load: any) => (
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
