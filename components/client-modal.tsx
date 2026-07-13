"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, ServiceKey } from "@/lib/types";
import { SERVICE_META, STAFF } from "@/lib/data";

interface ClientModalProps {
  open: boolean;
  client?: Client | null;
  onClose: () => void;
  onSave: (client: Client | Omit<Client, "id" | "cid">) => void;
}

const STAFF_NAMES = [...STAFF.map(s => s.name), "Unassigned"];

const FILING_TYPES = ["C Corp.", "S Corp.", "Partnership", "SMLLC", "Trust", "Non Profit", "Retirem Plan"];

export default function ClientModal({ open, client, onClose, onSave }: ClientModalProps) {
  const isEdit = !!client;

  const [previewCid] = useState(() => "TP|BS|" + String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0"));

  // ── Form fields ──
  const [name, setName] = useState("");
  const [type, setType] = useState<"Business" | "Personal">("Business");
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
  const [clientEin, setClientEin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showEftps, setShowEftps] = useState(false);
  const [prProcessorOther, setPrProcessorOther] = useState("");
  const [prEmails, setPrEmails] = useState<string[]>([]);
  const prEmailInputRef = useRef<HTMLInputElement>(null);
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
  const [newStxAssigned, setNewStxAssigned] = useState("");
  const [t9Count, setT9Count] = useState("");
  const [taxType, setTaxType] = useState("Business");
  const [taxFilingMonth, setTaxFilingMonth] = useState("");
  const [taxFilingState, setTaxFilingState] = useState("");
  const [taxFilingType, setTaxFilingType] = useState("");
  const [taxStateRenewal, setTaxStateRenewal] = useState(false);
  const [taxRenewalState, setTaxRenewalState] = useState("TX");
  const [taxRenewalDueMonth, setTaxRenewalDueMonth] = useState("");
  const [taxRenewalDueDay, setTaxRenewalDueDay] = useState("");
  const [taxRenewalIds, setTaxRenewalIds] = useState("");

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
      if (prSvc) { setPrFreq(prSvc.frequency || "Bi-Weekly A"); setPrPaydate(prSvc.paydate || ""); setPrPin(prSvc.payrollPassword || ""); setPrEftps(prSvc.eftps || ""); setPrProcessor(prSvc.processor || ""); setPrProcessorOther(prSvc.processorOther || ""); setPrEmails(Array.isArray(prSvc.payEmails) ? prSvc.payEmails : []); }
      setClientEin(client.ein || "");
      const t9Svc = svcs.find(s => s.key === "1099s");
      if (t9Svc) setT9Count(String(t9Svc.expectedAnnual || ""));
      // Restore sales tax line items
      const stxSvc = svcs.find(s => s.key === "sales_tax");
      if (stxSvc) setStxLineItems(stxSvc.salesTaxLineItems || []);
      const trSvc = svcs.find(s => s.key === "tax_returns");
      if (trSvc) {
        setTaxFilingMonth(trSvc.filingMonth || "");
        setTaxFilingState(trSvc.filingState || "");
        setTaxFilingType(trSvc.filingType || "");
        setTaxStateRenewal(trSvc.stateRenewal || false);
        setTaxRenewalState(trSvc.renewalState || "TX");
        setTaxRenewalDueMonth(trSvc.renewalDueMonth || "");
        setTaxRenewalDueDay(trSvc.renewalDueDay || "");
        setTaxRenewalIds(trSvc.renewalIdentifiers || "");
      }
    } else {
      setName(""); setType("Business"); setAssigned("Unassigned");
      setEmail(""); setAddEmail(""); setPhone(""); setAddPhone("");
      setAddress(""); setCity(""); setSt("TX"); setZip("");
      setFin(false); setPr(false); setStx(false); setT9(false); setRend(false); setTax(false);
      setFinFreq("Monthly"); setFinMonth("1"); setPrFreq("Bi-Weekly A"); setPrPaydate(""); setPrPin(""); setPrEftps(""); setPrProcessor(""); setPrProcessorOther("");
      setStxFreq("Monthly"); setT9Count(""); setTaxType("Business"); setClientEin("");
      setTaxFilingMonth(""); setTaxFilingState("");
      setTaxFilingType(""); setTaxStateRenewal(false);
      setTaxRenewalState("TX"); setTaxRenewalDueMonth(""); setTaxRenewalDueDay(""); setTaxRenewalIds("");
      setStxLineItems([]); setNewStxName(""); setNewStxRt(""); setNewStxTaxId(""); setNewStxBank(""); setNewStxRouting(""); setNewStxAccount(""); setNewStxFreq("Monthly"); setNewStxAssigned("");
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
      paydate: prPaydate || null,
      payrollPassword: prPin || null,
      eftps: prEftps || null,
      processor: prProcessor || null,
      payEmails: prEmails.length > 0 ? prEmails : undefined,
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
      filingMonth: taxFilingMonth || null,
      filingState: taxFilingState || null,
      filingType: taxFilingType || null,
      stateRenewal: taxStateRenewal || null,
      renewalState: taxStateRenewal ? taxRenewalState : undefined,
      renewalDueMonth: taxStateRenewal ? taxRenewalDueMonth : undefined,
      renewalDueDay: taxStateRenewal ? taxRenewalDueDay : undefined,
      renewalIdentifiers: taxStateRenewal ? taxRenewalIds : undefined,
    });

    onSave({
      name: nm, type: type as "Business" | "Personal", status: "active",
      group: "",
      emails: [email, addEmail].filter(Boolean),
      phones: [phone, addPhone].filter(Boolean),
      address, city, state: st, zip,
      ein: clientEin || null,
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
                <option value="Business">Business</option><option value="Personal">Personal</option>
              </select>
            </div>
          </div>

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
              <select style={inputStyle} value={st} onChange={e => setSt(e.target.value)}>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ZIP</label>
              <input style={inputStyle} value={zip} onChange={e => setZip(e.target.value)} placeholder="77002" />
            </div>
          </div>
          <label style={labelStyle}>EIN Number <span className="opt" style={{ fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <input style={inputStyle} value={clientEin} onChange={e => setClientEin(e.target.value)} placeholder="e.g. XX-XXXXXXX" />

          {/* ── Services section (order: Fin → PR → STX → T9 → Rend → Tax) ── */}
          <div className="fsect" style={fsectStyle}>Services <span className="opt" style={{ fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontFamily: '"Public Sans",sans-serif' }}>— tick what you do for them; details appear as you tick</span></div>

          {/* Financials */}
          <ServiceCard icon="📊" label="Financials" checked={fin} onChange={setFin}>
            <div className="two" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Frequency</label>
                <select style={inputStyle} value={finFreq} onChange={e => setFinFreq(e.target.value)}>
                  <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Yearly">Yearly</option>
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
              {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Payroll */}
          <ServiceCard icon="💵" label="Payroll" checked={pr} onChange={setPr}>
            <div className="two" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Frequency</label>
                <select style={inputStyle} value={prFreq} onChange={e => setPrFreq(e.target.value)}>
                  <option value="Weekly">Weekly</option><option value="Bi-Weekly A">Bi-Weekly A</option><option value="Bi-Weekly B">Bi-Weekly B</option><option value="Semi-Monthly">Semi-Monthly</option><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Pay date / day</label>
                <select style={inputStyle} value={prPaydate} onChange={e => setPrPaydate(e.target.value)}>
                  <option value="">-</option>
                  <option value="Fridays">Fridays</option>
                  <option value="Saturdays">Saturdays</option>
                  <option value="Thursdays">Thursdays</option>
                  <option value="5th/20th">5th/20th</option>
                  <option value="15th & EOM">15th & EOM</option>
                  <option value="15th/EOM">15th/EOM</option>
                  <option value="16th/EOM">16th/EOM</option>
                  <option value="EOM">EOM</option>
                  <option value="25th">25th</option>
                </select>
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
                <option value="Quickbooks Desktop 24">Quickbooks Desktop 24</option>
                <option value="Quickbooks Desktop">Quickbooks Desktop</option>
                <option value="ADP">ADP</option>
                <option value="QBO">QBO</option>
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>Payroll Emails</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff", minHeight: 30 }}>
                  {prEmails.map((em, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "var(--blue-soft)", color: "var(--blue)", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                      {em}
                      <button type="button" onClick={() => setPrEmails(prev => prev.filter((_, j) => j !== i))} style={{ all: "unset", cursor: "pointer", lineHeight: 1, fontSize: 13, marginLeft: 1, opacity: 0.7 }}>×</button>
                    </span>
                  ))}
                  <div style={{ display: "flex", flex: 1, minWidth: 100, alignItems: "center", gap: 4 }}>
                    <input
                      ref={prEmailInputRef}
                      style={{ border: "none", outline: "none", fontSize: 12, flex: 1, background: "transparent" }}
                      placeholder="Type email + Enter"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !prEmails.includes(val)) setPrEmails(prev => [...prev, val]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    <button type="button"
                      onClick={() => {
                        const inp = prEmailInputRef.current as HTMLInputElement | null;
                        if (!inp) return;
                        const val = inp.value.trim();
                        if (val && !prEmails.includes(val)) setPrEmails(prev => [...prev, val]);
                        inp.value = "";
                        inp.focus();
                      }}
                      style={{ all: "unset", cursor: "pointer", padding: "2px 8px", background: "var(--ink)", color: "#fff", borderRadius: 6, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</button>
                  </div>
              </div>
            </div>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={prAssigned} onChange={e => setPrAssigned(e.target.value)}>
              {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Sales Tax */}
          <ServiceCard icon="🧾" label="Sales Tax" checked={stx} onChange={setStx}>
            <label style={{ ...labelStyle, marginTop: 8 }}>Cadence</label>
            <select style={inputStyle} value={stxFreq} onChange={e => setStxFreq(e.target.value)}>
              <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Yearly">Yearly</option>
            </select>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={stxAssigned} onChange={e => setStxAssigned(e.target.value)}>
              {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Sales tax line items — always visible when Sales Tax is checked */}
            <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <label style={{ ...labelStyle, margin: 0, fontSize: 11, marginBottom: 8, display: "block" }}>Add line item</label>
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name <span style={{ color: "var(--red,#e74c3c)" }}>*</span></label>
                    <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxName} onChange={e => setNewStxName(e.target.value)} placeholder="e.g. Texas Sales Tax" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RT <span style={{ color: "var(--red,#e74c3c)" }}>*</span></label>
                    <input style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRt} onChange={e => setNewStxRt(e.target.value)} placeholder="e.g. 123456" />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Frequency</label>
                    <select style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxFreq} onChange={e => setNewStxFreq(e.target.value)}>
                      <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Tax ID <span style={{ color: "var(--red,#e74c3c)" }}>*</span></label>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Assigned to</label>
                    <select style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }}
                      value={newStxAssigned} onChange={e => setNewStxAssigned(e.target.value)}>
                      <option value="">—</option>
                      {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  disabled={!newStxName.trim() || !newStxRt.trim() || !newStxTaxId.trim()}
                  style={{
                    all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13,
                    background: (!newStxName.trim() || !newStxRt.trim() || !newStxTaxId.trim()) ? "var(--line,#d8d2c4)" : "var(--ink)",
                    color: (!newStxName.trim() || !newStxRt.trim() || !newStxTaxId.trim()) ? "var(--muted,#aaa)" : "#fff",
                  }}
                  onClick={() => {
                    setStxLineItems(prev => [...prev, {
                      serviceName: newStxName.trim(), rt: newStxRt.trim(), taxId: newStxTaxId.trim(),
                      bankName: newStxBank.trim(), bankRouting: newStxRouting.trim(), bankAccount: newStxAccount.trim(),
                      assignedTo: newStxAssigned,
                      frequency: newStxFreq,
                    }]);
                    setNewStxName(""); setNewStxRt(""); setNewStxTaxId(""); setNewStxBank("");
                    setNewStxRouting(""); setNewStxAccount(""); setNewStxFreq("Monthly"); setNewStxAssigned("");
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
                          {item.assignedTo && <span>👤 {item.assignedTo}</span>}
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
              {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Renditions */}
          <ServiceCard icon="🏠" label="Renditions (property tax)" checked={rend} onChange={setRend}>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={rendAssigned} onChange={e => setRendAssigned(e.target.value)}>
              {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </ServiceCard>

          {/* Tax Return (last) */}
          <ServiceCard icon="📋" label="Tax Return" checked={tax} onChange={setTax}>
            <label style={{ ...labelStyle, marginTop: 8 }}>Filing type</label>
            <select style={inputStyle} value={taxFilingType} onChange={e => setTaxFilingType(e.target.value)}>
              {FILING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ ...labelStyle, marginTop: 8 }}>Assigned to</label>
            <select style={inputStyle} value={taxAssigned} onChange={e => setTaxAssigned(e.target.value)}>
              {STAFF_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="two" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Filing Month</label>
                <select style={inputStyle} value={taxFilingMonth} onChange={e => setTaxFilingMonth(e.target.value)}>
                  <option value="">—</option>
                  {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginTop: 8 }}>Filing State</label>
                <select style={inputStyle} value={taxFilingState} onChange={e => setTaxFilingState(e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
            {/* State renewal */}
            <label style={{ ...labelStyle, marginTop: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={taxStateRenewal} onChange={e => setTaxStateRenewal(e.target.checked)} style={{ width: "auto" }} />
              State renewal
            </label>
            {taxStateRenewal && (
              <>
                <div className="two" style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, marginTop: 8 }}>STATE</label>
                    <select style={inputStyle} value={taxRenewalState} onChange={e => setTaxRenewalState(e.target.value)}>
                      <option value="">—</option>
                      {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, marginTop: 8 }}>Due Month</label>
                    <select style={inputStyle} value={taxRenewalDueMonth} onChange={e => setTaxRenewalDueMonth(e.target.value)}>
                      <option value="">—</option>
                      {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, marginTop: 8 }}>Due Day</label>
                    <input style={inputStyle} type="number" value={taxRenewalDueDay} onChange={e => setTaxRenewalDueDay(e.target.value)} placeholder="1-31" min="1" max="31" />
                  </div>
                </div>
                <label style={{ ...labelStyle, marginTop: 8 }}>Identifying Numbers</label>
                <input style={inputStyle} value={taxRenewalIds} onChange={e => setTaxRenewalIds(e.target.value)} placeholder="e.g. EIN, state IDs" />
              </>
            )}
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
          maxHeight: checked ? 9999 : 0, opacity: checked ? 1 : 0,
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

// ── Shared constants ──
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

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
