"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, ServiceKey, CommentEntry } from "@/lib/types";
import { SERVICE_META, STAFF } from "@/lib/data";

// ── Constants ──
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FILING_TYPES = ["C Corp.", "S Corp.", "Partnership", "SMLLC", "Trust", "Non Profit", "Retirem Plan"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// ── Stage display for month tracking in the slideover ──
const UNIFIED_STAGES = [
  { k: "ip", t: "•", cls: "prog", l: "In progress" },
  { k: "wc", t: "⏳", cls: "wait", l: "Waiting on client" },
  { k: "pp", t: "✓", cls: "prep", l: "Prepared" },
  { k: "dn", t: "✓", cls: "done", l: "Done" },
];
const NA_STAGE = { k: "na", t: "–", cls: "na", l: "N/A" };

const STAGE_STYLES: Record<string, { bg: string; fg: string; border: string; cls: string; label: string }> = {
  "":   { bg: "transparent", fg: "#c2c8d4", border: "transparent", cls: "lock", label: "Not due" },
  ip:   { bg: "var(--blue-soft)", fg: "var(--blue)", border: "#bcd0e2", cls: "prog", label: "In progress" },
  wc:   { bg: "var(--amber-soft)", fg: "var(--amber)", border: "#e8d3a6", cls: "wait", label: "Waiting on client" },
  pp:   { bg: "var(--teal-soft)", fg: "var(--teal-ink)", border: "#c5d0ec", cls: "prep", label: "Prepared" },
  dn:   { bg: "var(--green-soft)", fg: "var(--green)", border: "#bcdcc6", cls: "done", label: "Done" },
  na:   { bg: "var(--red-soft)", fg: "var(--red)", border: "#e8c4bf", cls: "na", label: "N/A" },
};

// ── Module labels ──
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
  onStageChange?: (clientId: string, serviceKey: string, monthIdx: number, stage: string) => void;
  moduleKey?: ServiceKey;
  currentUser?: string;
}

export default function ClientSlideover({ client, open, onClose, onSave, onDelete, onStageChange, moduleKey, currentUser }: ClientSlideoverProps) {
  const [editing, setEditing] = useState(false);
  const [localSvcs, setLocalSvcs] = useState<any[]>(client.services);

  // ── Comment state ──
  const [activeCommentSvc, setActiveCommentSvc] = useState<string | null>(null);
  const [activeCommentMonth, setActiveCommentMonth] = useState<number>(-1);
  const [commentText, setCommentText] = useState("");

  // ── Client-level notes state ──
  const [notesMonth, setNotesMonth] = useState(new Date().getMonth());
  const [notesText, setNotesText] = useState("");

  // ── Sales tax line items state ──
  const [stxLineItems, setStxLineItems] = useState<any[]>([]);
  const [addingStx, setAddingStx] = useState(false);
  const [newStxName, setNewStxName] = useState("");
  const [newStxRt, setNewStxRt] = useState("");
  const [newStxTaxId, setNewStxTaxId] = useState("");
  const [newStxBank, setNewStxBank] = useState("");
  const [newStxRouting, setNewStxRouting] = useState("");
  const [newStxAccount, setNewStxAccount] = useState("");
  const [newStxFreq, setNewStxFreq] = useState("Monthly");

  // ── Payroll details state ──
  const [prPaydate, setPrPaydate] = useState("");
  const [prPin, setPrPin] = useState("");
  const [prEftps, setPrEftps] = useState("");
  const [showPrPin, setShowPrPin] = useState(false);
  const [showPrEftps, setShowPrEftps] = useState(false);
  const [prEmails, setPrEmails] = useState<string[]>([]);
  const [newPrEmail, setNewPrEmail] = useState("");

  // ── Tax returns state ──
  const [filingState, setFilingState] = useState("");
  const [filingMonth, setFilingMonth] = useState("");
  const [filingType, setFilingType] = useState("");

  // ── 1099s count state ──
  const [t9Counts, setT9Counts] = useState<number[]>(Array(12).fill(0));
  useEffect(() => {
    const svc = client.services.find((s: any) => s.key === "1099s");
    if (svc?.csId) {
      const year = new Date().getFullYear();
      fetch(`/api/period-counts?client_service_id=${svc.csId}&year=${year}`)
        .then(res => res.json())
        .then(data => {
          if (data.counts && Array.isArray(data.counts)) {
            const counts = Array(12).fill(0);
            for (const c of data.counts) {
              const parts = c.period?.split("-");
              if (parts && parts.length >= 2) {
                const monthIdx = parseInt(parts[1]) - 1;
                if (monthIdx >= 0 && monthIdx < 12) {
                  counts[monthIdx] = Math.max(0, c.processed || 0);
                }
              }
            }
            setT9Counts(counts);
          }
        })
        .catch(() => {});
    }
  }, [client]);
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
    const items = stxSvc?.salesTaxLineItems || [];
    setStxLineItems(items);
    // Initialize payroll fields
    const prSvc = client.services.find((s: any) => s.key === "payroll");
    setPrPaydate(prSvc?.paydate || "");
    setPrPin(prSvc?.payrollPassword || "");
    setPrEftps(prSvc?.eftps || "");
    setPrEmails(prSvc?.payEmails || []);
    // Initialize tax returns fields
    const trSvc = client.services.find((s: any) => s.key === "tax_returns");
    setFilingState(trSvc?.filingState || "");
    setFilingMonth(trSvc?.filingMonth || "");
    setFilingType(trSvc?.filingType || "");
    // Auto-open the add form when sales tax is enabled with no line items
    if (stxSvc?.enabled && items.length === 0 && !editing) {
      setAddingStx(true);
    }
  }, [client]);

  // ── Edit view state ──
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
  const [eFinMonth, setEFinMonth] = useState(() => {
    const svc = client.services.find((s: any) => s.key === "financials");
    return svc?.financialsMonth ?? 0;
  });

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

  // ── Helpers ──
  function getServiceComments(svcKey: string, monthIdx: number): CommentEntry[] {
    const svc = localSvcs.find((s: any) => s.key === svcKey);
    return (svc?.comments || []).filter((cm: CommentEntry) => cm.month === monthIdx);
  }

  function hasComment(svcKey: string, monthIdx: number): boolean {
    return getServiceComments(svcKey, monthIdx).length > 0;
  }

  function addComment(svcKey: string, monthIdx: number, text: string) {
    if (!text.trim()) return;
    const comment: CommentEntry = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      month: monthIdx,
      text: text.trim(),
      author: currentUser || "You",
      createdAt: new Date().toISOString(),
    };
    const updated = localSvcs.map((s: any) => {
      if (s.key === svcKey) {
        const existing = s.comments || [];
        return { ...s, comments: [...existing, comment] };
      }
      return s;
    });
    setLocalSvcs(updated);
    setCommentText("");
    setActiveCommentMonth(-1);
    setActiveCommentSvc(null);
    // Persist
    onSave?.({ ...client, services: updated });
  }

  function deleteComment(svcKey: string, commentId: string) {
    const updated = localSvcs.map((s: any) => {
      if (s.key === svcKey) {
        return { ...s, comments: (s.comments || []).filter((cm: CommentEntry) => cm.id !== commentId) };
      }
      return s;
    });
    setLocalSvcs(updated);
    onSave?.({ ...client, services: updated });
  }

  // ── Client-level notes helpers ──
  function getAllServiceComments(): CommentEntry[] {
    const all: CommentEntry[] = [];
    for (const svc of localSvcs) {
      if (svc.comments && Array.isArray(svc.comments)) {
        for (const cm of svc.comments) {
          all.push({ ...cm, _svcKey: svc.key });
        }
      }
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function handleAddNote() {
    if (!notesText.trim()) return;
    const firstEnabledSvc = localSvcs.find((s: any) => s.enabled);
    if (!firstEnabledSvc) return;
    const comment: CommentEntry = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      month: notesMonth,
      text: notesText.trim(),
      author: currentUser || "You",
      createdAt: new Date().toISOString(),
    };
    const updated = localSvcs.map((s: any) => {
      if (s.key === firstEnabledSvc.key) {
        const existing = s.comments || [];
        return { ...s, comments: [...existing, comment] };
      }
      return s;
    });
    setLocalSvcs(updated);
    setNotesText("");
    onSave?.({ ...client, services: updated });
  }

  function deleteNote(commentId: string) {
    const updated = localSvcs.map((s: any) => ({
      ...s,
      comments: (s.comments || []).filter((cm: CommentEntry) => cm.id !== commentId),
    }));
    setLocalSvcs(updated);
    onSave?.({ ...client, services: updated });
  }

  function toggleSvc(key: string) {
    const updated = localSvcs.map((s: any) =>
      s.key === key ? { ...s, enabled: !s.enabled, months: s.enabled ? Array(12).fill("lock") : s.months } : s
    );
    setLocalSvcs(updated);
    if (key === "sales_tax") {
      const wasOff = !localSvcs.find(s => s.key === key)?.enabled;
      if (wasOff && (!stxLineItems || stxLineItems.length === 0)) {
        setAddingStx(true);
      }
    }
    onSave?.({ ...client, services: updated });
  }

  function freqLabel(key: string, svc: any) {
    if (!svc.enabled) return "off";
    if (moduleKey && key !== moduleKey) return "";
    if (key === "financials") return (svc.frequency || "Monthly") + " · in Financials list";
    if (key === "payroll") return (svc.frequency || "Bi-Weekly") + " · " + (svc.processor || "-");
    if (key === "sales_tax") return (svc.frequency || "Monthly") + " · in Sales Tax list";
    if (key === "tax_returns") return svc.frequency || "Business";
    if (key === "1099s") return "in 1099 worklist";
    if (key === "renditions") return "in renditions worklist";
    return "";
  }

  // ── Comment panel ──
  function CommentPanel({ svcKey, monthIdx }: { svcKey: string; monthIdx: number }) {
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      function onClick(e: MouseEvent) {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          setActiveCommentMonth(-1);
          setActiveCommentSvc(null);
        }
      }
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const comments = getServiceComments(svcKey, monthIdx);

    return (
      <div ref={panelRef} className="comment-panel" style={{
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
        padding: "10px 12px", marginTop: 6, boxShadow: "0 4px 16px rgba(0,0,0,.08)",
        fontSize: 12, maxWidth: 260,
      }}>
        <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 8 }}>
          Comments — {MONTHS[monthIdx]}
        </div>

        {comments.length > 0 && (
          <div style={{ marginBottom: 8, maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {comments.map((cm) => (
              <div key={cm.id} style={{ background: "var(--paper)", borderRadius: 7, padding: "6px 8px", position: "relative" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>
                  <b>{cm.author}</b> · {new Date(cm.createdAt).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>{cm.text}</div>
                <button
                  onClick={() => deleteComment(svcKey, cm.id)}
                  style={{ all: "unset", cursor: "pointer", position: "absolute", top: 4, right: 6, color: "var(--red)", fontSize: 11, lineHeight: 1 }}
                  title="Delete comment"
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <input
            style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "var(--paper)" }}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addComment(svcKey, monthIdx, commentText); } }}
            placeholder="Add a comment…"
            autoFocus
          />
          <button
            onClick={() => addComment(svcKey, monthIdx, commentText)}
            style={{ all: "unset", cursor: "pointer", background: "var(--teal)", color: "#fff", padding: "5px 10px", borderRadius: 7, fontWeight: 600, fontSize: 12 }}
          >Send</button>
        </div>
      </div>
    );
  }

  // ── Month tracking ──
  function monthCells(svcKey: string) {
    const svc = localSvcs.find((s: any) => s.key === svcKey);
    if (!svc?.enabled) return null;
    const stages = svc.months || [];
    const now = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const year = currentYear;
    const isTaxReturns = svcKey === "tax_returns";

    function toStageKey(ms: string): string {
      switch (ms) {
        case "lock": return "";
        case "in_progress": return "ip";
        case "waiting": return "wc";
        case "billed": return "pp";
        case "done": return "dn";
        case "na": return "na";
        default: return ms;
      }
    }
    function toMonthStatus(sk: string): string {
      switch (sk) {
        case "": return "lock";
        case "ip": return "in_progress";
        case "wc": return "waiting";
        case "pp": return "billed";
        case "dn": return "done";
        case "na": return "na";
        default: return sk;
      }
    }

    const STAGE_CYCLE = ["", "ip", "wc", "pp", "dn", "na"];

    function handleNextStage(svcKey: string, monthIdx: number) {
      const svc = localSvcs.find((s: any) => s.key === svcKey);
      const currentStage = toStageKey((svc?.months || [])[monthIdx] || "");
      const idx = STAGE_CYCLE.indexOf(currentStage);
      const nextStage = STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length];
      const ms = toMonthStatus(nextStage);
      const updated = localSvcs.map((s: any) =>
        s.key === svcKey
          ? { ...s, months: s.months.map((m: string, i: number) => i === monthIdx ? ms : m) }
          : s
      );
      setLocalSvcs(updated);
      if (onStageChange) {
        onStageChange(client.id, svcKey, monthIdx, nextStage);
      }
    }

    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MONTHS.map((mo, i) => {
            // ── 1099s: count-based cells ──
            if (svcKey === "1099s") {
              const n = t9Counts[i] || 0;
              const cmt = hasComment(svcKey, i);
              return (
                <div key={mo} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{mo}</div>
                  <div
                    onClick={() => {
                      const newCounts = [...t9Counts];
                      newCounts[i] = (newCounts[i] || 0) + 1;
                      setT9Counts(newCounts);
                      const svc = localSvcs.find((s: any) => s.key === "1099s");
                      if (svc?.csId) {
                        const period = `${year}-${String(i + 1).padStart(2, "0")}`;
                        fetch("/api/period-counts", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ client_service_id: svc.csId, period, processed: newCounts[i] }),
                        }).catch(() => {});
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const newCounts = [...t9Counts];
                      newCounts[i] = Math.max(0, (newCounts[i] || 0) - 1);
                      setT9Counts(newCounts);
                      const svc = localSvcs.find((s: any) => s.key === "1099s");
                      if (svc?.csId) {
                        const period = `${year}-${String(i + 1).padStart(2, "0")}`;
                        fetch("/api/period-counts", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ client_service_id: svc.csId, period, processed: newCounts[i] }),
                        }).catch(() => {});
                      }
                    }}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      backgroundColor: n > 0 ? "var(--green-soft)" : "transparent",
                      color: n > 0 ? "var(--green)" : "var(--muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto", fontWeight: 700, fontSize: 13, userSelect: "none",
                      cursor: "pointer",
                      border: n > 0 ? "1px solid var(--green)" : "1px solid transparent",
                      position: "relative",
                    }}
                    title={`${mo}: ${n} processed — click +1, right-click -1`}
                  >
                    {n || "·"}
                    {cmt && <div style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "var(--blue)" }} />}
                  </div>
                  {/* Comment icon */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveCommentSvc(svcKey); setActiveCommentMonth(activeCommentSvc === svcKey && activeCommentMonth === i ? -1 : i); setCommentText(""); }}
                    style={{ all: "unset", cursor: "pointer", fontSize: 10, color: "var(--muted)", marginTop: 2, display: "block", lineHeight: 1 }}
                    title="Comments"
                  >💬</button>
                  {activeCommentSvc === svcKey && activeCommentMonth === i && (
                    <CommentPanel svcKey={svcKey} monthIdx={i} />
                  )}
                </div>
              );
            }

            // ── Default: status-based cells ──
            const stage = toStageKey(stages[i] || "");
            const style = STAGE_STYLES[stage] || STAGE_STYLES[""];
            const stageLabel = isTaxReturns && stage === "dn" ? "Filed" : style.label;
            const t = stage === "" ? "·" : stage === "ip" ? "•" : stage === "wc" ? "⏳" : stage === "pp" ? "✓" : (stage === "dn" ? (isTaxReturns ? "📋" : "✓") : stage === "na" ? "–" : "");
            const delayed = stage !== "" && stage !== "dn" && stage !== "na" && i < now;
            const cmt = hasComment(svcKey, i);
            return (
              <div key={mo} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{mo}</div>
                <div
                  onClick={() => handleNextStage(svcKey, i)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: `1px solid ${delayed ? "var(--red)" : style.border}`,
                    background: delayed || stage === "na" ? `repeating-linear-gradient(45deg, ${style.bg} 0px, ${style.bg} 3px, #c0c4cc40 3px, #c0c4cc40 5px)` : style.bg,
                    color: style.fg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto", fontWeight: 700, fontSize: 14, userSelect: "none",
                    cursor: "pointer",
                    boxShadow: delayed ? "0 0 0 2px var(--red)" : "none",
                    position: "relative",
                  }}
                  title={`${mo} — ${delayed ? "DELAYED · " : ""}${stageLabel} — click to cycle`}
                >
                  {t}
                  {cmt && <div style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "var(--blue)" }} />}
                </div>
                {/* Comment icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveCommentSvc(svcKey); setActiveCommentMonth(activeCommentSvc === svcKey && activeCommentMonth === i ? -1 : i); setCommentText(""); }}
                  style={{ all: "unset", cursor: "pointer", fontSize: 10, color: "var(--muted)", marginTop: 2, display: "block", lineHeight: 1 }}
                  title="Comments"
                >💬</button>
                {activeCommentSvc === svcKey && activeCommentMonth === i && (
                  <CommentPanel svcKey={svcKey} monthIdx={i} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Single service card (reusable) ──
  function SingleServiceCard({ svc }: { svc: any }) {
    const isPayroll = svc.key === "payroll";
    const isSalesTax = svc.key === "sales_tax";
    const isTaxReturns = svc.key === "tax_returns";

    return (
      <div style={{ marginBottom: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        {/* Toggle card row */}
        <div className="svc" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 13px",
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
            onClick={() => { if (!moduleKey) toggleSvc(svc.key); }}
            style={{
              width: 46, height: 27, borderRadius: 20,
              background: svc.enabled ? "var(--teal)" : "#d8d2c4",
              position: "relative", cursor: moduleKey ? "default" : "pointer", transition: ".16s", flex: "0 0 auto",
              opacity: moduleKey ? 0.6 : 1,
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: svc.enabled ? 22 : 3, width: 21, height: 21,
              borderRadius: "50%", background: "#fff", transition: ".16s",
              boxShadow: "0 1px 3px rgba(0,0,0,.25)",
            }} />
          </div>
        </div>

        {/* Month tracking under card */}
        {svc.enabled && (
          <div style={{ padding: "6px 13px 12px", borderTop: "1px dashed var(--line)" }}>
            {/* Payroll: credentials section */}
            {isPayroll && svc.enabled && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Pay date / day</label>
                    <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)" }}
                      value={prPaydate}
                      onChange={e => {
                        setPrPaydate(e.target.value);
                        setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, paydate: e.target.value } : s));
                      }}
                      placeholder="e.g. Friday"
                    />
                  </div>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Payroll PIN</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)", paddingRight: 30 }}
                        type={showPrPin ? "text" : "password"} value={prPin}
                        onChange={e => {
                          setPrPin(e.target.value);
                          setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payrollPassword: e.target.value } : s));
                        }}
                        placeholder="EFT pin"
                      />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPrPin(!showPrPin)}
                        style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", fontSize: 15, lineHeight: 1 }}
                      >
                        {showPrPin ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>EFTPS Password</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)", paddingRight: 30 }}
                        type={showPrEftps ? "text" : "password"} value={prEftps}
                        onChange={e => {
                          setPrEftps(e.target.value);
                          setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, eftps: e.target.value } : s));
                        }}
                        placeholder="EFTPS password"
                      />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPrEftps(!showPrEftps)}
                        style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", fontSize: 15, lineHeight: 1 }}
                      >
                        {showPrEftps ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {/* Payroll emails - tag list */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Contact emails</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                    {prEmails.map((em, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--blue-soft)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>
                        {em}
                        <button onClick={() => { const upd = prEmails.filter((_, j) => j !== i); setPrEmails(upd); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payEmails: upd } : s)); }}
                          style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontSize: 12, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "var(--paper)" }}
                      value={newPrEmail}
                      onChange={e => setNewPrEmail(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newPrEmail.trim()) {
                          e.preventDefault();
                          const upd = [...prEmails, newPrEmail.trim()];
                          setPrEmails(upd);
                          setNewPrEmail("");
                          setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payEmails: upd } : s));
                        }
                      }}
                      placeholder="Type email + Enter to add"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tax Returns: filing details */}
            {isTaxReturns && svc.enabled && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: "1 0 100px" }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Filing state</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={filingState}
                    onChange={e => {
                      setFilingState(e.target.value);
                      setLocalSvcs(prev => prev.map((s: any) => s.key === "tax_returns" ? { ...s, filingState: e.target.value } : s));
                    }}
                  >
                    <option value="">Select state…</option>
                    {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 0 100px" }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Filing month</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={filingMonth}
                    onChange={e => {
                      setFilingMonth(e.target.value);
                      setLocalSvcs(prev => prev.map((s: any) => s.key === "tax_returns" ? { ...s, filingMonth: e.target.value } : s));
                    }}
                  >
                    <option value="">Select month…</option>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 0 100px" }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Filing type</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={filingType}
                    onChange={e => {
                      setFilingType(e.target.value);
                      setLocalSvcs(prev => prev.map((s: any) => s.key === "tax_returns" ? { ...s, filingType: e.target.value } : s));
                    }}
                  >
                    <option value="">Select type…</option>
                    {FILING_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Sales Tax: line items */}
            {isSalesTax && svc.enabled && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={() => setAddingStx(!addingStx)}
                  style={{
                    all: "unset", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 12px", marginBottom: 8,
                    border: "1px dashed var(--line)", borderRadius: 8,
                    fontSize: 12, fontWeight: 600, color: "var(--teal)",
                    width: "100%", boxSizing: "border-box",
                    transition: ".12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--teal)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add new line
                </button>

                {addingStx && (
                  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name</label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxName} onChange={e => setNewStxName(e.target.value)} placeholder="e.g. Texas Sales Tax" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Frequency</label>
                        <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxFreq} onChange={e => setNewStxFreq(e.target.value)}>
                          <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RT #</label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRt} onChange={e => setNewStxRt(e.target.value)} placeholder="e.g. 123456" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Tax ID</label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxTaxId} onChange={e => setNewStxTaxId(e.target.value)} placeholder="e.g. 74-1234567" />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Bank name</label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxBank} onChange={e => setNewStxBank(e.target.value)} placeholder="e.g. Chase" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Routing #</label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRouting} onChange={e => setNewStxRouting(e.target.value)} placeholder="e.g. 111000025" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Account #</label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxAccount} onChange={e => setNewStxAccount(e.target.value)} placeholder="e.g. 123456789" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="reveal" style={{ all: "unset", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontWeight: 600, fontSize: 12, color: "var(--muted)" }}
                        onClick={() => setAddingStx(false)}>Cancel</button>
                      <button className="reveal" style={{ all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff", padding: "6px 12px", borderRadius: 8, fontWeight: 600, fontSize: 12 }}
                        onClick={() => {
                          if (!newStxName.trim()) return;
                          const upd = [...stxLineItems, {
                            serviceName: newStxName.trim(), rt: newStxRt.trim(), taxId: newStxTaxId.trim(),
                            bankName: newStxBank.trim(), bankRouting: newStxRouting.trim(), bankAccount: newStxAccount.trim(),
                            frequency: newStxFreq,
                          }];
                          setStxLineItems(upd);
                          setLocalSvcs(prev => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
                          setNewStxName(""); setNewStxRt(""); setNewStxTaxId(""); setNewStxBank("");
                          setNewStxRouting(""); setNewStxAccount(""); setNewStxFreq("Monthly");
                          setAddingStx(false);
                        }}
                      >Add line item</button>
                    </div>
                  </div>
                )}

                {stxLineItems.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Line items</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {stxLineItems.map((item: any, i: number) => (
                        <div key={i} style={{
                          display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
                          background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{item.serviceName}</div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                              <span>{item.frequency || "Monthly"}</span>
                              {item.rt && <span>RT: {item.rt}</span>}
                              {item.taxId && <span>Tax ID: {item.taxId}</span>}
                              {item.bankName && <span>{item.bankName} {item.bankRouting && `· ${item.bankRouting}`} {item.bankAccount && `· ${item.bankAccount}`}</span>}
                            </div>
                          </div>
                          <button className="reveal" style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: 11 }}
                            onClick={() => {
                              const upd = stxLineItems.filter((_, j) => j !== i);
                              setStxLineItems(upd);
                              setLocalSvcs(prev => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
                            }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Legend */}
            {svc.key === "1099s" ? (
              <div className="legend" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 8, fontSize: 11, color: "var(--muted)" }}>
                <span style={{ fontStyle: "italic" }}>Click to add, right-click to remove — count of 1099s filed per month</span>
              </div>
            ) : (
              <div className="legend" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 8, fontSize: 11, color: "var(--muted)" }}>
                {UNIFIED_STAGES.map(s => (
                  <span key={s.k} className="lgd" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block", background: STAGE_STYLES[s.k]?.fg }}></i>
                    {isTaxReturns && s.k === "dn" ? "Filed" : s.l}
                  </span>
                ))}
                <span className="lgd" style={{ display: "flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block", background: "repeating-linear-gradient(45deg, var(--red) 0px, var(--red) 2px, transparent 2px, transparent 4px)" }}></i>N/A</span>
                <span className="lgd" style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--blue)" }}><i style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: "var(--blue)" }}></i>Has comments</span>
              </div>
            )}
            {monthCells(svc.key)}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // MODULE-SPECIFIC VIEW (compact, always-editable master data)
  // ══════════════════════════════════════════════════════════════
  if (moduleKey) {
    const targetSvc = localSvcs.find((s: any) => s.key === moduleKey);
    if (!targetSvc) return null;

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
              <div className="nm" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 23, lineHeight: 1.12 }}>{svcLabel(moduleKey)} details</div>
              <button className="ox" onClick={onClose} style={{ all: "unset", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1 }}>×</button>
            </div>
            <div className="sub" style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>
              <span className="mono" style={{ color: "#9a9484" }}>{c.cid || `CID-${c.id}`}</span> — {c.name} <span className="badge b-biz" style={{
                fontSize: "10.5px", fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: typeBadge.bg, color: typeBadge.fg, marginLeft: 6,
              }}>{c.type === "Business" ? "BIZ" : "PERS"}</span>
            </div>
          </div>

          {/* Body */}
          <div className="obody" style={{ overflowY: "auto", padding: "20px 24px 30px", flex: 1 }}>
            {/* Always-editable master data */}
            <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 10px" }}>
              Master data
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Name</label>
                <input className="ef" style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                  value={eName} onChange={e => setEName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Type / Group</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="ef" style={{ flex: 1, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                    value={eType} onChange={e => setEType(e.target.value as any)}>
                    <option>Business</option><option>Personal</option>
                  </select>
                  <input className="ef" style={{ flex: 1, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                    value={eGroup} onChange={e => setEGroup(e.target.value)} placeholder="Group" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Email</label>
                <input className="ef" style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                  value={eEmail} onChange={e => setEEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Phone</label>
                <input className="ef" style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                  value={ePhone} onChange={e => setEPhone(e.target.value)} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Address</label>
                <input className="ef" style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                  value={eAddress} onChange={e => setEAddress(e.target.value)} />
              </div>
            </div>

            {/* Auto-save master data on blur */}
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 12, fontStyle: "italic" }}>
              Master data saves automatically on change.
            </div>

            {/* Single service card */}
            <SingleServiceCard svc={targetSvc} />

            {/* Per-service assignee for this module */}
            {targetSvc.enabled && (
              <div style={{ marginTop: 12 }}>
                <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 8px" }}>
                  Service assignee
                </div>
                <select className="ef" style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                  value={eSvcAssignees[moduleKey] || "Unassigned"}
                  onChange={e => {
                    setESvcAssignees(prev => ({ ...prev, [moduleKey]: e.target.value }));
                    setLocalSvcs(prev => prev.map((s: any) =>
                      s.key === moduleKey ? { ...s, processor: e.target.value, assignedTo: e.target.value } : s
                    ));
                  }}
                >
                  {STAFF.map(m => <option key={m.name}>{m.name}</option>)}
                  <option>Unassigned</option>
                </select>
              </div>
            )}
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

  // ══════════════════════════════════════════════════════════════
  // NON-EDIT VIEW (original: shows all services)
  // ══════════════════════════════════════════════════════════════
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

            {/* Services */}
            <div className="sect" style={sectStyle}>Services — flip on/off, no formulas</div>
            {localSvcs.map((svc: any) => <SingleServiceCard key={svc.key} svc={svc} />)}

          {/* ── Notes for this client ── */}
          <div style={{ marginTop: 28, borderTop: "1px solid var(--line)", padding: "14px 0 4px" }}>
            <div className="sect" style={sectStyle}>Notes for this client</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12, fontStyle: "italic" }}>
              Anyone on this account can leave a month note; a 📋 marker then shows on the worklist.
            </div>

            {/* Month selector + add note */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
              <div style={{ flex: "0 0 110px" }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Month</label>
                <select value={notesMonth} onChange={e => setNotesMonth(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)" }}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Note</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={notesText} onChange={e => setNotesText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddNote(); } }}
                    placeholder="Add a note for the selected month"
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)", outline: "none" }}
                  />
                  <button onClick={handleAddNote}
                    style={{ all: "unset", cursor: "pointer", background: "var(--teal)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Existing notes for this month */}
            <div>
              {(() => {
                const filtered = getAllServiceComments().filter((cm: CommentEntry) => cm.month === notesMonth);
                return filtered.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {filtered.map(cm => (
                      <div key={cm.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", position: "relative" }}>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>
                          <b style={{ fontWeight: 600, color: "var(--ink)" }}>{cm.author}</b>
                          <span style={{ marginLeft: 4 }}>· {new Date(cm.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45 }}>{cm.text}</div>
                        <button onClick={() => deleteNote(cm.id)}
                          style={{ all: "unset", cursor: "pointer", position: "absolute", top: 6, right: 8, color: "var(--red)", fontSize: 13, lineHeight: 1, opacity: 0.5, transition: "opacity 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                          title="Delete note">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>No notes yet.</div>
                );
              })()}
            </div>
          </div>
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

  // ══════════════════════════════════════════════════════════════
  // EDIT VIEW (full edit mode, unchanged functionality)
  // ══════════════════════════════════════════════════════════════

  function saveEdit() {
    const nm = eName.trim();
    if (!nm) return;
    const updatedSvcs = localSvcs.map((s: any) => {
      let updated = s;
      if (s.key === "sales_tax") {
        updated = { ...s, salesTaxLineItems: stxLineItems };
      }
      if (s.key === "financials") {
        updated = { ...updated, financialsMonth: eFinMonth };
      }
      if (s.key === "payroll") {
        updated = { ...updated, paydate: prPaydate, payrollPassword: prPin, eftps: prEftps, payEmails: prEmails };
      }
      if (s.key === "tax_returns") {
        updated = { ...updated, filingState, filingMonth, filingType };
      }
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

          {/* Financial year start month */}
          <div className="sect" style={{ ...sectStyle, marginTop: 24 }}>Financial year</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <label style={{ flex: "0 0 100px", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              Start month
            </label>
            <select className="ef" style={{ ...efStyle, flex: 1, padding: "7px 9px", fontSize: 13 }}
              value={eFinMonth} onChange={e => setEFinMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>

          {/* Per-service assignee editing */}
          <div className="sect" style={{ ...sectStyle, marginTop: 24 }}>Per-service assignee</div>
          {localSvcs.filter((svc: any) => svc.enabled).map((svc: any) => (
            <div key={svc.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: svcBg(svc.key), flex: "0 0 auto" }}>{svcIc(svc.key)}</span>
              <label style={{ flex: "0 0 100px", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{svcLabel(svc.key)}</label>
              <select className="ef" style={{ ...efStyle, flex: 1, padding: "7px 9px", fontSize: 13 }}
                value={eSvcAssignees[svc.key] || "Unassigned"}
                onChange={e => setESvcAssignees(prev => ({ ...prev, [svc.key]: e.target.value }))}
              >
                {STAFF.map(m => <option key={m.name}>{m.name}</option>)}
                <option>Unassigned</option>
              </select>
            </div>
          ))}

          {/* Payroll credentials in edit mode */}
          {localSvcs.some((s: any) => s.key === "payroll" && s.enabled) && (
            <>
              <div className="sect" style={{ ...sectStyle, marginTop: 24 }}>Payroll credentials</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 0 120px", minWidth: 120 }}>
                  <label className="el" style={elStyle}>Pay date / day</label>
                  <input className="ef" style={efStyle}
                    value={prPaydate}
                    onChange={e => {
                      setPrPaydate(e.target.value);
                      setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, paydate: e.target.value } : s));
                    }}
                    placeholder="e.g. Friday"
                  />
                </div>
                <div style={{ flex: "1 0 120px", minWidth: 120 }}>
                  <label className="el" style={elStyle}>Payroll PIN</label>
                  <div style={{ position: "relative" }}>
                    <input className="ef" style={{ ...efStyle, paddingRight: 30 }}
                      type={showPrPin ? "text" : "password"} value={prPin}
                      onChange={e => {
                        setPrPin(e.target.value);
                        setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payrollPassword: e.target.value } : s));
                      }}
                      placeholder="EFT pin"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPrPin(!showPrPin)}
                      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", fontSize: 15, lineHeight: 1 }}
                    >
                      {showPrPin ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div style={{ flex: "1 0 120px", minWidth: 120 }}>
                  <label className="el" style={elStyle}>EFTPS Password</label>
                  <div style={{ position: "relative" }}>
                    <input className="ef" style={{ ...efStyle, paddingRight: 30 }}
                      type={showPrEftps ? "text" : "password"} value={prEftps}
                      onChange={e => {
                        setPrEftps(e.target.value);
                        setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, eftps: e.target.value } : s));
                      }}
                      placeholder="EFTPS password"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPrEftps(!showPrEftps)}
                      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", fontSize: 15, lineHeight: 1 }}
                    >
                      {showPrEftps ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payroll emails in edit mode */}
              <div style={{ marginTop: 8 }}>
                <label className="el" style={elStyle}>Contact emails</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                  {prEmails.map((em, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--blue-soft)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>
                      {em}
                      <button onClick={() => { const upd = prEmails.filter((_, j) => j !== i); setPrEmails(upd); }}
                        style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontSize: 12, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
                <input className="ef" style={efStyle}
                  value={newPrEmail}
                  onChange={e => setNewPrEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newPrEmail.trim()) {
                      e.preventDefault();
                      setPrEmails(prev => [...prev, newPrEmail.trim()]);
                      setNewPrEmail("");
                    }
                  }}
                  placeholder="Type email + Enter to add"
                />
              </div>
            </>
          )}

          {/* Tax returns fields in edit mode */}
          {localSvcs.some((s: any) => s.key === "tax_returns" && s.enabled) && (
            <>
              <div className="sect" style={{ ...sectStyle, marginTop: 24 }}>Tax return filing details</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 0 120px" }}>
                  <label className="el" style={elStyle}>Filing state</label>
                  <select className="ef" style={efStyle} value={filingState} onChange={e => setFilingState(e.target.value)}>
                    <option value="">Select state…</option>
                    {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 0 120px" }}>
                  <label className="el" style={elStyle}>Filing month</label>
                  <select className="ef" style={efStyle} value={filingMonth} onChange={e => setFilingMonth(e.target.value)}>
                    <option value="">Select month…</option>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 0 120px" }}>
                  <label className="el" style={elStyle}>Filing type</label>
                  <select className="ef" style={efStyle} value={filingType} onChange={e => setFilingType(e.target.value)}>
                    <option value="">Select type…</option>
                    {FILING_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
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
