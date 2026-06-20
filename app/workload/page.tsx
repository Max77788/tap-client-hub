"use client";

import { useMemo } from "react";
import { CLIENTS, STAFF, SERVICE_META } from "@/lib/data";
import type { ServiceKey } from "@/lib/types";

// ── Frequency → touchpoints/year ──
const FREQ_TOUCHPOINTS: Record<string, number> = {
  Monthly: 12,
  Quarterly: 4,
  Annually: 1,
  "N/A": 0,
};

interface StaffLoad {
  name: string;
  initials: string;
  role: string;
  totalTouchpoints: number;
  clientCount: number;
  services: Record<ServiceKey, number>;
}

export default function WorkloadPage() {
  // ── Calculate workload per staff member ──
  const staffLoads = useMemo<StaffLoad[]>(() => {
    const map = new Map<string, StaffLoad>();

    // Initialize all staff
    for (const s of STAFF) {
      const key = s.name;
      map.set(key, {
        name: s.name,
        initials: s.initials,
        role: s.role,
        totalTouchpoints: 0,
        clientCount: 0,
        services: {
          financials: 0,
          payroll: 0,
          sales_tax: 0,
          "1099s": 0,
          renditions: 0,
          tax_returns: 0,
        },
      });
    }

    // Track which staff member we've counted as a client
    const countedClients = new Set<string>();

    for (const client of CLIENTS) {
      for (const svc of client.services) {
        if (!svc.enabled) continue;
        const freq = FREQ_TOUCHPOINTS[svc.frequency || ""] || 0;
        const processor = svc.processor || "";
        // Map initials to full name
        const staffName =
          STAFF.find((s) => s.initials === processor)?.name || processor;

        const load = map.get(staffName);
        if (load) {
          (load.services as any)[svc.key || "financials"] = ((load.services as any)[svc.key || "financials"] || 0) + freq;
          load.totalTouchpoints += freq;
          if (!countedClients.has(client.id + staffName)) {
            load.clientCount++;
            countedClients.add(client.id + staffName);
          }
        }
      }
    }

    // Sort by total touchpoints descending
    return Array.from(map.values()).sort(
      (a, b) => b.totalTouchpoints - a.totalTouchpoints,
    );
  }, []);

  // ── Unassigned clients (no enabled services processed by anyone on staff) ──
  const unassignedClients = useMemo(() => {
    return CLIENTS.filter((client) => {
      const enabledSvcs = client.services.filter((s) => s.enabled);
      if (enabledSvcs.length === 0) return true;
      // Check if any service has a processor that's NOT in STAFF
      return enabledSvcs.every((svc) => {
        return !STAFF.some((s) => s.initials === svc.processor);
      });
    });
  }, []);

  // ── Group by "team" (based on client group field) ──
  const teamGroups = useMemo(() => {
    const map = new Map<string, { count: number; staff: Set<string> }>();
    for (const client of CLIENTS) {
      const group = client.group || "Other";
      const existing = map.get(group) || { count: 0, staff: new Set<string>() };
      existing.count++;
      existing.staff.add(client.assignedStaff || "Unassigned");
      map.set(group, existing);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  // ── Stats ──
  const busiestPerson = staffLoads[0] || null;
  const totalTouchpoints = staffLoads.reduce((s, l) => s + l.totalTouchpoints, 0);
  const avgTouchpoints = staffLoads.length > 0
    ? Math.round(totalTouchpoints / staffLoads.length)
    : 0;

  // ── Service colors for bar chart ──
  const svcColors: Record<ServiceKey, string> = {
    financials: "var(--green)",
    payroll: "var(--blue)",
    sales_tax: "var(--amber)",
    "1099s": "#8b6914",
    renditions: "#1e5631",
    tax_returns: "#5a2d82",
  };

  return (
    <div className="space-y-6">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Members" value={STAFF.length} color="var(--teal)" />
        <StatCard label="Total Clients" value={CLIENTS.length} color="var(--blue)" />
        <StatCard
          label="Busiest Person"
          value={busiestPerson?.totalTouchpoints ?? 0}
          suffix={busiestPerson ? ` (${busiestPerson.name.split(" ")[0]})` : ""}
          color="var(--amber)"
        />
        <StatCard
          label="Touchpoints / yr"
          value={totalTouchpoints}
          color="var(--green)"
        />
      </div>

      {/* ── Insight card ── */}
      <div
        className="p-5 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
          borderLeft: "4px solid var(--teal)",
        }}
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-2">
          Workload Balance Analysis
        </h3>
        {staffLoads.length >= 2 && (
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            <strong className="text-[var(--ink)]">
              {staffLoads[0].name}
            </strong>{" "}
            carries the heaviest load at{" "}
            <strong className="text-[var(--teal)]">
              {staffLoads[0].totalTouchpoints} touchpoints/year
            </strong>{" "}
            across {staffLoads[0].clientCount} clients.{" "}
            {staffLoads[staffLoads.length - 1].name} has the lightest at{" "}
            {staffLoads[staffLoads.length - 1].totalTouchpoints} touchpoints.{" "}
            The team average is{" "}
            <strong>{avgTouchpoints} touchpoints/year</strong> per person.
            {staffLoads[0].totalTouchpoints > avgTouchpoints * 1.5 && (
              <span style={{ color: "var(--amber)" }}>
                {" "}
                ⚠ Consider redistributing workload from{" "}
                {staffLoads[0].name.split(" ")[0]}.
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── By team rollup ── */}
      <div
        className="p-5 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">
          By Team Rollup
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {teamGroups.map(([group, info]) => (
            <div
              key={group}
              className="p-3 rounded-lg"
              style={{ backgroundColor: "var(--teal-soft)" }}
            >
              <p className="text-sm font-semibold text-[var(--teal)]">{group}</p>
              <p className="text-xs text-[var(--muted)]">
                {info.count} client{info.count !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {Array.from(info.staff).join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workload by estimated effort — horizontal bar chart ── */}
      <div
        className="p-5 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">
          Workload by Estimated Effort (touchpoints/year)
        </h3>
        <div className="space-y-3">
          {staffLoads.map((load) => {
            const maxWidth = staffLoads[0]?.totalTouchpoints || 1;
            const pct = Math.round((load.totalTouchpoints / maxWidth) * 100);
            return (
              <div key={load.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--ink)]">
                      {load.name}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {load.role}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[var(--muted)]">
                    {load.totalTouchpoints}{" "}
                    <span className="text-[10px]">
                      ({pct}% vs max)
                    </span>
                  </span>
                </div>
                <div
                  className="h-6 rounded-full overflow-hidden flex"
                  style={{ backgroundColor: "var(--line)" }}
                >
                  {(Object.keys(load.services) as ServiceKey[]).map((key) => {
                    const val = load.services[key];
                    if (val <= 0) return null;
                    const widthPct = (val / maxWidth) * 100;
                    return (
                      <div
                        key={key}
                        className="h-full transition-[width]"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: svcColors[key],
                        }}
                        title={`${SERVICE_META[key].label}: ${val}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Unassigned row */}
          {unassignedClients.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--red)]">
                    Unassigned
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--red-soft)", color: "var(--red)" }}>
                    ⚠ {unassignedClients.length}
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--red)]">
                  {unassignedClients.length} client{unassignedClients.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div
                className="rounded-lg p-3 text-xs max-h-[120px] overflow-y-auto"
                style={{
                  backgroundColor: "var(--red-soft)",
                  border: "1px dashed var(--red)",
                }}
              >
                {unassignedClients.map((c, i) => (
                  <span key={c.id}>
                    <span className="text-[var(--red)] font-medium">{c.name}</span>
                    {i < unassignedClients.length - 1 && <span className="text-[var(--muted)]"> · </span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Service mix by person table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--line)" }}>
          <h3 className="text-sm font-semibold text-[var(--ink)] m-0">
            Service Mix by Person
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Team Member
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Clients
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Load/yr
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Services Handled
                </th>
              </tr>
            </thead>
            <tbody>
              {staffLoads.map((load) => (
                <tr
                  key={load.name}
                  className="hover:bg-[var(--teal-soft)] transition-colors"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--ink)]">
                        {load.name}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {load.initials}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[var(--ink)]">
                    {load.clientCount}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[var(--ink)]">
                    {load.totalTouchpoints}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(load.services) as ServiceKey[]).map((key) => {
                        const val = load.services[key];
                        if (val <= 0) return null;
                        const meta = SERVICE_META[key];
                        return (
                          <span
                            key={key}
                            className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: meta.pillBg,
                              color: meta.pillColor,
                            }}
                          >
                            {meta.label}: {val}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Stat Card ──
// ══════════════════════════════════════════════
function StatCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div
      className="p-4 rounded-xl flex flex-col justify-between"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
    >
      {color && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
          style={{ backgroundColor: color }}
        />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1 leading-tight">
        {label}
      </p>
      <p className="text-2xl font-semibold m-0 leading-tight text-[var(--ink)]">
        {value}
        {suffix && (
          <span className="text-xs text-[var(--muted)] font-normal ml-1">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
