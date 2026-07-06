"use client";

import { useEffect, useState } from "react";
import type { Client, ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

interface ClientModalProps {
  open: boolean;
  client?: Client | null;
  onClose: () => void;
  onSave: (client: Client | Omit<Client, "id" | "cid">) => void;
}

const STAFF = ["Terry Anderson", "Lindsay", "Misty", "Jill", "Unassigned"];

export default function ClientModal({ open, client, onClose, onSave }: ClientModalProps) {
  const isEdit = !!client;

  const [previewCid] = useState(() => "TP|BS|" + String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0"));

  // ── Form fields ──
  const [name, setName] = useState("");
  const [type, setType] = useState("Business");
  const [group, setGroup] = useState("");
  const [assigned, setAssigned] = useState("Unassigned");
  const [email, setEmail] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [st, setSt] = useState("TX");
  const [zip, setZip] = useState("");

  // ── Service toggles ──
  const [fin, setFin] = useState(false);
  const [pr, setPr] = useState(false);
  const [stx, setStx] = useState(false);
  const [t9, setT9] = useState(false);
  const [rend, setRend] = useState(false);
  const [tax, setTax] = useState(false);
  const [finFreq, setFinFreq] = useState("Monthly");
  const [finMonth, setFinMonth] = useState("1");

  const [prFreq, setPrFreq] = useState("Bi-Weekly A");
  const [prPaydate, setPrPaydate] = useState("");
  const [prPin, setPrPin] = useState("");
  const [prEftps, setPrEftps] = useState("");
  const [prProcessor, setPrProcessor] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showEftps, setShowEftps] = useState(false);
  const [prProcessorOther, setPrProcessorOther] = useState("");
  const [stxFreq, setStxFreq] = useState("Monthly");
  // Sales tax line items
  const [stxLineItems, setStxLineItems] = useState<any[]>([]);
  const [newStxName, setNewStxName] = useState("");
  const [newStxRt, setNewStxRt] = useState("");
  const [newStxTaxId, setNewStxTaxId] = useState("");
  const [newStxBank, setNewStxBank] = useState("");
  const [newStxRouting, setNewStxRouting] = useState("");
  const [newStxAccount, setNewStxAccount] = useState("");
  const [newStxFreq, setNewStxFreq] = useState("Monthly");
  const [t9Count, setT9Count] = useState("");
  const [taxType, setTaxType] = useState("Business");

  // Per-service assigned staff
  const [finAssigned, setFinAssigned] = useState("Unassigned");
  const [prAssigned, setPrAssigned] = useState("Unassigned");
  const [stxAssigned, setStxAssigned] = useState("Unassigned");
  const [t9Assigned, setT9Assigned] = useState("Unassigned");
  const [rendAssigned, setRendAssigned] = useState("Unassigned");
  const [taxAssigned, setTaxAssigned] = useState("Unassigned");

  useEffect(() => {
    if (client) {
      setName(client.name);
      setType(client.type);
      setGroup(client.group || "");
      setAssigned(client.assignedStaff || "Unassigned");
      setEmail((client.emails || [""])[0] || "");
      setAddEmail((client.emails || [])[1] || "");
      setPhone((client.phones || [""])[0] || "");
      setAddPhone((client.phones || [])[1] || "");
      setAddress(client.address || "");
      setCity(client.city || "");
      setSt(client.state || "TX");
      setZip((client as any).zip || "");
      const svcs = client.services || [];
      setFin(svcs.find(s => s.key === "financials")?.enabled || false);
      setPr(svcs.find(s => s.key === "payroll")?.enabled || false);
      setStx(svcs.find(s => s.key === "sales_tax")?.enabled || false);
      setT9(svcs.find(s => s.key === "1099s")?.enabled || false);
      setRend(svcs.find(s => s.key === "renditions")?.enabled || false);
      setTax(svcs.find(s => s.key === "tax_returns")?.enabled || false);
      // Restore service-specific fields
      const finSvc = svcs.find(s => s.key === "financials");
      if (finSvc) { setFinFreq(finSvc.frequency || "Monthly"); setFinMonth(String(finSvc.financialsMonth || 1)); }
      const prSvc = svcs.find(s => s.key === "payroll");
      if (prSvc) { setPrFreq(prSvc.frequency || "Bi-Weekly"); setPrPaydate(prSvc.paydate || ""); setPrPin(prSvc.payrollPassword || ""); setPrEftps(prSvc.eftps || ""); setPrProcessor(prSvc.processor || ""); setPrProcessorOther(prSvc.processorOther || ""); }
      const t9Svc = svcs.find(s => s.key === "1099s");
      if (t9Svc) setT9Count(String(t9Svc.expectedAnnual || ""));
      // Restore sales tax line items
      const stxSvc = svcs.find(s => s.key === "sales_tax");
      if (stxSvc) setStxLineItems(stxSvc.salesTaxLineItems || []);
    } else {
      setName(""); setType("Business"); setGroup(""); setAssigned("Unassigned");
      setEmail(""); setAddEmail(""); setPhone(""); setAddPhone("");
      setAddress(""); setCity(""); setSt("TX"); setZip("");
      setFin(false); setPr(false); setStx(false); setT9(false); setRend(false); setTax(false);
      setFinFreq("Monthly"); setFinMonth("1"); setPrFreq("Bi-Weekly A"); setPrPaydate(""); setPrPin(""); setPrEftps(""); setPrProcessor(""); setPrProcessorOther("");
      setStxFreq("Monthly"); setT9Count(""); setTaxType("Business");
      setStxLineItems([]); setNewStxName(""); setNewStxRt(""); setNewStxTaxId(""); setNewStxBank(""); setNewStxRouting(""); setNewStxAccount(""); setNewStxFreq("Monthly");
      setFinAssigned("Unassigned"); setPrAssigned("Unassigned"); setStxAssigned("Unassigned");
      setT9Assigned("Unassigned"); setRendAssigned("Unassigned"); setTaxAssigned("Unassigned");
    }
  }, [client, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSave() {
    const nm = name.trim();
    if (!nm) return;
    const svcs: any[] = [];
    function addSvc(
      key: ServiceKey, enabled: boolean, frequency: string,
      assignedTo: string, extra?: Record<string, any>
    ) {
      if (!enabled) return;
      svcs.push({
        key, enabled: true, frequency,
        assignedTo: assignedTo || "Unassigned",
        months: Array(12).fill("lock"),
        ...extra,
      });
    }
    // Order: Fin → PR → STX → 1099s → Rend → Tax
    addSvc("financials", fin, finFreq, finAssigned, {
      financialsMonth: finFreq === "Yearly" ? parseInt(finMonth) || 1 : undefined,
    });
    addSvc("payroll", pr, prFreq, prAssigned, {
      paydate: prPaydate || undefined,
      payrollPassword: prPin || undefined,
      eftps: prEftps || undefined,
      processor: prProcessor === "Other" ? (prProcessorOther || "Other") : (prProcessor || undefined),
      financialsMonth: finFreq === "Yearly" ? parseInt(finMonth) || 1 : undefined,
    });
    addSvc("sales_tax", stx, stxFreq, stxAssigned, {
      salesTaxLineItems: stxLineItems.length > 0 ? stxLineItems : undefined,
    });
    addSvc("1099s", t9, "Yearly", t9Assigned, {
      expectedAnnual: t9Count ? parseInt(t9Count) : undefined,
    });
    addSvc("renditions", rend, "Yearly", rendAssigned);
    addSvc("tax_returns", tax, "Yearly", taxAssigned, {
      processor: taxType,
    });

    onSave({
      name: nm, type: type as "Business" | "Personal", status: "active",
      group, assignedStaff: assigned,
      emails: [email, addEmail].filter(Boolean),
      phones: [phone, addPhone].filter(Boolean),
      address, city, state: st,
      services: svcs.length ? svcs : [],
    } as any);
    onClose();
  }

  return (
    <div className="mscrim show" style={{
      position: "fixed", inset: 0, background: "rgba(33,31,26,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 60, padding: 20,
    }} onClick={onClose}>
      <div className="modal" style={{
        background: "var(--paper)", borderRadius: 18, width: 480, maxWidth: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow)",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{
          fontFamily: '"Fraunces",Georgia,serif', fontSize: 22, fontWeight: 600,
          padding: "20px 24px 4px", margin: 0, color: "var(--ink)",
        }}>
          {isEdit ? "Edit client" : "Add a client"}
        </h2>
        <div className="msub" style={{
          color: "var(--muted)", fontSize: 13, padding: "0 24px 14px",
          borderBottom: "1px solid var(--line)",
        }}>
          Fill this once — they&apos;ll appear in the right worklists automatically.
        </div>

        <div className="mform" style={{ padding: "18px 24px" }}>
          {/* CID box */}


          {/* ── Client section ── */}
          <div className="fsect" style={fsectStyle}>Client</div>
          <label style={labelStyle}>Client / entity name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sunrise Holdings LLC" autoFocus />
          <div className="two" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
                <option>Business</option><option>Personal</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Group name</label>
              <input style={inputStyle} value={group} onChange={e => setGroup(e.target.value)} placeholder="e.g. Gambhir" />
            </div>
          </div>
          <label style={labelStyle}>Assigned to</label>
          <select style={inputStyle} value={assigned} onChange={e => setAssigned(e.target.value)}>
            {STAFF.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* ── Contact section ── */}
          <div className="fsect" style={fsectStyle}>Contact</div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com" />
          <label style={labelStyle}>Additional email <span className="opt" style={{ fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <input style={inputStyle} value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="cc@email.com" />
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(713) 555-0100" />
          <label style={labelStyle}>Additional phone <span className="opt" style={{ fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <input style={inputStyle} value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="(713) 555-0200" />
          <label style={labelStyle}>Street address</label>
          <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St." />
          <div className="two" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="Houston" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} value={st} onChange={e => setSt(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ZIP</label>
              <input style={inputStyle} value={zip} onChange={e => setZip(e.target.value)} placeholder="77002" />
            </div>
          </div>

          {/* ── Services section (order: Fin → PR → STX → T9 → Rend → Tax) ── */}
          <div className="fsect" style={fsectStyle}>Services <span className="opt" style={{ fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontFamily: '"Public Sans",sans-serif' }}>— tick what you do for them; details appear as you tick</span></div>

          {/* Financials */}
          <ServiceCard icon="📊" label="Financials" checked={fin} onChange={setFin}>
            <div className="two" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Frequency</label>
                <select style={inputStyle} value={finFreq} onChange={e => setFinFreq(e.target.value)}>
                  <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
                </select>
              </div>
            </div>
            {finFreq === "Yearly" && (
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>Processing month</label>
                <select style={inputStyle} value={finMonth} onChange={e => setFinMonth(e.target.value)}>
                  {["January","February","March","April","May","June",
                    "July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i+1)}>{m}</option>
                  ))}
                </select>
              </div>
            )}
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={finAssigned} onChange={e => setFinAssigned(e.target.value)}>
              {STAFF.map(s => <option key={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Payroll */}
          <ServiceCard icon="💵" label="Payroll" checked={pr} onChange={setPr}>
            <div className="two" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Frequency</label>
                <select style={inputStyle} value={prFreq} onChange={e => setPrFreq(e.target.value)}>
                  <option>Weekly</option><option>Bi-Weekly A</option><option>Bi-Weekly B</option><option>Semi-Monthly</option><option>Monthly</option><option>Quarterly</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Pay date / day</label>
                <input style={inputStyle} value={prPaydate} onChange={e => setPrPaydate(e.target.value)} placeholder="e.g. Friday" />
              </div>
            </div>
            <div className="two" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Payroll PIN</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: 40 }} type={showPin ? "text" : "password"} value={prPin} onChange={e => setPrPin(e.target.value)} placeholder="EFT pin" />
                  <button type="button" onClick={() => setShowPin(v => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: "var(--muted)" }}>
                    {showPin ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>EPTPS Password</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: 40 }} type={showEftps ? "text" : "password"} value={prEftps} onChange={e => setPrEftps(e.target.value)} placeholder="EFTPS password" />
                  <button type="button" onClick={() => setShowEftps(v => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: "var(--muted)" }}>
                    {showEftps ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>Processor</label>
              <select style={inputStyle} value={prProcessor} onChange={e => setPrProcessor(e.target.value)}>
                <option value="">— Select —</option>
                <option>ADP</option>
                <option>Paychex</option>
                <option>Gusto</option>
                <option>QuickBooks</option>
                <option>Paylocity</option>
                <option>OnPay</option>
                <option>Other</option>
              </select>
              {prProcessor === "Other" && (
                <div style={{ marginTop: 6 }}>
                  <label style={labelStyle}>Custom processor name</label>
                  <input style={inputStyle} value={prProcessorOther} onChange={e => setPrProcessorOther(e.target.value)} placeholder="e.g. MyPayrollPro" />
                </div>
              )}
            </div>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={prAssigned} onChange={e => setPrAssigned(e.target.value)}>
              {STAFF.map(s => <option key={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Sales Tax */}
          <ServiceCard icon="🧾" label="Sales Tax" checked={stx} onChange={setStx}>
            <label style={{ ...labelStyle, marginTop: 8 }}>Cadence</label>
            <select style={inputStyle} value={stxFreq} onChange={e => setStxFreq(e.target.value)}>
              <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
            </select>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={stxAssigned} onChange={e => setStxAssigned(e.target.value)}>
              {STAFF.map(s => <option key={s}>{s}</option>)}
            </select>

            {/* Sales tax line items — always visible when Sales Tax is checked */}
            <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <label style={{ ...labelStyle, margin: 0, fontSize: 11, marginBottom: 8, display: "block" }}>Add line item</label>
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name</label>
                    <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxName} onChange={e => setNewStxName(e.target.value)} placeholder="e.g. Texas Sales Tax" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RT</label>
                    <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRt} onChange={e => setNewStxRt(e.target.value)} placeholder="e.g. 123456" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Frequency</label>
                    <select style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxFreq} onChange={e => setNewStxFreq(e.target.value)}>
                      <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
                    </select>
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
                  }}
                >
                  + Add line item
                </button>
              </div>

              {stxLineItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stxLineItems.map((item: any, i: number) => (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
                      background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px",
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{item.serviceName}</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                          <span>{item.frequency || "Monthly"}</span>
                          {item.rt && <span>RT: {item.rt}</span>}
                          {item.taxId && <span>Tax ID: {item.taxId}</span>}
                          {item.bankName && <span>{item.bankName}</span>}
                        </div>
                      </div>
                      <button
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
          </ServiceCard>

          {/* 1099 Filing */}
          <ServiceCard icon="📄" label="1099 Filing" checked={t9} onChange={setT9}>
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>Expected annual count</label>
              <input style={inputStyle} type="number" value={t9Count} onChange={e => setT9Count(e.target.value)} placeholder="e.g. 15" min="0" />
            </div>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={t9Assigned} onChange={e => setT9Assigned(e.target.value)}>
              {STAFF.map(s => <option key={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Renditions */}
          <ServiceCard icon="🏠" label="Renditions (property tax)" checked={rend} onChange={setRend}>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={rendAssigned} onChange={e => setRendAssigned(e.target.value)}>
              {STAFF.map(s => <option key={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Tax Return (last) */}
          <ServiceCard icon="📋" label="Tax Return" checked={tax} onChange={setTax}>
            <label style={{ ...labelStyle, marginTop: 8 }}>Return type</label>
            <select style={inputStyle} value={taxType} onChange={e => setTaxType(e.target.value)}>
              <option>Business</option><option>1040</option><option>1065</option><option>1120</option><option>1120-S</option><option>990</option>
            </select>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={taxAssigned} onChange={e => setTaxAssigned(e.target.value)}>
              {STAFF.map(s => <option key={s}>{s}</option>)}
            </select>
          </ServiceCard>
        </div>

        <div className="mfoot" style={{
          padding: "6px 24px 22px", display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button className="btn alt" onClick={onClose} style={btnStyle(false)}>Cancel</button>
          <button className="btn" onClick={handleSave} style={btnStyle(true)}>
            {isEdit ? "Save changes" : "＋ Add client"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Service card (checkbox toggle → expandable sub) ──
function ServiceCard({ icon, label, checked, onChange, children }: {
  icon: string; label: string; checked: boolean; onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="svccard" style={{
      background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11,
      marginBottom: 8, overflow: "hidden",
    }}>
      <label className="svctop" style={{
        display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
        margin: 0, cursor: "pointer", fontSize: 14, fontWeight: 600,
        color: "var(--ink)", textTransform: "none", letterSpacing: 0,
      }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: "auto" }} />
        <span style={{ fontSize: 16 }}>{icon}</span><span>{label}</span>
      </label>
      {children && (
        <div className={`svcsub${checked ? " open" : ""}`} style={{
          maxHeight: checked ? 400 : 0, opacity: checked ? 1 : 0,
          padding: checked ? "6px 13px 13px" : "0 13px",
          transition: ".18s", background: "#faf7f0",
          borderTop: checked ? "1px solid var(--line)" : "none",
          overflow: "hidden",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Shared styles ──
const fsectStyle: React.CSSProperties = {
  fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 15,
  color: "var(--ink)", margin: "20px 0 6px", paddingBottom: 6,
  borderBottom: "1px solid var(--line)",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)",
  margin: "12px 0 5px", textTransform: "uppercase", letterSpacing: ".04em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid var(--line)",
  borderRadius: 10, font: "inherit", fontSize: 14, background: "var(--card)",
  color: "var(--ink)",
};
const btnStyle = (primary: boolean): React.CSSProperties => ({
  all: "unset", cursor: "pointer",
  background: primary ? "var(--ink)" : "var(--card)",
  color: primary ? "#fff" : "var(--ink)",
  border: primary ? "none" : "1px solid var(--line)",
  padding: "10px 16px", borderRadius: 11,
  fontWeight: 600, fontSize: "13.5px", display: "inline-flex", gap: 7, alignItems: "center",
});
