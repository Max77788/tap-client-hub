"use client";

import { useEffect, useRef, useState } from "react";
import type { Client } from "@/lib/types";
import { SERVICE_META, STAFF } from "@/lib/data";

// ── Stage display for month tracking in the slideover ──
const UNIFIED_STAGES = [
  { k: "ip", t: "•", cls: "prog", l: "In progress" },
  { k: "wc", t: "⏳", cls: "wait", l: "Waiting on client" },
  { k: "pp", t: "✓", cls: "prep", l: "Prepared" },
  { k: "dn", t: "✓", cls: "done", l: "Done" },
];
const NA_STAGE = { k: "na", t: "–", cls: "na", l: "N/A" };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STAGE_STYLES: Record<string, { bg: string; fg: string; border: string; cls: string; label: string }> = {
  "":   { bg: "transparent", fg: "#c2c8d4", border: "transparent", cls: "lock", label: "Not due" },
  ip:   { bg: "var(--blue-soft)", fg: "var(--blue)", border: "#bcd0e2", cls: "prog", label: "In progress" },
  wc:   { bg: "var(--amber-soft)", fg: "var(--amber)", border: "#e8d3a6", cls: "wait", label: "Waiting on client" },
  pp:   { bg: "var(--teal-soft)", fg: "var(--teal-ink)", border: "#c5d0ec", cls: "prep", label: "Prepared" },
  dn:   { bg: "var(--green-soft)", fg: "var(--green)", border: "#bcdcc6", cls: "done", label: "Done" },
  na:   { bg: "var(--red-soft)", fg: "var(--red)", border: "#e8c4bf", cls: "na", label: "N/A" },
};

const svcMeta: Record<string, { label: string; ic: string; bg: string }> = {
  financials:  { label: "Financials", ic: "📊", bg: "var(--green-soft)" },
  payroll:     { label: "Payroll", ic: "💵", bg: "var(--blue-soft)" },
  sales_tax:   { label: "Sales Tax", ic: "🧾", bg: "var(--amber-soft)" },
  tax_returns: { label: "Tax Return", ic: "📋", bg: "#ece7f3" },
  "1099s":     { label: "1099 Filing", ic: "📄", bg: "#f0e8e2" },
  renditions:  { label: "Renditions", ic: "🏠", bg: "#e7eee8" },
};
const svcLabel = (k: string) => svcMeta[k]?.label || k;
const svcIc = (k: string) => svcMeta[k]?.ic || "📋";
const svcBg = (k: string) => svcMeta[k]?.bg || "var(--teal-soft)";

interface ClientSlideoverProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  onSave?: (client: Client) => void;
  onDelete?: (clientId: string) => void;
}

export default function ClientSlideover({ client, open, onClose, onSave, onDelete }: ClientSlideoverProps) {
  const [editing, setEditing] = useState(false);
  const [localSvcs, setLocalSvcs] = useState<any[]>(client.services);

  // Sales tax line items state
  const [stxLineItems, setStxLineItems] = useState<any[]>([]);
  const [addingStx, setAddingStx] = useState(false);
  const [newStxName, setNewStxName] = useState("");
  const [newStxRt, setNewStxRt] = useState("");
  const [newStxTaxId, setNewStxTaxId] = useState("");
  const [newStxBank, setNewStxBank] = useState("");
  const [newStxRouting, setNewStxRouting] = useState("");
  const [newStxAccount, setNewStxAccount] = useState("");
  const [newStxFreq, setNewStxFreq] = useState("Monthly");
  useEffect(() => {
    setLocalSvcs(client.services);
    setEditing(false);
    // Initialize per-service assignees for edit view
    const assigneeMap: Record<string, string> = {};
    client.services.forEach((s: any) => {
      assigneeMap[s.key] = s.processor || s.assignedTo || "Unassigned";
    });
    setESvcAssignees(assigneeMap);
    // Load existing sales tax line items
    const stxSvc = client.services.find((s: any) => s.key === "sales_tax");
    setStxLineItems(stxSvc?.salesTaxLineItems || []);
  }, [client]);

  // ── Edit view state (declared here to obey Rules of Hooks — never conditional) ──
  const [eName, setEName] = useState(client.name);
  const [eType, setEType] = useState(client.type);
  const [eGroup, setEGroup] = useState(client.group);
  const [eEmail, setEEmail] = useState((client.emails || [""])[0] || "");
  const [eAddEmail, setEAddEmail] = useState((client.emails || [])[1] || "");
  const [ePhone, setEPhone] = useState((client.phones || [""])[0] || "");
  const [eAddPhone, setEAddPhone] = useState((client.phones || [])[1] || "");
  const [eAddress, setEAddress] = useState(client.address);
  const [eCity, setECity] = useState(client.city);
  const [eState, setEState] = useState(client.state);
  const [eZip, setEZip] = useState((client as any).zip || "");
  const [eAssigned, setEAssigned] = useState(client.assignedStaff || "Unassigned");
  const [eSvcAssignees, setESvcAssignees] = useState<Record<string, string>>({});

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) { document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; }
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  const c = client;
  const typeBadge = c.type === "Business"
    ? { bg: "var(--ink)", fg: "#fff" }
    : { bg: "#dfe7e6", fg: "var(--teal-ink)" };

  // Unique assignees
  const assignees = [...new Set(
    localSvcs.filter((s: any) => s.enabled).map((s: any) => s.processor || s.assignedTo).filter(Boolean)
  )];

  function toggleSvc(key: string) {
    const updated = localSvcs.map((s: any) =>
      s.key === key ? { ...s, enabled: !s.enabled, months: s.enabled ? Array(12).fill("lock") : s.months } : s
    );
    setLocalSvcs(updated);
    // Persist immediately
    onSave?.({ ...client, services: updated });
  }

  function freqLabel(key: string, svc: any) {
    if (!svc.enabled) return "off";
    if (key === "financials") return (svc.frequency || "Monthly") + " · in Financials list";
    if (key === "payroll") return (svc.frequency || "Bi-Weekly") + " · " + (svc.processor || "-");
    if (key === "sales_tax") return (svc.frequency || "Monthly") + " · in Sales Tax list";
    if (key === "tax_returns") return svc.frequency || "Business";
    if (key === "1099s") return "in 1099 worklist";
    if (key === "renditions") return "in renditions worklist";
    return "";
  }

  // Month tracking for a service - show month-by-month cells
  function monthCells(svcKey: string) {
    const svc = localSvcs.find((s: any) => s.key === svcKey);
    if (!svc?.enabled) return null;
    const stages = svc.months || [];
    const now = new Date().getMonth();
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {MONTHS.map((mo, i) => {
          const stage = (stages[i] || "") as string;
          const style = STAGE_STYLES[stage] || STAGE_STYLES[""];
          const t = stage === "" ? "·" : stage === "ip" ? "•" : stage === "wc" ? "⏳" : stage === "pp" ? "✓" : stage === "dn" ? "✓" : stage === "na" ? "–" : "";
          const delayed = stage !== "" && stage !== "dn" && stage !== "na" && i < now;
          return (
            <div key={mo} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{mo}</div>
              <div
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: `1px solid ${delayed ? "var(--red)" : style.border}`,
                  background: style.bg,
                  color: style.fg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto", fontWeight: 700, fontSize: 14, userSelect: "none",
                  boxShadow: delayed ? "0 0 0 2px var(--red)" : "none",
                }}
                title={`${mo} — ${delayed ? "DELAYED · " : ""}${style.label}`}
              >
                {t}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Non-edit view ──
  if (!editing) {
    return (
      <>
        <div className="scrim show" onClick={onClose} />
        <div className="over show" style={{
          background: "var(--paper)", boxShadow: "-12px 0 40px rgba(33,31,26,.18)",
        }}>
          {/* Header */}
          <div className="ohead" style={{
            padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", background: "var(--card)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div className="nm" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 23, lineHeight: 1.12 }}>{c.name}</div>
              <button className="ox" onClick={onClose} style={{ all: "unset", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1 }}>×</button>
            </div>
            <div className="sub" style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>
              <span className="mono" style={{ color: "#9a9484" }}>{c.cid || `CID-${c.id}`}</span>{" "}
              <span className="badge b-biz" style={{
                fontSize: "10.5px", fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: typeBadge.bg, color: typeBadge.fg,
              }}>{c.type === "Business" ? "BIZ" : "PERS"}</span>
              {" "}{c.group || "—"} · handled by <b style={{ color: "var(--ink)", fontWeight: 600 }}>{assignees.length ? assignees.join(", ") : "—"}</b>
            </div>
          </div>

          {/* Body */}
          <div className="obody" style={{ overflowY: "auto", padding: "20px 24px 30px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="sect" style={{ marginTop: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Everything about this client
              </div>
              <button className="reveal" onClick={() => setEditing(true)} style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600, fontSize: "12.5px" }}>
                ✎ Edit details
              </button>
            </div>

            {/* Info fields */}
            <div className="field" style={fieldStyle}><span className="k" style={{ color: "var(--muted)" }}>Client ID</span><span className="v mono" style={{ textAlign: "right", fontWeight: 500 }}>{c.cid || `CID-${c.id}`}</span></div>
            <div className="field" style={fieldStyle}><span className="k" style={{ color: "var(--muted)" }}>Group / Owner</span><span className="v" style={{ textAlign: "right", fontWeight: 500 }}>{c.group || "—"}</span></div>
            {(c.emails || []).filter(Boolean).map((email, i) => (
              <div key={`e${i}`} className="field" style={fieldStyle}>
                <span className="k" style={{ color: "var(--muted)" }}>{i === 0 ? "Email" : "Additional email"}</span>
                <span className="v" style={{ textAlign: "right", fontWeight: 500 }}>{email}</span>
              </div>
            ))}
            <div className="field" style={fieldStyle}><span className="k" style={{ color: "var(--muted)" }}>Phone</span><span className="v mono" style={{ textAlign: "right", fontWeight: 500 }}>{(c.phones || []).filter(Boolean).join(", ") || "—"}</span></div>
            <div className="field" style={fieldStyle}><span className="k" style={{ color: "var(--muted)" }}>Address</span><span className="v" style={{ textAlign: "right", fontWeight: 500 }}>{c.address || "—"}</span></div>
            <div className="field" style={fieldStyle}><span className="k" style={{ color: "var(--muted)" }}>Location</span><span className="v" style={{ textAlign: "right", fontWeight: 500 }}>{c.city}, {c.state}</span></div>
            <div className="field" style={fieldStyle}><span className="k" style={{ color: "var(--muted)" }}>Type</span><span className="v" style={{ textAlign: "right", fontWeight: 500 }}>{c.type}</span></div>

            {/* Who's assigned per service */}
            <div className="sect" style={sectStyle}>Who&apos;s assigned — per service</div>
            {localSvcs.filter((s: any) => s.enabled).map((svc: any) => (
              <div key={svc.key} className="field" style={fieldStyle}>
                <span className="k" style={{ color: "var(--muted)" }}>{svcLabel(svc.key)}</span>
                <span className="v" style={{ textAlign: "right", fontWeight: 500 }}>{svc.processor || svc.assignedTo || "—"}</span>
              </div>
            ))}

            {/* Services — flip on/off */}
            <div className="sect" style={sectStyle}>Services — flip on/off, no formulas</div>
            {localSvcs.map((svc: any) => (
              <div key={svc.key} className="svc" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 13px",
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 8,
              }}>
                <div className="si" style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: svcBg(svc.key) }}>
                  {svcIc(svc.key)}
                </div>
                <div className="st" style={{ flex: 1 }}>
                  <div className="t" style={{ fontWeight: 600, fontSize: 14 }}>{svcLabel(svc.key)}</div>
                  <div className="d" style={{ fontSize: 12, color: "var(--muted)" }}>{freqLabel(svc.key, svc)}</div>
                </div>
                <div
                  className={`sw ${svc.enabled ? "on" : ""}`}
                  onClick={() => toggleSvc(svc.key)}
                  style={{
                    width: 46, height: 27, borderRadius: 20,
                    background: svc.enabled ? "var(--teal)" : "#d8d2c4",
                    position: "relative", cursor: "pointer", transition: ".16s", flex: "0 0 auto",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: svc.enabled ? 22 : 3, width: 21, height: 21,
                    borderRadius: "50%", background: "#fff", transition: ".16s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                  }} />
                </div>
              </div>
            ))}

            {/* Sales Tax — line items */}
            {localSvcs.find((s: any) => s.key === "sales_tax")?.enabled && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="sect" style={{ ...sectStyle, margin: 0 }}>Sales Tax · line items</div>
                  <button
                    onClick={() => setAddingStx(!addingStx)}
                    className="reveal"
                    style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600, fontSize: "12.5px" }}
                  >
                    {addingStx ? "Cancel" : "＋ Add line item"}
                  </button>
                </div>

                {addingStx && (
                  <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name</label>
                        <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxName} onChange={e => setNewStxName(e.target.value)} placeholder="e.g. Texas Sales Tax" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Frequency</label>
                        <select style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxFreq} onChange={e => setNewStxFreq(e.target.value)}>
                          <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RT #</label>
                        <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRt} onChange={e => setNewStxRt(e.target.value)} placeholder="e.g. 123456" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Tax ID</label>
                        <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxTaxId} onChange={e => setNewStxTaxId(e.target.value)} placeholder="e.g. 74-1234567" />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Bank name</label>
                        <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxBank} onChange={e => setNewStxBank(e.target.value)} placeholder="e.g. Chase" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Routing #</label>
                        <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRouting} onChange={e => setNewStxRouting(e.target.value)} placeholder="e.g. 111000025" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Account #</label>
                        <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxAccount} onChange={e => setNewStxAccount(e.target.value)} placeholder="e.g. 123456789" />
                      </div>
                    </div>
                    <button
                      className="reveal"
                      style={{ all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff", padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                      onClick={() => {
                        if (!newStxName.trim()) return;
                        setStxLineItems(prev => [...prev, {
                          serviceName: newStxName.trim(), rt: newStxRt.trim(), taxId: newStxTaxId.trim(),
                          bankName: newStxBank.trim(), bankRouting: newStxRouting.trim(), bankAccount: newStxAccount.trim(),
                          frequency: newStxFreq,
                        }]);
                        setNewStxName(""); setNewStxRt(""); setNewStxTaxId(""); setNewStxBank("");
                        setNewStxRouting(""); setNewStxAccount(""); setNewStxFreq("Monthly");
                        setAddingStx(false);
                      }}
                    >
                      Add line item
                    </button>
                  </div>
                )}

                {stxLineItems.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stxLineItems.map((item: any, i: number) => (
                      <div key={i} style={{
                        display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
                        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.serviceName}</div>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
                            <span>{item.frequency || "Monthly"}</span>
                            {item.rt && <span>RT: {item.rt}</span>}
                            {item.taxId && <span>Tax ID: {item.taxId}</span>}
                            {item.bankName && <span>{item.bankName} {item.bankRouting && `· ${item.bankRouting}`} {item.bankAccount && `· ${item.bankAccount}`}</span>}
                          </div>
                        </div>
                        <button
                          className="reveal"
                          style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: 12 }}
                          onClick={() => setStxLineItems(prev => prev.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Per-service month tracking */}
            {localSvcs.filter((s: any) => s.enabled && ["financials","payroll","sales_tax","renditions"].includes(s.key)).map((svc: any) => {
              const stages = svc.months || [];
              const leg = UNIFIED_STAGES.map(s => (
                <span key={s.k} className="lgd" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: STAGE_STYLES[s.k]?.fg }}></i>
                  {s.l}
                </span>
              ));
              return (
                <div key={svc.key}>
                  <div className="sect" style={sectStyle}>
                    {svcLabel(svc.key)} · {svc.frequency} · <span style={{ color: "var(--muted)", fontWeight: 500 }}>{svc.processor || svc.assignedTo || "—"}</span>
                  </div>
                  <div className="legend" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
                    {leg}
                    <span className="lgd" style={{ display: "flex", alignItems: "center", gap: 6 }}><i style={{ width: 11, height: 11, borderRadius: 3, display: "inline-block", background: "var(--red)" }}></i>N/A</span>
                  </div>
                  {monthCells(svc.key)}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="ofoot" style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", background: "var(--card)", display: "flex", gap: 10 }}>
            <button className="danger" onClick={() => { onDelete?.(c.id); onClose(); }} style={{
              all: "unset", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: "13.5px",
              padding: "10px 14px", border: "1px solid var(--red-soft)", borderRadius: 11, background: "var(--red-soft)",
            }}>
              Remove client
            </button>
            <div style={{ flex: 1 }}></div>
            <button className="btn alt" onClick={onClose} style={{
              all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)",
              border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11,
              fontWeight: 600, fontSize: "13.5px", display: "inline-flex", gap: 7, alignItems: "center",
            }}>
              Done
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Edit view ──

  function saveEdit() {
    const nm = eName.trim();
    if (!nm) return;
    // Merge line items into sales tax service and per-service assignees
    const updatedSvcs = localSvcs.map((s: any) => {
      let updated = s;
      if (s.key === "sales_tax") {
        updated = { ...s, salesTaxLineItems: stxLineItems };
      }
      // Apply per-service assignee change
      const newAssignee = eSvcAssignees[s.key];
      if (newAssignee && newAssignee !== "Unassigned") {
        updated = { ...updated, processor: newAssignee, assignedTo: newAssignee };
      } else if (newAssignee === "Unassigned") {
        updated = { ...updated, processor: "", assignedTo: "" };
      }
      return updated;
    });
    onSave?.({
      ...c,
      name: nm, type: eType as "Business" | "Personal", group: eGroup,
      emails: [...new Set([eEmail, eAddEmail].filter(Boolean))], phones: [ePhone, eAddPhone].filter(Boolean),
      address: eAddress, city: eCity, state: eState, zip: eZip,
      assignedStaff: eAssigned,
      services: updatedSvcs,
    } as Client);
    setEditing(false);
  }

  return (
    <>
      <div className="scrim show" onClick={() => setEditing(false)} />
      <div className="over show" style={{
        background: "var(--paper)", boxShadow: "-12px 0 40px rgba(33,31,26,.18)",
      }}>
        {/* Header */}
        <div className="ohead" style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", background: "var(--card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div className="nm" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 23, lineHeight: 1.12 }}>Edit client</div>
            <button className="ox" onClick={() => setEditing(false)} style={{ all: "unset", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1 }}>×</button>
          </div>
          <div className="sub" style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>
            <span className="mono" style={{ color: "#9a9484" }}>{c.cid || `CID-${c.id}`}</span> · changes save instantly, no formulas
          </div>
        </div>

        {/* Body */}
        <div className="obody" style={{ overflowY: "auto", padding: "20px 24px 30px", flex: 1 }}>
          <label className="el" style={elStyle}>Client / entity name</label>
          <input className="ef" style={efStyle} value={eName} onChange={e => setEName(e.target.value)} placeholder={c.name} />

          <div className="two-ef" style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="el" style={elStyle}>Type</label>
              <select className="ef" style={efStyle} value={eType} onChange={e => setEType(e.target.value as any)}>
                <option>Business</option><option>Personal</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="el" style={elStyle}>Assigned to</label>
              <select className="ef" style={efStyle} value={eAssigned} onChange={e => setEAssigned(e.target.value)}>
                {["Terry Anderson", "Lindsay", "Misty", "Jill", "Tushar", "Sam", "Amruta", "Sanket", "Lizette", "Shilpa", "Janeth", "LB", "Alvarez", "Sandeep", "Shelpa", "Valerie", "Unassigned"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <label className="el" style={elStyle}>Group / owner</label>
          <input className="ef" style={efStyle} value={eGroup} onChange={e => setEGroup(e.target.value)} placeholder="e.g. Gambhir" />

          <label className="el" style={elStyle}>Email</label>
          <input className="ef" style={efStyle} value={eEmail} onChange={e => setEEmail(e.target.value)} placeholder="client@email.com" />

          <label className="el" style={elStyle}>Additional email</label>
          <input className="ef" style={efStyle} value={eAddEmail} onChange={e => setEAddEmail(e.target.value)} placeholder="optional" />

          <label className="el" style={elStyle}>Phone</label>
          <input className="ef" style={efStyle} value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="(713) 555-0100" />

          <label className="el" style={elStyle}>Additional phone <span style={{ fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontFamily: '"Public Sans",sans-serif', fontSize: 11 }}>(optional)</span></label>
          <input className="ef" style={efStyle} value={eAddPhone} onChange={e => setEAddPhone(e.target.value)} placeholder="(713) 555-0200" />

          <label className="el" style={elStyle}>Street address</label>
          <input className="ef" style={efStyle} value={eAddress} onChange={e => setEAddress(e.target.value)} placeholder="123 Main St." />

          <div className="two-ef" style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}>
              <label className="el" style={elStyle}>City</label>
              <input className="ef" style={efStyle} value={eCity} onChange={e => setECity(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="el" style={elStyle}>State</label>
              <input className="ef" style={efStyle} value={eState} onChange={e => setEState(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="el" style={elStyle}>ZIP</label>
              <input className="ef" style={efStyle} value={eZip} onChange={e => setEZip(e.target.value)} />
            </div>
          </div>

          {/* Per-service assignee editing - only for enabled services */}
          <div className="sect" style={{ ...sectStyle, marginTop: 24 }}>Per-service assignee</div>
          {localSvcs.filter((svc: any) => svc.enabled).map((svc: any) => (
            <div key={svc.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, background: svcBg(svc.key), flex: "0 0 auto",
              }}>{svcIc(svc.key)}</span>
              <label style={{ flex: "0 0 100px", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                {svcLabel(svc.key)}
              </label>
              <select
                className="ef"
                style={{ ...efStyle, flex: 1, padding: "7px 9px", fontSize: 13 }}
                value={eSvcAssignees[svc.key] || "Unassigned"}
                onChange={e => setESvcAssignees(prev => ({ ...prev, [svc.key]: e.target.value }))}
              >
                {STAFF.map(m => <option key={m.name}>{m.name}</option>)}
                <option>Unassigned</option>
              </select>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="ofoot" style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", background: "var(--card)", display: "flex", gap: 10 }}>
          <button className="btn alt" onClick={() => setEditing(false)} style={{
            all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)",
            border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11,
            fontWeight: 600, fontSize: "13.5px", display: "inline-flex", gap: 7, alignItems: "center",
          }}>
            Cancel
          </button>
          <div style={{ flex: 1 }}></div>
          <button className="btn" onClick={saveEdit} style={{
            all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff",
            padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px",
            display: "inline-flex", gap: 7, alignItems: "center",
          }}>
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}

// ── Shared styles ──
const fieldStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", gap: 14,
  padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3",
};
const sectStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--muted)", margin: "22px 0 10px",
};
const elStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
  color: "var(--muted)", margin: "12px 0 4px", display: "block",
};
const efStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9,
  font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
};
