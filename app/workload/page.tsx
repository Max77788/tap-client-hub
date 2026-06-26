"use client";

import { useState, useMemo, useEffect } from "react";
import { MONTHS_SHORT, SERVICE_META } from "@/lib/data";
import type { ServiceKey } from "@/lib/types";
import { PageSkeleton } from "@/components/loading-skeleton";

interface StaffSummary {
  name: string;
  initials: string;
  clientCount: number;
  totalTouchpoints: number;
  services: Record<string, number>;
  monthCounts: number[];
  clients: string[];
}

export default function WorkloadPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffLoads, setStaffLoads] = useState<StaffSummary[]>([]);
  const [totalClients, setTotalClients] = useState(0);

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
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const maxLoad = useMemo(() => Math.max(1, ...staffLoads.map(s => s.totalTouchpoints)), [staffLoads]);
  const avgLoad = useMemo(() => {
    const real = staffLoads.length;
    if (!real) return 0;
    return Math.round(staffLoads.reduce((a, s) => a + s.totalTouchpoints, 0) / real);
  }, [staffLoads]);

  const realStaff = staffLoads.filter(s => s.name !== "Unassigned");
  const busiest = realStaff[0];
  const lightest = realStaff[realStaff.length - 1];
  const unassigned = staffLoads.find(s => s.name === "Unassigned");

  if (loading) return <PageSkeleton rows={6} />;
  if (error) return <div className="panel" style={panelStyle}><div className="empty" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Failed to load workload data. <button onClick={() => window.location.reload()} style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600 }}>Retry</button></div></div>;

  // ── Service colors ──
  const SVCMETA: Record<string, { l: string; ic: string; col: string }> = {
    financials:  { l: "Financials", ic: "📊", col: "#2f7d4f" },
    payroll:     { l: "Payroll", ic: "💵", col: "#2c5d86" },
    sales_tax:   { l: "Sales Tax", ic: "🧾", col: "#b9791f" },
    tax_returns: { l: "Tax Return", ic: "📋", col: "#5a4a80" },
    "1099s":     { l: "1099s", ic: "📄", col: "#7a5436" },
    renditions:  { l: "Renditions", ic: "🏠", col: "#3a5a44" },
  };

  return (
    <div>
      {/* ── Stats ── */}
      <div className="stats" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <div className="statcard" style={statcardStyle}>
          <div className="sn" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 26, lineHeight: 1 }}>{realStaff.length}</div>
          <div className="sl" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Team members</div>
        </div>
        <div className="statcard" style={statcardStyle}>
          <div className="sn" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 26, lineHeight: 1, color: "var(--green)" }}>{totalClients}</div>
          <div className="sl" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Clients</div>
        </div>
        <div className="statcard" style={statcardStyle}>
          <div className="sn" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 26, lineHeight: 1, color: "var(--amber)" }}>{busiest?.name.split(" ")[0] || "—"}</div>
          <div className="sl" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Busiest</div>
        </div>
        <div className="statcard" style={statcardStyle}>
          <div className="sn" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 26, lineHeight: 1, color: "var(--red)" }}>{unassigned?.clientCount || 0}</div>
          <div className="sl" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Unassigned</div>
        </div>
      </div>

      {/* ── Insight ── */}
      {busiest && lightest && busiest !== lightest && avgLoad > 0 && (
        <div className="insight" style={{
          display: "flex", gap: 12, background: "var(--amber-soft)", border: "1px solid #ead9b6",
          color: "#6b4a12", borderRadius: 14, padding: "14px 16px",
          marginTop: 16, fontSize: "13.5px", lineHeight: 1.5,
        }}>
          <span>💡</span>
          <div>
            <b style={{ color: "#4a3208" }}>{busiest.name}</b> is carrying the heaviest load (~{busiest.totalTouchpoints} touchpoints/yr,
            {Math.round((busiest.totalTouchpoints / avgLoad - 1) * 100)}% above average), while <b style={{ color: "#4a3208" }}>{lightest.name}</b>
            {" "}sits at ~{lightest.totalTouchpoints}. Moving a couple of recurring clients from {busiest.name.split(" ")[0]} to{" "}
            {lightest.name.split(" ")[0]} would even the team out{unassigned ? `. You also have ${unassigned.clientCount} unassigned client${unassigned.clientCount !== 1 ? "s" : ""} with no owner.` : "."}
          </div>
        </div>
      )}

      {/* ── Workload by estimated effort ── */}
      <div className="sect2" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 18, margin: "26px 0 10px" }}>Workload by estimated effort</div>

      {/* Legend */}
      <div className="legend" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
        {Object.entries(SVCMETA).map(([k, v]) => (
          <span key={k} className="lgd" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: v.col }}></i>{v.l}
          </span>
        ))}
        <span className="lgd-note" style={{ marginLeft: "auto", fontStyle: "italic", opacity: .8 }}>bar length = est. annual touchpoints (recurring filings + jobs)</span>
      </div>

      {/* Bars */}
      <div className="panel" style={{ ...panelStyle, padding: "14px 18px" }}>
        {staffLoads.map(s => {
          const isU = s.name === "Unassigned";
          const diff = avgLoad ? Math.round((s.totalTouchpoints / avgLoad - 1) * 100) : 0;
          const diffCls = isU ? "" : diff > 15 ? "d-hi" : diff < -15 ? "d-lo" : "d-mid";
          const diffTxt = isU ? "unassigned — needs an owner" : (diff > 0 ? `+${diff}% vs avg` : `${diff}% vs avg`);
          const diffColor = isU ? "var(--red)" : diff > 15 ? "var(--amber)" : diff < -15 ? "var(--green)" : "var(--muted)";
          return (
            <div key={s.name} className={`wrow ${isU ? "wrow-u" : ""}`} style={{
              display: "grid", gridTemplateColumns: "170px 1fr 120px", alignItems: "center",
              gap: 14, padding: "10px 0", borderBottom: "1px solid #efeade",
            }}>
              <div className="wname" style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>
                {isU ? "⚠️ " : ""}{s.name}
                <span className="wsub" style={{ display: "block", fontWeight: 500, fontSize: "11.5px", color: "var(--muted)", marginTop: 2 }}>
                  {s.clientCount} client{s.clientCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="wtrack" style={{ display: "flex", height: 22, borderRadius: 7, overflow: "hidden", background: "#efeade" }}>
                {Object.entries(SVCMETA).map(([k, v]) => {
                  if (!s.services[k]) return null;
                  return <div key={k} className="wseg" style={{ height: "100%", width: `${(s.services[k] / maxLoad) * 100}%`, background: v.col, transition: "width .5s cubic-bezier(.4,0,.2,1)" }}
                    title={`${v.l}: ${s.services[k]} touchpoints`} />;
                })}
                {Object.values(s.services).reduce((a, b) => a + b, 0) === 0 && (
                  <div className="wseg" style={{ width: 2, background: "#ddd" }} />
                )}
              </div>
              <div className="wload" style={{ textAlign: "right" }}>
                <b style={{ fontFamily: '"Fraunces",Georgia,serif', fontSize: 19 }}>{s.totalTouchpoints}</b>
                <span className="wdiff" style={{ display: "block", fontSize: 11, fontWeight: 600, marginTop: 1, color: diffColor }}>{diffTxt}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Service mix by person ── */}
      <div className="sect2" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 18, margin: "26px 0 10px" }}>Service mix by person</div>
      <div className="panel" style={panelStyle}>
        <table>
          <thead>
            <tr>
              <th>Team member</th><th>Clients</th><th>Load / yr</th><th>Services handled</th>
            </tr>
          </thead>
          <tbody>
            {realStaff.map(s => (
              <tr key={s.name}>
                <td className="lname2" style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{s.clientCount}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}><b>{s.totalTouchpoints}</b></td>
                <td>
                  <div className="chips2" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {Object.entries(SVCMETA).map(([k, v]) => {
                      const cnt = s.services[k];
                      if (!cnt) return null;
                      return (
                        <span key={k} className="schip" style={{
                          fontSize: "11.5px", fontWeight: 500, padding: "3px 9px", borderRadius: 20,
                          background: `color-mix(in srgb, ${v.col} 12%, #fff)`,
                          color: v.col, border: `1px solid color-mix(in srgb, ${v.col} 25%, #fff)`,
                        }}>
                          {v.ic} {v.l} <b style={{ fontWeight: 700 }}>{cnt}</b>
                        </span>
                      );
                    })}
                    {Object.values(s.services).reduce((a, b) => a + b, 0) === 0 && (
                      <span className="schip" style={{ fontSize: "11.5px", fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: "color-mix(in srgb, #aaa 12%, #fff)", color: "#aaa", border: "1px solid color-mix(in srgb, #aaa 25%, #fff)" }}>none</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Fine print ── */}
      <p className="fineprint" style={{ fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.5, margin: "14px 2px 0", fontStyle: "italic" }}>
        &ldquo;Load&rdquo; is an estimate of yearly touchpoints: monthly financials = 12, weekly payroll = 52,
        bi-weekly = 26, quarterly sales tax = 4, plus a flat weight for tax returns, 1099s and renditions.
        Adjust the weights to match how your firm actually scopes effort.
      </p>
    </div>
  );
}

const statcardStyle: React.CSSProperties = {
  flex: 1, minWidth: 120, background: "var(--card)", border: "1px solid var(--line)",
  borderRadius: 13, padding: "13px 16px", boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
};
const panelStyle: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", marginTop: 6,
};
