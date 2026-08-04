"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Ladder = { rung: number; label: string; trigger_days: number; auto_send: boolean; channel: string; subject?: string; body?: string; active?: boolean };
type Invoice = { id: string; client_name: string; invoice_number: string; due_date: string; amount: number; amount_paid: number; balance: number; status: string; days_past_due: number; current_rung: number; latest_action?: string | null; latest_rung?: number | null };
type LensData = { mode: "live" | "setup_required"; invoices: Invoice[]; ladder: Ladder[]; clients: { id: string; name: string }[]; migration?: string };

const defaultLadder: Ladder[] = [
  { rung: 1, label: "Friendly reminder", trigger_days: 10, auto_send: true, channel: "email" },
  { rung: 2, label: "Professional notice", trigger_days: 20, auto_send: true, channel: "email" },
  { rung: 3, label: "Formal demand", trigger_days: 30, auto_send: true, channel: "email" },
  { rung: 4, label: "Owner escalation", trigger_days: 31, auto_send: false, channel: "call" },
  { rung: 5, label: "Formal letter", trigger_days: 45, auto_send: false, channel: "letter" },
];
const modules = [
  ["Clients & Services", "Every client, every service, one assignee - the source of truth."],
  ["Client 360", "One client: services, time, cost, revenue and margin."],
  ["Collections", "The five-touch ladder that chases AR with firm guardrails."],
  ["Team & Capacity", "See who's at capacity before burnout - scale 950 to 2,000."],
  ["Front Desk", "Answers calls, handles questions, transfers, books appointments."],
];
const rungName = (rung: number) => ["Current", "Friendly", "Professional", "Firm", "Owner escalation", "Formal letter"][rung] || "Current";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value || 0);

export default function LensPage() {
  const [data, setData] = useState<LensData | null>(null);
  const [view, setView] = useState<"home" | "collections">("home");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ladder, setLadder] = useState<Ladder[]>(defaultLadder);
  const [invoice, setInvoice] = useState({ client_id: "", invoice_number: "", invoice_date: "", due_date: "", amount: "" });

  async function load() {
    setLoading(true);
    const response = await fetch("/api/lens/collections", { cache: "no-store" });
    if (!response.ok) { setMessage("Collections could not be loaded."); setLoading(false); return; }
    const next = await response.json() as LensData;
    setData(next); setLadder(next.ladder.length ? next.ladder : defaultLadder); setLoading(false);
  }
  useEffect(() => {
    // Defer the initial request so React's effect rule does not treat its loading
    // state update as a synchronous render cascade.
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 3800); return () => clearTimeout(timer); }, [message]);

  const totals = useMemo(() => {
    const rows = data?.invoices || [];
    return { outstanding: rows.reduce((sum, row) => sum + Number(row.balance), 0), overdue: rows.filter(row => row.days_past_due > 0).length, approvals: rows.filter(row => row.current_rung >= 4).length };
  }, [data]);

  async function addInvoice(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/lens/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_invoice", invoice: { ...invoice, amount: Number(invoice.amount) } }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not add invoice."); return; }
    setShowNew(false); setInvoice({ client_id: "", invoice_number: "", invoice_date: "", due_date: "", amount: "" }); setMessage("Invoice added to Collections."); void load();
  }
  async function logAction(invoiceId: string, rung: number) {
    if (data?.mode !== "live") { setMessage("Demo preview only until the Collections migration is applied."); return; }
    const response = await fetch("/api/lens/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "log_action", invoiceId, rung }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not record the touch."); return; }
    setMessage(rung >= 4 ? "Approval recorded. No external communication was sent." : "Collection touch recorded. Delivery automation is intentionally not enabled in v1."); void load();
  }
  async function saveLadder() {
    if (data?.mode !== "live") { setMessage("Demo preview only until the Collections migration is applied."); return; }
    const response = await fetch("/api/lens/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_ladder", ladder }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not save guardrails."); return; }
    setShowSettings(false); setMessage("Collections guardrails saved."); void load();
  }

  return <div className="lens">
    <style>{styles}</style>
    <header className="lens-top"><button className="brand" onClick={() => setView("home")}>TAP Lens <small>ASSOCIATES, LLC · EST. 1999</small></button><div className="owner">Tushar Patil, CPA · Owner<br /><span>Operational intelligence · v1</span></div></header>
    <nav className="lens-nav"><button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>TAP Lens</button><button className={view === "collections" ? "active" : ""} onClick={() => setView("collections")}>Collections</button><span>Live v1</span></nav>
    {message && <div className="lens-toast">{message}</div>}
    {view === "home" ? <section>
      <div className="lens-greeting"><div><span>Good morning, Tushar</span><h1>The firm, in focus.</h1><p>Every module starts from the same TAP Hub source of truth. Collections is the first live Lens module.</p></div><button className="outline" onClick={() => setView("collections")}>Open Collections →</button></div>
      <div className="module-grid">{modules.map(([name, description]) => <button key={name} className={`module-tile ${name === "Collections" ? "live" : ""}`} onClick={() => name === "Collections" ? setView("collections") : setMessage(`${name} is coming soon.`)}><div className="tile-top"><span className="tile-icon">{name === "Collections" ? "↗" : "◇"}</span><b>{name === "Collections" ? "LIVE V1" : "COMING SOON"}</b></div><h2>{name}</h2><p>{description}</p><span className="tile-link">{name === "Collections" ? "Open module →" : "Coming soon"}</span></button>)}</div>
      <div className="lens-note"><b>Collections v1:</b> invoice worklist, the 10/20/30/31/45 ladder, owner approval gates, and auditable touch logging. Email sending and QuickBooks sync remain intentionally disconnected until their respective integrations are verified.</div>
    </section> : <section>
      <div className="collection-header"><div><span className="eyebrow">AI COLLECTIONS ENGINE</span><h1>Collections</h1><p>The firm decides the voice, timing, and escalation. No serious action goes out without a person.</p></div><div className="head-actions"><button className="outline" onClick={() => setShowSettings(true)}>Configure ladder</button><button className="solid" onClick={() => setShowNew(true)}>＋ Add invoice</button></div></div>
      {data?.mode === "setup_required" && <div className="setup-warning"><b>Database setup required.</b> This is the reference preview using sample rows. Apply <code>{data.migration}</code> to turn on persistence. No outreach can be sent from this screen.</div>}
      <div className="collection-stats"><Stat label="Outstanding AR" value={money(totals.outstanding)} /><Stat label="Overdue invoices" value={String(totals.overdue)} /><Stat label="Owner approvals" value={String(totals.approvals)} /></div>
      <div className="panel"><div className="panel-top"><div><h2>Collections pipeline <small>open balances</small></h2><p>Each invoice advances only when its balance is still open. Marking a touch here records the action - it does not send an email.</p></div><span className="sync">● {data?.mode === "live" ? "Live data" : "Preview data"}</span></div>
        {loading ? <div className="empty">Loading Collections...</div> : <div className="table-wrap"><table><thead><tr><th>Client</th><th>Invoice</th><th>Outstanding</th><th>Past due</th><th>Where it is</th><th>Next action</th></tr></thead><tbody>{(data?.invoices || []).map(row => <tr key={row.id}><td><strong>{row.client_name}</strong></td><td><span className="mono">#{row.invoice_number}</span><small>Due {new Date(`${row.due_date}T00:00:00`).toLocaleDateString()}</small></td><td className="money">{money(Number(row.balance))}</td><td><b className={row.days_past_due >= 31 ? "late red" : row.days_past_due ? "late amber" : "late"}>{row.days_past_due ? `${row.days_past_due} days` : "Current"}</b></td><td><span className={`rung rung-${row.current_rung}`}>Rung {row.current_rung} · {rungName(row.current_rung)}</span>{row.latest_action && <small>Last: {row.latest_action}</small>}</td><td>{row.current_rung === 0 ? <span className="quiet">No touch needed</span> : <button className={row.current_rung >= 4 ? "approval" : "touch"} onClick={() => logAction(row.id, row.current_rung)}>{row.current_rung >= 4 ? "Record approval" : `Record rung ${row.current_rung}`}</button>}</td></tr>)}</tbody></table>{!data?.invoices?.length && <div className="empty">No open invoices yet. Add an invoice or connect the QuickBooks sync.</div>}</div>}
      </div>
      <div className="ladder-panel"><div><span className="eyebrow">THE FIVE-TOUCH LADDER</span><h2>Clear escalation, real guardrails.</h2></div><div className="rungs">{ladder.map(step => <div className="ladder-step" key={step.rung}><span>{step.rung}</span><div><b>{step.label}</b><small>Day {step.trigger_days} · {step.auto_send ? "Eligible for automation" : "Owner approval required"}</small></div></div>)}</div><p className="disclaimer">V1 logs collection decisions and protects approval gates. It does not send email, call clients, or alter QuickBooks invoices.</p></div>
    </section>}
    {showNew && <div className="modal-backdrop"><form className="modal" onSubmit={addInvoice}><button type="button" className="close" onClick={() => setShowNew(false)}>×</button><span className="eyebrow">COLLECTIONS V1</span><h2>Add an invoice</h2><p>Manual invoices are for operations setup. QuickBooks will become the financial source of truth when the sync is connected.</p><label>Client<select required value={invoice.client_id} onChange={e => setInvoice({ ...invoice, client_id: e.target.value })}><option value="">Select a client</option>{data?.clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label><div className="two"><label>Invoice #<input required value={invoice.invoice_number} onChange={e => setInvoice({ ...invoice, invoice_number: e.target.value })} /></label><label>Amount<input required type="number" min="0" step="0.01" value={invoice.amount} onChange={e => setInvoice({ ...invoice, amount: e.target.value })} /></label></div><div className="two"><label>Invoice date<input type="date" value={invoice.invoice_date} onChange={e => setInvoice({ ...invoice, invoice_date: e.target.value })} /></label><label>Due date<input required type="date" value={invoice.due_date} onChange={e => setInvoice({ ...invoice, due_date: e.target.value })} /></label></div><button className="solid wide">Add to Collections</button></form></div>}
    {showSettings && <div className="modal-backdrop"><div className="modal large"><button className="close" onClick={() => setShowSettings(false)}>×</button><span className="eyebrow">OWNER CONTROLS</span><h2>The follow-up ladder</h2><p>When each touch becomes eligible, and whether it waits for a human.</p>{ladder.map((step, index) => <div className="setting-row" key={step.rung}><b>{step.rung}</b><input value={step.label} onChange={e => setLadder(ladder.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}/><label>Day<input type="number" min="0" value={step.trigger_days} onChange={e => setLadder(ladder.map((item, i) => i === index ? { ...item, trigger_days: Number(e.target.value) } : item))}/></label><label className="check"><input type="checkbox" checked={step.auto_send} onChange={e => setLadder(ladder.map((item, i) => i === index ? { ...item, auto_send: e.target.checked } : item))}/>{step.auto_send ? "Eligible" : "Approval"}</label></div>)}<button className="solid wide" onClick={saveLadder}>Save guardrails</button></div></div>}
  </div>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="lens-stat"><strong>{value}</strong><span>{label}</span></div>; }

const styles = `
.lens{--lp:#f6f2ea;--li:#17283c;--lm:#65717d;--ll:#ddd6c9;--lg:#176a58;--la:#aa6a1b;--lr:#a33a34;max-width:1200px;margin:0 auto;padding:14px 6px 48px;color:var(--li);font-family:Public Sans,Arial,sans-serif}.lens button{font:inherit}.lens-top{display:flex;justify-content:space-between;align-items:start;padding:22px 0;border-bottom:1px solid var(--ll)}.brand{border:0;background:none;text-align:left;color:var(--li);font-family:Fraunces,Georgia,serif;font-size:29px;font-weight:700;cursor:pointer}.brand small{display:block;font-family:Public Sans,sans-serif;font-size:9px;letter-spacing:.15em;margin-top:4px;color:var(--lm)}.owner{text-align:right;font-size:13px;font-weight:600}.owner span{font-weight:400;color:var(--lm);font-size:11px}.lens-nav{display:flex;gap:5px;border-bottom:1px solid var(--ll);padding:13px 0}.lens-nav button{border:0;background:none;color:var(--lm);padding:7px 12px;border-radius:7px;cursor:pointer;font-size:13px}.lens-nav button.active{background:var(--li);color:#fff;font-weight:700}.lens-nav span{margin-left:auto;color:var(--lg);font-weight:700;font-size:11px;padding:8px}.lens-greeting,.collection-header{display:flex;justify-content:space-between;gap:24px;padding:42px 0 26px}.lens-greeting span,.eyebrow{color:var(--lg);font-size:10px;letter-spacing:.13em;font-weight:800}.lens h1{font:600 38px/1.1 Fraunces,Georgia,serif;margin:8px 0}.lens h2{font:600 21px/1.2 Fraunces,Georgia,serif;margin:5px 0 8px}.lens p{color:var(--lm);font-size:13px;line-height:1.55;max-width:620px}.outline,.solid,.touch,.approval{border-radius:8px;padding:10px 14px;font-size:12px;font-weight:700;cursor:pointer}.outline{border:1px solid var(--ll);background:#fff;color:var(--li)}.solid{border:1px solid var(--li);background:var(--li);color:#fff}.head-actions{display:flex;align-items:flex-start;gap:8px}.module-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.module-tile{border:1px solid var(--ll);text-align:left;background:#fff;padding:19px;border-radius:12px;min-height:205px;cursor:pointer;transition:.15s}.module-tile:hover{transform:translateY(-2px);box-shadow:0 8px 18px #17283c13}.module-tile.live{border-color:#8cc3b5;background:#f4fbf8}.tile-top{display:flex;justify-content:space-between}.tile-icon{font-size:21px;color:var(--lg)}.tile-top b{font-size:9px;letter-spacing:.09em;color:var(--lm)}.live .tile-top b{color:var(--lg)}.module-tile h2{margin-top:27px}.tile-link{font-size:12px;color:var(--lg);font-weight:700;display:block;margin-top:22px}.lens-note,.setup-warning{border:1px solid #dbcfad;background:#f9f2df;border-radius:10px;padding:14px 16px;margin-top:18px;font-size:12px;line-height:1.5;color:#70511a}.collection-header{padding-bottom:16px}.collection-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:10px 0 16px}.lens-stat{background:#fff;border:1px solid var(--ll);border-radius:12px;padding:18px}.lens-stat strong{font:600 28px Fraunces,Georgia,serif;display:block}.lens-stat span{font-size:11px;color:var(--lm);margin-top:5px;display:block}.panel,.ladder-panel{background:#fff;border:1px solid var(--ll);border-radius:13px;padding:20px;margin-top:16px}.panel-top{display:flex;justify-content:space-between;gap:15px}.panel-top h2 small{font:400 11px Public Sans,sans-serif;color:var(--lm);margin-left:6px}.panel-top p{margin:5px 0}.sync{font-size:11px;color:var(--lg);font-weight:700;white-space:nowrap}.table-wrap{overflow:auto;margin:18px -20px -20px}.lens table{min-width:750px;width:100%;border-collapse:collapse}.lens th{font-size:9px;color:var(--lm);text-transform:uppercase;letter-spacing:.08em;text-align:left;background:#faf8f3;padding:12px 20px}.lens td{padding:15px 20px;border-top:1px solid #eee8de;font-size:12px}.lens td small,.ladder-step small{display:block;color:var(--lm);font-size:10px;margin-top:3px}.money,.mono{font-variant-numeric:tabular-nums}.money{font-weight:700}.late{font-size:11px}.red{color:var(--lr)}.amber{color:var(--la)}.rung{font-size:10px;font-weight:800;padding:5px 8px;border-radius:20px;background:#edf3f1;color:var(--lg);white-space:nowrap}.rung-3{background:#fff0de;color:#9c5b12}.rung-4,.rung-5{background:#fae5e3;color:var(--lr)}.touch{background:#fff;border:1px solid var(--ll);color:var(--li);padding:7px 9px;font-size:10px}.approval{background:var(--li);border:1px solid var(--li);color:#fff;padding:7px 9px;font-size:10px}.quiet{color:var(--lm);font-size:11px}.ladder-panel{display:grid;grid-template-columns:1fr 1.5fr;gap:26px;align-items:center}.rungs{display:flex;gap:4px}.ladder-step{flex:1;border-left:2px solid var(--ll);padding:7px}.ladder-step>span{display:inline-flex;background:var(--li);color:white;border-radius:50%;width:20px;height:20px;align-items:center;justify-content:center;font-size:10px;font-weight:700}.ladder-step b{font-size:11px;display:block;margin-top:5px}.disclaimer{grid-column:1/-1;border-top:1px solid var(--ll);padding-top:12px;margin:0!important;font-size:11px!important}.empty{padding:36px;text-align:center;color:var(--lm);font-size:13px}.lens-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--li);color:#fff;z-index:50;border-radius:9px;padding:12px 16px;font-size:12px;box-shadow:0 8px 30px #0004}.modal-backdrop{position:fixed;inset:0;background:#17283c70;z-index:40;display:flex;align-items:center;justify-content:center;padding:18px}.modal{width:520px;max-width:100%;position:relative;background:#fff;border-radius:14px;padding:25px;box-shadow:0 20px 70px #0004}.modal.large{width:720px}.modal h2{font-size:27px}.modal label{display:block;font-size:11px;font-weight:700;margin-top:13px;color:var(--lm)}.modal input,.modal select{width:100%;border:1px solid var(--ll);border-radius:7px;padding:9px;margin-top:5px;background:#fff;color:var(--li);font:inherit;font-size:13px}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.close{position:absolute;right:14px;top:10px;border:0;background:none;font-size:25px;cursor:pointer;color:var(--lm)}.wide{width:100%;justify-content:center;margin-top:20px}.setting-row{display:grid;grid-template-columns:25px 1fr 90px 105px;gap:9px;align-items:end;border-top:1px solid var(--ll);padding:10px 0}.setting-row>b{margin-bottom:8px}.setting-row label{margin:0}.setting-row .check{font-size:10px}.setting-row .check input{width:auto;margin-right:5px}@media(max-width:700px){.lens{padding:4px 0 32px}.module-grid,.collection-stats{grid-template-columns:1fr}.lens-greeting,.collection-header,.lens-top{display:block}.owner{text-align:left;margin-top:12px}.head-actions{margin-top:16px}.ladder-panel{display:block}.rungs{margin:16px 0;overflow:auto}.ladder-step{min-width:105px}.setting-row{grid-template-columns:22px 1fr 65px}.setting-row .check{grid-column:2/-1}.lens h1{font-size:31px}}
`;
