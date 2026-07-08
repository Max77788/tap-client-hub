"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, ServiceKey, CommentEntry, SalesTaxLineItem } from "@/lib/types";
import { SERVICE_META, STAFF } from "@/lib/data";

// ── Utility: mask sensitive numbers (show last 4) ──
function maskNum(val: string | undefined | null): string {
  if (!val) return "—";
  const s = val.replace(/\s/g, "");
  if (s.length <= 4) return `***${s.slice(-4)}`;
  return `***${s.slice(-4)}`;
}

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
  { k: "pp", t: "✓", cls: "prep", l: "Prepared" },
  { k: "dn", t: "✓", cls: "done", l: "Done" },
];
const NA_STAGE = { k: "na", t: "–", cls: "na", l: "N/A" };

const NOTE_TYPES = ["Delayed", "Waiting on client", "Issues", "others"];

const STAGE_STYLES: Record<string, { bg: string; fg: string; border: string; cls: string; label: string }> = {
  "":   { bg: "transparent", fg: "#c2c8d4", border: "transparent", cls: "lock", label: "Not due" },
  ip:   { bg: "var(--blue-soft)", fg: "var(--blue)", border: "#bcd0e2", cls: "prog", label: "In progress" },
  wc:   { bg: "var(--amber-soft)", fg: "var(--amber)", border: "#e8d3a6", cls: "wait", label: "Waiting on client" },
  pp:   { bg: "var(--teal-soft)", fg: "var(--teal-ink)", border: "#c5d0ec", cls: "prep", label: "Prepared" },
  dl:   { bg: "var(--red-soft)", fg: "var(--red)", border: "#e8c4bf", cls: "delay", label: "Delayed" },
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const clientRef = useRef(client.id);
  const [editing, setEditing] = useState(false);
  const [showFullRecord, setShowFullRecord] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [localSvcs, setLocalSvcs] = useState<any[]>(client.services);

  // ── Comment state ──
  const [activeCommentSvc, setActiveCommentSvc] = useState<string | null>(null);
  const [activeCommentMonth, setActiveCommentMonth] = useState<number>(-1);
  const [commentText, setCommentText] = useState("");

  // ── Client-level notes state ──
  const [notesMonth, setNotesMonth] = useState(new Date().getMonth());
  const [notesText, setNotesText] = useState("");
  const [noteType, setNoteType] = useState("others");

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

  // ── Sales tax line item editing state (clients tab inline edit) ──
  const [editingStxIdx, setEditingStxIdx] = useState<number>(-1);
  const [editStxName, setEditStxName] = useState("");
  const [editStxRt, setEditStxRt] = useState("");
  const [editStxTaxId, setEditStxTaxId] = useState("");
  const [editStxBank, setEditStxBank] = useState("");
  const [editStxRouting, setEditStxRouting] = useState("");
  const [editStxAccount, setEditStxAccount] = useState("");
  const [editStxFreq, setEditStxFreq] = useState("Monthly");

  // ── Payroll details state ──
  const [prPaydate, setPrPaydate] = useState("");
  const [prStartDate, setPrStartDate] = useState("");
  const [prPin, setPrPin] = useState("");
  const [prEftps, setPrEftps] = useState("");
  const [showPrPin, setShowPrPin] = useState(false);
  const [showPrEftps, setShowPrEftps] = useState(false);
  const [prEmails, setPrEmails] = useState<string[]>([]);
  const [newPrEmail, setNewPrEmail] = useState("");
  // New payroll fields
  const [prPeriodFreq, setPrPeriodFreq] = useState("");
  const [prReportingMethod, setPrReportingMethod] = useState("");
  const [prPayrollCategory, setPrPayrollCategory] = useState("");
  const [prQbLicense, setPrQbLicense] = useState("");
  const [prReportingNotes, setPrReportingNotes] = useState("");

  // ── Pay Day options (fetched from DB) ──
  const [payDayOptions, setPayDayOptions] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/payroll/paydays")
      .then(r => r.json())
      .then(data => { if (data.paydays) setPayDayOptions(data.paydays); })
      .catch(() => {});
  }, []);

  // ── Notes pagination ──
  const [notePage, setNotePage] = useState(0);

  // ── Tax returns state ──
  const [filingState, setFilingState] = useState("");
  const [filingMonth, setFilingMonth] = useState("");
  const [filingType, setFilingType] = useState("");

  // ── 1099s count state ──
  const [t9Counts, setT9Counts] = useState<number[]>(Array(12).fill(0));

  // ── Profiles for assignee dropdown ──
  const [profiles, setProfiles] = useState<{id: string; name: string}[]>([]);
  useEffect(() => {
    fetch("/api/profiles").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProfiles(data
        .filter((u: any) => u.status === "Active")
        .filter((u: any) => !["Max Matronin", "Staff Test"].includes(u.name))
        .map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  // ── Helper: extract first name (handles "Last, First" and "First Last" formats) ──
  const firstName = (fullName: string) => fullName.includes(",")
    ? fullName.split(",")[1].trim()
    : fullName.split(" ")[0];

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
    // Only sync local state when switching to a different client (not on data updates)
    const currentId = clientRef.current;
    if (currentId === client.id) return;
    clientRef.current = client.id;
    setLocalSvcs(client.services);
    setEditing(false);
    setShowFullRecord(false);
    // Initialize per-service assignees for edit view
    const assigneeMap: Record<string, string> = {};
    client.services.forEach((s: any) => {
      assigneeMap[s.key] = s.assignedTo || s.processor || "Unassigned";
    });
    setESvcAssignees(assigneeMap);
    // Load existing sales tax line items
    const stxSvc = client.services.find((s: any) => s.key === "sales_tax");
    const items = stxSvc?.salesTaxLineItems || [];
    setStxLineItems(items);
    // Auto-select the month with the earliest comment for the active module
    if (moduleKey) {
      const svc = client.services.find((s: any) => s.key === moduleKey);
      const comments = svc?.comments || [];
      if (comments.length > 0) {
        const months = [...new Set(comments.map((c: any) => c.month))].sort((a: number, b: number) => a - b);
        setNotesMonth(months[0]);
      }
    }
    // Initialize payroll fields
    const prSvc = client.services.find((s: any) => s.key === "payroll");
    setPrPaydate(prSvc?.paydate || "");
    setPrStartDate(prSvc?.payStartDate || "");
    setPrPin(prSvc?.payrollPassword || "");
    setPrEftps(prSvc?.eftps || "");
    setPrEmails(prSvc?.payEmails || []);
    setPrPeriodFreq(prSvc?.frequency || prSvc?.payPeriodFrequency || "");
    // Auto-fill start date if cadence is set but start date is not
    if ((prSvc?.frequency || prSvc?.payPeriodFrequency) && !prSvc?.payStartDate) {
      const freq = prSvc?.frequency || prSvc?.payPeriodFrequency || "";
      const today = new Date();
      let d = new Date(today);
      d.setDate(d.getDate() + 1);
      if (freq === "Weekly") {
        while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
        setPrStartDate(d.toISOString().slice(0, 10));
      } else if (freq === "Bi-Weekly" || freq === "Bi-Weekly A") {
        while (true) {
          if (d.getDay() === 5) {
            const dom = d.getDate();
            if ((dom >= 1 && dom <= 7) || (dom >= 15 && dom <= 22) || (dom >= 29 && dom <= 31)) {
              setPrStartDate(d.toISOString().slice(0, 10));
              break;
            }
          }
          d.setDate(d.getDate() + 1);
        }
      } else if (freq === "Bi-Weekly B") {
        while (true) {
          if (d.getDay() === 5) {
            const dom = d.getDate();
            if ((dom >= 8 && dom <= 14) || (dom >= 23 && dom <= 28)) {
              setPrStartDate(d.toISOString().slice(0, 10));
              break;
            }
          }
          d.setDate(d.getDate() + 1);
        }
      } else if (freq === "Semi-Monthly") {
        while (true) {
          const dom = d.getDate();
          if (dom === 1 || dom === 15) {
            setPrStartDate(d.toISOString().slice(0, 10));
            break;
          }
          d.setDate(d.getDate() + 1);
        }
      } else if (freq === "Monthly") {
        while (true) {
          if (d.getDate() === 1) {
            setPrStartDate(d.toISOString().slice(0, 10));
            break;
          }
          d.setDate(d.getDate() + 1);
        }
      }
    }
    setPrReportingMethod(prSvc?.reportingMethod || "");
    setPrPayrollCategory(prSvc?.payrollCategory || "");
    setPrQbLicense(prSvc?.qbLicense || "");
    setPrReportingNotes(prSvc?.reportingNotes || "");
    // Reset notes pagination
    setNotePage(0);
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

  // ── Preserve scroll position across re-renders ──
  useEffect(() => {
    if (bodyRef.current && scrollPosRef.current > 0) {
      bodyRef.current.scrollTop = scrollPosRef.current;
    }
  });
  const saveScroll = () => {
    if (bodyRef.current) scrollPosRef.current = bodyRef.current.scrollTop;
  };

  if (!open) return null;

  const c = client;
  const typeBadge = c.type === "Business"
    ? { bg: "var(--ink)", fg: "#fff" }
    : { bg: "#dfe7e6", fg: "var(--teal-ink)" };

  // Unique assignees
  const assignees = [...new Set(
    localSvcs.filter((s: any) => s.enabled).map((s: any) => s.assignedTo || s.processor).filter(Boolean)
  )];

  // ── Helpers ──
  function getAuthorName(): string {
    if (currentUser) return currentUser;
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|;\s*)tap_demo_email=([^;]*)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
    return "You";
  }

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
      author: getAuthorName(),
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
    // If current page is now empty, go back one
    const svc = updated.find((s: any) => s.key === svcKey);
    const remaining = (svc?.comments || []).length;
    if (notePage > 0 && notePage * 3 >= remaining) {
      setNotePage(Math.max(0, Math.floor((remaining - 1) / 3)));
    }
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
    const prefix = noteType !== "others" ? `[${noteType}] ` : "";
    const comment: CommentEntry = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      month: notesMonth,
      text: prefix + notesText.trim(),
      author: getAuthorName(),
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
    setNoteType("others");
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
    // Persist to DB without triggering full page refresh
    const toggled = updated.find(s => s.key === key);
    if (toggled) {
      fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: client.id,
          services: [{ key: toggled.key, enabled: toggled.enabled, frequency: toggled.frequency, assignedTo: toggled.assignedTo, processor: toggled.processor }],
        }),
      }).catch(() => {});
    }
  }

  function freqLabel(key: string, svc: any) {
    if (!svc.enabled) return "off";
    if (moduleKey && key !== moduleKey) return "";
    if (key === "financials") return (svc.frequency || "Monthly") + " · in Financials list";
    if (key === "payroll") return (svc.frequency || "Bi-Weekly A") + " · " + (svc.processor || "-");
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
        case "delayed": return "dl";
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
        case "dl": return "delayed";
        case "dn": return "done";
        case "na": return "na";
        default: return sk;
      }
    }

    const STAGE_CYCLE = ["", "ip", "wc", "pp", "dl", "dn", "na"];

    function handleNextStage(svcKey: string, monthIdx: number) {
      if (!moduleKey) return; // read-only from Clients tab
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
                      if (!moduleKey) return;
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
                      if (!moduleKey) return;
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
                      cursor: moduleKey ? "pointer" : "default",
                      border: n > 0 ? "1px solid var(--green)" : "1px solid transparent",
                      position: "relative",
                    }}
                    title={`${mo}: ${n} processed${moduleKey ? " — click +1, right-click -1" : ""}`}
                  >
                    {n || "·"}
                    {cmt && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveCommentSvc(svcKey); setActiveCommentMonth(i); setCommentText(""); }}
                        className="cdot"
                        style={{ all: "unset", cursor: "pointer", position: "absolute", top: 1, right: 1, width: 6, height: 6, borderRadius: "50%", background: "var(--blue)", boxShadow: "0 0 0 1.5px #fff", zIndex: 2 }}
                        title={`Comments for ${mo}`}
                      />
                    )}
                  </div>
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
            const t = stage === "" ? "·" : stage === "ip" ? "•" : stage === "wc" ? "⏳" : stage === "pp" ? "✓" : stage === "dl" ? "!" : (stage === "dn" ? (isTaxReturns ? "📋" : "✓") : stage === "na" ? "–" : "");
            const hasDelayBorder = stage === "dl";
            const cmt = hasComment(svcKey, i);
            return (
              <div key={mo} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{mo}</div>
                <div
                  onClick={() => handleNextStage(svcKey, i)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: `1px solid ${hasDelayBorder ? "var(--red)" : style.border}`,
                    background: stage === "na" ? `repeating-linear-gradient(45deg, ${style.bg} 0px, ${style.bg} 3px, #c0c4cc40 3px, #c0c4cc40 5px)` : style.bg,
                    color: style.fg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto", fontWeight: 700, fontSize: 14, userSelect: "none",
                    cursor: moduleKey ? "pointer" : "default",
                    boxShadow: hasDelayBorder ? "0 0 0 2px var(--red)" : "none",
                    position: "relative",
                  }}
                  title={`${mo} — ${hasDelayBorder ? "DELAYED · " : ""}${stageLabel}${moduleKey ? " — click to cycle" : ""}`}
                >
                  {t}
                  {cmt && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveCommentSvc(svcKey); setActiveCommentMonth(i); setCommentText(""); }}
                      className="cdot"
                      style={{ all: "unset", cursor: "pointer", position: "absolute", top: 1, right: 1, width: 6, height: 6, borderRadius: "50%", background: "var(--blue)", boxShadow: "0 0 0 1.5px #fff", zIndex: 2 }}
                      title={`Comments for ${mo}`}
                    />
                  )}
                </div>
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
    const isFin = svc.key === "financials";
    const isT9 = svc.key === "1099s";
    const isRend = svc.key === "renditions";

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
                {/* Assignee + Processor row */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Assigned To</label>
                    <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)" }}
                      value={svc.assignedTo || svc.processor || ""}
                      onChange={e => setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, assignedTo: e.target.value } : s))}
                    >
                      <option value="">—</option>
                      {profiles.map((p: any) => <option key={p.id} value={p.name}>{firstName(p.name)}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Processor</label>
                    <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)" }}
                      value={svc.processor || ""}
                      onChange={e => setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, processor: e.target.value } : s))}
                    >
                      <option value="">—</option>
                      <option value="Quickbooks Desktop 24">Quickbooks Desktop 24</option>
                      <option value="Quickbooks Desktop">Quickbooks Desktop</option>
                      <option value="ADP">ADP</option>
                      <option value="QBO">QBO</option>
                    </select>
                  </div>
                </div>
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
                {/* New payroll fields row */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Pay Period Freq</label>
                    <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)" }}
                      value={prPeriodFreq}
                      onChange={e => {
                        setPrPeriodFreq(e.target.value);
                        setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payPeriodFrequency: e.target.value, frequency: e.target.value } : s));
                      }}
                    >
                      <option value="">—</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Bi-Weekly A">Bi-Weekly A</option>
                    <option value="Bi-Weekly B">Bi-Weekly B</option>
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Reporting Notes</label>
                  <textarea style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)", minHeight: 50, resize: "vertical" }}
                    value={prReportingNotes}
                    onChange={e => {
                      setPrReportingNotes(e.target.value);
                      setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, reportingNotes: e.target.value } : s));
                    }}
                    placeholder="Add notes about payroll filing/reporting..."
                  />
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
                    <input style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "#fff" }}
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

            {/* Financials: cadence + Assigned To */}
            {isFin && svc.enabled && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: "1 0 100px" }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Cadence</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={svc.frequency || "Monthly"}
                    onChange={e => setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "financials" ? { ...s, frequency: e.target.value } : s))}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                  </select>
                </div>
                <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Assigned To</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={svc.assignedTo || svc.processor || ""}
                    onChange={e => setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "financials" ? { ...s, assignedTo: e.target.value } : s))}
                  >
                    <option value="">—</option>
                    {profiles.map((p: any) => <option key={p.id} value={p.name}>{firstName(p.name)}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* 1099s: expected annual + Assigned To */}
            {isT9 && svc.enabled && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: "1 0 100px" }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Expected Annual</label>
                  <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    type="number" value={svc.expectedAnnual || 0}
                    onChange={e => setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "1099s" ? { ...s, expectedAnnual: Number(e.target.value) } : s))}
                    placeholder="0"
                  />
                </div>
                <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Assigned To</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={svc.assignedTo || svc.processor || ""}
                    onChange={e => setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "1099s" ? { ...s, assignedTo: e.target.value } : s))}
                  >
                    <option value="">—</option>
                    {profiles.map((p: any) => <option key={p.id} value={p.name}>{firstName(p.name)}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Tax Returns: filing details + Assigned To */}
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
                <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Assigned To</label>
                  <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--paper)" }}
                    value={svc.assignedTo || svc.processor || ""}
                    onChange={e => setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "tax_returns" ? { ...s, assignedTo: e.target.value } : s))}
                  >
                    <option value="">—</option>
                    {profiles.map((p: any) => <option key={p.id} value={p.name}>{firstName(p.name)}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Renditions: Assigned To only */}
            {isRend && svc.enabled && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 0 100px", minWidth: 100 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Assigned To</label>
                    <select style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "var(--paper)" }}
                      value={svc.assignedTo || svc.processor || ""}
                      onChange={e => setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "renditions" ? { ...s, assignedTo: e.target.value } : s))}
                    >
                      <option value="">—</option>
                      {profiles.map((p: any) => <option key={p.id} value={p.name}>{firstName(p.name)}</option>)}
                    </select>
                  </div>
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
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name <span style={{ color: "var(--red,#e74c3c)" }}>*</span></label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxName} onChange={e => setNewStxName(e.target.value)} placeholder="e.g. Texas Sales Tax" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RT # <span style={{ color: "var(--red,#e74c3c)" }}>*</span></label>
                        <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxRt} onChange={e => setNewStxRt(e.target.value)} placeholder="e.g. 123456" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Tax ID <span style={{ color: "var(--red,#e74c3c)" }}>*</span></label>
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
                      <button className="reveal" style={{
                        all: "unset", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontWeight: 600, fontSize: 12,
                        background: (!newStxName.trim() || !newStxRt.trim() || !newStxTaxId.trim()) ? "var(--line,#d8d2c4)" : "var(--ink)",
                        color: (!newStxName.trim() || !newStxRt.trim() || !newStxTaxId.trim()) ? "var(--muted,#aaa)" : "#fff",
                      }}
                        disabled={!newStxName.trim() || !newStxRt.trim() || !newStxTaxId.trim()}
                        onClick={() => {
                          const upd = [...stxLineItems, {
                            serviceName: newStxName.trim(), rt: newStxRt.trim(), taxId: newStxTaxId.trim(),
                            bankName: newStxBank.trim(), bankRouting: newStxRouting.trim(), bankAccount: newStxAccount.trim(),
                            frequency: newStxFreq,
                          }];
                          setStxLineItems(upd);
                          setLocalSvcs(prev => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
                          onSave?.({ ...client, services: localSvcs.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s) } as Client);
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
                        editingStxIdx === i ? (
                          <div key={i} style={{ background: "var(--paper)", border: "1px solid var(--teal)", borderRadius: 8, padding: 10 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Service name</label>
                                <input style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxName} onChange={e => setEditStxName(e.target.value)} />
                              </div>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>RT #</label>
                                <input style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxRt} onChange={e => setEditStxRt(e.target.value)} />
                              </div>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Tax ID</label>
                                <input style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxTaxId} onChange={e => setEditStxTaxId(e.target.value)} />
                              </div>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Frequency</label>
                                <select style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxFreq} onChange={e => setEditStxFreq(e.target.value)}>
                                  <option>Monthly</option><option>Quarterly</option><option>Annually</option>
                                </select>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Bank name</label>
                                <input style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxBank} onChange={e => setEditStxBank(e.target.value)} />
                              </div>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Routing #</label>
                                <input style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxRouting} onChange={e => setEditStxRouting(e.target.value)} />
                              </div>
                              <div>
                                <label style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Account #</label>
                                <input style={{ width: "100%", padding: "5px 7px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }} value={editStxAccount} onChange={e => setEditStxAccount(e.target.value)} />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button className="reveal" style={{ all: "unset", cursor: "pointer", color: "var(--muted)", fontWeight: 600, fontSize: 11, padding: "4px 8px" }}
                                onClick={() => setEditingStxIdx(-1)}>Cancel</button>
                              <button className="reveal" style={{ all: "unset", cursor: "pointer", background: "var(--teal)", color: "#fff", fontWeight: 600, fontSize: 11, padding: "4px 10px", borderRadius: 6 }}
                                onClick={() => {
                                  if (!editStxName.trim()) return;
                                  const upd = [...stxLineItems];
                                  upd[i] = {
                                    ...upd[i],
                                    serviceName: editStxName.trim(), rt: editStxRt.trim(), taxId: editStxTaxId.trim(),
                                    bankName: editStxBank.trim(), bankRouting: editStxRouting.trim(), bankAccount: editStxAccount.trim(),
                                    frequency: editStxFreq,
                                  };
                                  setStxLineItems(upd);
                                  setLocalSvcs(prev => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
                                  onSave?.({ ...client, services: localSvcs.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s) } as Client);
                                  setEditingStxIdx(-1);
                                }}>
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={i} style={{
                            display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
                            background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px",
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{item.serviceName}</div>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                                {item.rt && <span>RT: {item.rt}</span>}
                                {item.taxId && <span>Tax ID: {item.taxId}</span>}
                                {item.frequency && <span>{item.frequency}</span>}
                                {item.bankName && <span>{item.bankName} {item.bankRouting && `· ${item.bankRouting}`} {item.bankAccount && `· ${item.bankAccount}`}</span>}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="reveal" style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600, fontSize: 11 }}
                                onClick={() => {
                                  setEditingStxIdx(i);
                                  setEditStxName(item.serviceName || "");
                                  setEditStxRt(item.rt || "");
                                  setEditStxTaxId(item.taxId || "");
                                  setEditStxBank(item.bankName || "");
                                  setEditStxRouting(item.bankRouting || "");
                                  setEditStxAccount(item.bankAccount || "");
                                  setEditStxFreq(item.frequency || "Monthly");
                                }}
                              >Edit</button>
                              <button className="reveal" style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: 11 }}
                                onClick={() => {
                                  const upd = stxLineItems.filter((_, j) => j !== i);
                                  setStxLineItems(upd);
                                  setLocalSvcs(prev => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
                                  onSave?.({ ...client, services: localSvcs.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s) } as Client);
                                }}
                              >✕</button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Legend + Month cells — skip for sales tax (handled by line items) */}
            {!isSalesTax && (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // MODULE-SPECIFIC VIEW (from worklist — shows detail for one module)
  // ══════════════════════════════════════════════════════════════
  if (moduleKey) {
    const targetSvc = localSvcs.find((s: any) => s.key === moduleKey);
    if (!targetSvc) return null;

    // Resolve short/partial name to full profile name so select matches correctly
    const svcAssignee = targetSvc.assignedTo || targetSvc.processor || "Unassigned";
    const resolvedAssignee = svcAssignee !== "Unassigned" && !profiles.some((p: any) => p.name === svcAssignee)
      ? profiles.find((p: any) => {
          const parts = p.name.split(",").map((s: string) => s.trim().toLowerCase());
          const svc = svcAssignee.toLowerCase();
          return p.name.toLowerCase().includes(svc) || parts.some((part: string) => svc.includes(part));
        })?.name || svcAssignee
      : svcAssignee;

    function handleAddNoteForModule() {
      if (!notesText.trim()) return;
      const prefix = noteType !== "others" ? `[${noteType}] ` : "";
      const comment: CommentEntry = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        month: notesMonth,
        text: prefix + notesText.trim(),
        author: getAuthorName(),
        createdAt: new Date().toISOString(),
      };
      const updated = localSvcs.map((s: any) => {
        if (s.key === moduleKey) {
          const existing = s.comments || [];
          return { ...s, comments: [...existing, comment] };
        }
        return s;
      });
      setLocalSvcs(updated);
      setNotesText("");
      setNoteType("others");
      // Jump to last page so new note is visible
      const targetSvc = updated.find((s: any) => s.key === moduleKey);
      const newTotal = (targetSvc?.comments || []).length;
      setNotePage(Math.floor(Math.max(0, newTotal - 1) / 3));
      onSave?.({ ...client, services: updated } as Client);
    }

    function saveClientInfo() {
      setShowEditClient(false);
      onSave?.({
        ...c,
        name: eName, type: eType as "Business" | "Personal", group: eGroup,
        emails: [eEmail, eAddEmail].filter(Boolean),
        phones: [ePhone, eAddPhone].filter(Boolean),
        address: eAddress, city: eCity, state: eState, zip: eZip,
        assignedStaff: eAssigned,
        services: localSvcs,
      } as Client);
    }

    function handleSaveModule() {
      setSaving(true);
      // Ensure payroll separate state is synced into localSvcs before saving
      const synced = localSvcs.map((s: any) => {
        if (s.key === "payroll") {
          return {
            ...s,
            paydate: prPaydate,
            pay_start_date: prStartDate,
            payrollPassword: prPin,
            eftps: prEftps,
            payEmails: prEmails,
            payPeriodFrequency: prPeriodFreq,
            frequency: prPeriodFreq,
            reportingMethod: prReportingMethod,
            payrollCategory: prPayrollCategory,
            qbLicense: prQbLicense,
            reportingNotes: prReportingNotes,
          };
        }
        if (s.key === "tax_returns") {
          return { ...s, filingState, filingMonth, filingType };
        }
        return s;
      });
      onSave?.({
        ...c,
        services: synced,
        // Also include client-level edits if Full client record was edited
        name: eName, type: eType as "Business" | "Personal", group: eGroup,
        emails: [eEmail, eAddEmail].filter(Boolean),
        phones: [ePhone, eAddPhone].filter(Boolean),
        address: eAddress, city: eCity, state: eState, zip: eZip,
        assignedStaff: eAssigned,
      } as Client);
      setToast("Changes saved");
      setTimeout(() => { setToast(null); setSaving(false); }, 2500);
    }

    // ── Sales tax line item section ──
    function SalesTaxLineItemsSection() {
      const [editingStxIdx, setEditingStxIdx] = useState(-1);
      const [editStxName, setEditStxName] = useState("");
      const [editStxFreq, setEditStxFreq] = useState("Monthly");
      const [editStxRt, setEditStxRt] = useState("");
      const [editStxTaxId, setEditStxTaxId] = useState("");
      const [editStxBank, setEditStxBank] = useState("");
      const [editStxRouting, setEditStxRouting] = useState("");
      const [editStxAccount, setEditStxAccount] = useState("");
      const [stxNoteText, setStxNoteText] = useState<Record<number, string>>({});
      const [stxNoteMonth, setStxNoteMonth] = useState<Record<number, number>>({});

      function startEdit(i: number) {
        const item = stxLineItems[i];
        setEditingStxIdx(i);
        setEditStxName(item.serviceName || "");
        setEditStxFreq(item.frequency || "Monthly");
        setEditStxRt(item.rt || "");
        setEditStxTaxId(item.taxId || "");
        setEditStxBank(item.bankName || "");
        setEditStxRouting(item.bankRouting || "");
        setEditStxAccount(item.bankAccount || "");
      }

      function saveEditItem() {
        if (editingStxIdx < 0 || !editStxName.trim()) return;
        const upd = [...stxLineItems];
        upd[editingStxIdx] = {
          ...upd[editingStxIdx],
          serviceName: editStxName.trim(), rt: editStxRt.trim(), taxId: editStxTaxId.trim(),
          bankName: editStxBank.trim(), bankRouting: editStxRouting.trim(), bankAccount: editStxAccount.trim(),
          frequency: editStxFreq,
        };
        setStxLineItems(upd);
        setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
        onSave?.({
          ...client,
          services: localSvcs.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s),
        } as Client);
        setEditingStxIdx(-1);
      }

      function removeItem(i: number) {
        const upd = stxLineItems.filter((_: any, j: number) => j !== i);
        setStxLineItems(upd);
        setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
        onSave?.({
          ...client,
          services: localSvcs.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s),
        } as Client);
      }

      function addStxNote(itemIdx: number) {
        const text = stxNoteText[itemIdx]?.trim();
        if (!text) return;
        const month = stxNoteMonth[itemIdx] ?? new Date().getMonth();
        const comment: CommentEntry & { _lineItemKey?: string } = {
          id: `stx-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          month,
          text,
          author: getAuthorName(),
          createdAt: new Date().toISOString(),
          _lineItemKey: `stx-item-${itemIdx}`,
        };
        const updated = localSvcs.map((s: any) => {
          if (s.key === "sales_tax") {
            const existing = s.comments || [];
            return { ...s, comments: [...existing, comment] };
          }
          return s;
        });
        setLocalSvcs(updated);
        setStxNoteText((prev: any) => ({ ...prev, [itemIdx]: "" }));
        onSave?.({ ...client, services: updated } as Client);
      }

      function getStxComments(itemIdx: number): CommentEntry[] {
        const key = `stx-item-${itemIdx}`;
        const svc = localSvcs.find((s: any) => s.key === "sales_tax");
        return (svc?.comments || []).filter((cm: any) => cm._lineItemKey === key);
      }

      function stxHasComment(itemIdx: number, monthIdx: number): boolean {
        return getStxComments(itemIdx).filter((cm: CommentEntry) => cm.month === monthIdx).length > 0;
      }

      // Per-line-item month stage
      function stxMonthStage(itemIdx: number, monthIdx: number): string {
        // Return the stage of the parent sales_tax service for that month
        return (targetSvc?.months || [])[monthIdx] || "lock";
      }

      function handleStxStageClick(itemIdx: number, monthIdx: number) {
        // Same stage cycling as the parent month tracker
        const svc = localSvcs.find((s: any) => s.key === "sales_tax");
        const currentStage = (svc?.months || [])[monthIdx] || "lock";
        const STAGE_CYCLE = ["lock", "in_progress", "waiting", "billed", "delayed", "done", "na"];
        const idx = STAGE_CYCLE.indexOf(currentStage);
        const nextStage = STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length];
        const updated = localSvcs.map((s: any) =>
          s.key === "sales_tax"
            ? { ...s, months: s.months.map((m: string, i: number) => i === monthIdx ? nextStage : m) }
            : s
        );
        setLocalSvcs(updated);
        onSave?.({ ...client, services: updated } as Client);
      }

      const stxStageStyles: Record<string, { bg: string; fg: string; border: string }> = {
        lock: { bg: "transparent", fg: "#c2c8d4", border: "transparent" },
        in_progress: { bg: "var(--blue-soft)", fg: "var(--blue)", border: "#bcd0e2" },
        waiting: { bg: "var(--amber-soft)", fg: "var(--amber)", border: "#e8d3a6" },
        billed: { bg: "var(--teal-soft)", fg: "var(--teal-ink)", border: "#c5d0ec" },
        done: { bg: "var(--green-soft)", fg: "var(--green)", border: "#bcdcc6" },
        na: { bg: "var(--red-soft)", fg: "var(--red)", border: "#e8c4bf" },
      };

      function stxStageSymbol(st: string): string {
        switch (st) {
          case "lock": return "·";
          case "in_progress": return "•";
          case "waiting": return "⏳";
          case "billed": return "✓";
          case "done": return "✓";
          case "na": return "–";
          default: return "·";
        }
      }

      return (
        <div style={{ marginBottom: 12 }}>
          <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 8px" }}>
            Sales Tax Line Items
          </div>

          <button
            onClick={() => setAddingStx(!addingStx)}
            className="reveal"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", marginBottom: 8,
              border: "1px dashed var(--line)", borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: "var(--teal)",
              width: "100%", boxSizing: "border-box",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--teal)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add line item
          </button>

          {addingStx && (
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name</label>
                  <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={newStxName} onChange={e => setNewStxName(e.target.value)} placeholder="e.g. Texas Sales Tax" />
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
                    setLocalSvcs((prev: any) => prev.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s));
                    onSave?.({ ...client, services: localSvcs.map((s: any) => s.key === "sales_tax" ? { ...s, salesTaxLineItems: upd } : s) } as Client);
                    setNewStxName(""); setNewStxRt(""); setNewStxTaxId(""); setNewStxBank("");
                    setNewStxRouting(""); setNewStxAccount(""); setNewStxFreq("Monthly");
                    setAddingStx(false);
                  }}
                >Add line item</button>
              </div>
            </div>
          )}

          {stxLineItems.map((item: any, i: number) => (
            <div key={i} className="stxitem">
              {editingStxIdx === i ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Service name</label>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={editStxName} onChange={e => setEditStxName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>RT #</label>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={editStxRt} onChange={e => setEditStxRt(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Tax ID</label>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={editStxTaxId} onChange={e => setEditStxTaxId(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Bank name</label>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={editStxBank} onChange={e => setEditStxBank(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Routing #</label>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={editStxRouting} onChange={e => setEditStxRouting(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Account #</label>
                      <input style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }} value={editStxAccount} onChange={e => setEditStxAccount(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="reveal" style={{ color: "var(--muted)" }} onClick={() => setEditingStxIdx(-1)}>Cancel</button>
                    <button className="reveal" style={{ background: "var(--teal)", color: "#fff", padding: "6px 12px", borderRadius: 8 }} onClick={saveEditItem}>Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="stxih">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.serviceName}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="reveal" onClick={() => startEdit(i)} style={{ fontSize: 11 }}>Edit</button>
                      <button className="reveal" onClick={() => removeItem(i)} style={{ color: "var(--red)", fontSize: 11 }}>Remove</button>
                    </div>
                  </div>

                  <div className="stxfields">
                    <div>
                      <span className="fk">RT #</span>
                      <span className="fv mono">{item.rt || "—"}</span>
                    </div>
                    <div>
                      <span className="fk">Tax ID</span>
                      <span className="fv mono">{item.taxId || "—"}</span>
                    </div>
                    <div>
                      <span className="fk">Bank</span>
                      <span className="fv">{item.bankName || "—"}</span>
                    </div>
                    <div>
                      <span className="fk">Routing</span>
                      <span className="fv mono">{maskNum(item.bankRouting)}</span>
                    </div>
                    <div>
                      <span className="fk">Account</span>
                      <span className="fv mono">{maskNum(item.bankAccount)}</span>
                    </div>
                  </div>

                  {/* Per-line-item month tracker */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>Month tracker</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {MONTHS.map((mo, mi) => {
                        const st = stxMonthStage(i, mi);
                        const ss = stxStageStyles[st] || stxStageStyles.lock;
                        const hasCmt = stxHasComment(i, mi);
                        return (
                          <div key={mi} style={{ textAlign: "center", position: "relative" }}>
                            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 1 }}>{mo}</div>
                            <div
                              onClick={() => handleStxStageClick(i, mi)}
                              style={{
                                width: 24, height: 24, borderRadius: 6,
                                border: `1px solid ${ss.border}`,
                                background: ss.bg,
                                color: ss.fg,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700, cursor: "pointer", userSelect: "none",
                                position: "relative",
                              }}
                            >
                              {stxStageSymbol(st)}
                              {hasCmt && <div className="cdot" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-line-item notes */}
                  <div style={{ marginTop: 8 }}>
                    <div className="notemo">Notes</div>
                    {getStxComments(i).filter((cm: CommentEntry & { _lineItemKey?: string }) => cm._lineItemKey === `stx-item-${i}`).map((cm: any) => (
                      <div key={cm.id} className="note">
                        <div className="ntxt">{cm.text}</div>
                        <div className="nmeta">{cm.author} · {MONTHS[cm.month] || `Month ${cm.month + 1}`}</div>
                        <button
                          onClick={() => deleteComment("sales_tax", cm.id)}
                          style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontSize: 11, marginTop: 4, display: "block" }}
                        >× Delete</button>
                      </div>
                    ))}
                    <div className="noteadd">
                      <select value={stxNoteMonth[i] ?? new Date().getMonth()} onChange={e => setStxNoteMonth((prev: any) => ({ ...prev, [i]: Number(e.target.value) }))}
                        style={{ padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "var(--paper)" }}>
                        {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                      </select>
                      <input value={stxNoteText[i] || ""} onChange={e => setStxNoteText((prev: any) => ({ ...prev, [i]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStxNote(i); } }}
                        placeholder="Note..." style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "var(--paper)", outline: "none" }} />
                      <button onClick={() => addStxNote(i)}
                        style={{ all: "unset", cursor: "pointer", background: "var(--teal)", color: "#fff", padding: "5px 10px", borderRadius: 7, fontWeight: 600, fontSize: 12 }}>Add</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <>
        <div className="scrim show" onClick={onClose} />
        <div className="over show" style={{
          background: "var(--paper)", boxShadow: "-12px 0 40px rgba(33,31,26,.18)",
        }}>
          {/* Toast notification */}
          {toast && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 100,
              background: "var(--teal)", color: "#fff", padding: "8px 20px", borderRadius: 20,
              fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.15)",
              animation: "fadeIn .25s ease",
              pointerEvents: "none",
            }}>{toast}</div>
          )}
          {/* Header */}
          <div className="ohead" style={{
            padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", background: "var(--card)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div className="nm" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 23, lineHeight: 1.12 }}>{c.name}</div>
              <button className="ox" onClick={onClose} style={{ all: "unset", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1 }}>×</button>
            </div>
            <div className="sub" style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>
              <span className="badge b-biz" style={{
                fontSize: "10.5px", fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: typeBadge.bg, color: typeBadge.fg, marginLeft: 6,
              }}>{c.type === "Business" ? "BIZ" : "PERS"}</span>
            </div>
          </div>

          {/* Body */}
          <div className="obody" ref={bodyRef} onScroll={saveScroll} style={{ overflowY: "auto", padding: "20px 24px 30px", flex: 1 }}>
            {/* Module tag badge */}
            <span className="modtag" style={{ marginBottom: 12 }}>{svcIc(moduleKey)} {svcLabel(moduleKey)}</span>

            {/* Per-service assignee selector */}
            <div style={{ marginBottom: 12 }}>
              <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 8px" }}>
                Assigned To
              </div>
              <select className="ef" style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "#fff" }}
                value={resolvedAssignee}
                onChange={e => {
                  setESvcAssignees((prev: any) => ({ ...prev, [moduleKey]: e.target.value }));
                  setLocalSvcs((prev: any) => prev.map((s: any) =>
                    s.key === moduleKey ? { ...s, assignedTo: e.target.value } : s
                  ));
                }}
              >
                {profiles.map((m) => {
                  const displayName = firstName(m.name);
                  return <option key={m.id} value={m.name}>{displayName}</option>;
                })}
                <option>Unassigned</option>
              </select>
            </div>

            {/* Frequency/Cadence for non-payroll services */}
            {moduleKey !== "payroll" && targetSvc.enabled && (
              <div style={{ marginBottom: 12 }}>
                <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 8px" }}>
                  Details
                </div>
                {/* Cadence for Financials only (1099s is always Annual) */}
                {moduleKey === "financials" && (
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                    <span className="k" style={{ color: "var(--muted)" }}>Cadence</span>
                    <select style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", cursor: "pointer" }}
                      value={targetSvc.frequency || "Monthly"} onChange={e => setLocalSvcs(prev => prev.map((s: any) => s.key === moduleKey ? { ...s, frequency: e.target.value } : s))}>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annual">Annual</option>
                      <option value="Semi-Monthly">Semi-Monthly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                    </select>
                  </div>
                )}
                {/* Expected Annual for 1099s */}
                {moduleKey === "1099s" && (
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                    <span className="k" style={{ color: "var(--muted)" }}>Expected Annual</span>
                    <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                      type="number" value={targetSvc.expectedAnnual || 0} onChange={e => setLocalSvcs(prev => prev.map((s: any) => s.key === "1099s" ? { ...s, expectedAnnual: Number(e.target.value) } : s))} placeholder="0" />
                  </div>
                )}
              </div>
            )}

            {/* Payroll: credentials section */}
            {moduleKey === "payroll" && targetSvc.enabled && (
              <>
                <div className="sect" style={sectStyle}>Payroll Details</div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Frequency</span>
                  <select style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", cursor: "pointer" }}
                    value={prPeriodFreq} onChange={e => {
                      const val = e.target.value;
                      setPrPeriodFreq(val);
                      setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payPeriodFrequency: val, frequency: val } : s));
                      // Auto-set start date based on cadence
                      if (val) {
                        const today = new Date();
                        let d = new Date(today);
                        d.setDate(d.getDate() + 1);
                        if (val === "Weekly") {
                          while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
                          const iso = d.toISOString().slice(0, 10);
                          setPrStartDate(iso);
                          setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, pay_start_date: iso } : s));
                        } else if (val === "Bi-Weekly" || val === "Bi-Weekly A") {
                          while (true) {
                            if (d.getDay() === 5) {
                              const dom = d.getDate();
                              if ((dom >= 1 && dom <= 7) || (dom >= 15 && dom <= 22) || (dom >= 29 && dom <= 31)) {
                                const iso = d.toISOString().slice(0, 10);
                                setPrStartDate(iso);
                                setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, pay_start_date: iso } : s));
                                break;
                              }
                            }
                            d.setDate(d.getDate() + 1);
                          }
                        } else if (val === "Bi-Weekly B") {
                          while (true) {
                            if (d.getDay() === 5) {
                              const dom = d.getDate();
                              if ((dom >= 8 && dom <= 14) || (dom >= 23 && dom <= 28)) {
                                const iso = d.toISOString().slice(0, 10);
                                setPrStartDate(iso);
                                setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, pay_start_date: iso } : s));
                                break;
                              }
                            }
                            d.setDate(d.getDate() + 1);
                          }
                        } else if (val === "Semi-Monthly") {
                          // Next 1st or 15th
                          while (true) {
                            const dom = d.getDate();
                            if (dom === 1 || dom === 15) {
                              const iso = d.toISOString().slice(0, 10);
                              setPrStartDate(iso);
                              setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, pay_start_date: iso } : s));
                              break;
                            }
                            d.setDate(d.getDate() + 1);
                          }
                        } else if (val === "Monthly") {
                          // Next 1st of month
                          while (true) {
                            if (d.getDate() === 1) {
                              const iso = d.toISOString().slice(0, 10);
                              setPrStartDate(iso);
                              setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, pay_start_date: iso } : s));
                              break;
                            }
                            d.setDate(d.getDate() + 1);
                          }
                        }
                      }
                    }}>
                    <option value="">—</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Bi-Weekly A">Bi-Weekly A</option>
                    <option value="Bi-Weekly B">Bi-Weekly B</option>
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Pay Day</span>
                  <select style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", cursor: "pointer" }}
                    value={prPaydate} onChange={e => { setPrPaydate(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, paydate: e.target.value } : s)); }}>
                    <option value="">—</option>
                    {payDayOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Start Date</span>
                  <input type="date" style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "var(--paper)", color: "var(--ink)", fontWeight: 500, outline: "none", cursor: "default" }}
                    value={prStartDate} readOnly />
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Processor</span>
                  <select style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", cursor: "pointer" }}
                    value={targetSvc?.processor || ""} onChange={e => setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, processor: e.target.value } : s))}>
                    <option value="">—</option>
                    <option value="Quickbooks Desktop 24">Quickbooks Desktop 24</option>
                    <option value="Quickbooks Desktop">Quickbooks Desktop</option>
                    <option value="ADP">ADP</option>
                    <option value="QBO">QBO</option>
                  </select>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>EFTPS Password</span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input style={{ width: "100%", textAlign: "left", padding: "4px 30px 4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", fontFamily: "var(--mono)" }}
                      type={showPrEftps ? "text" : "password"} value={prEftps || ""}
                      onChange={e => { setPrEftps(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, eftps: e.target.value } : s)); }} placeholder="—" />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPrEftps(!showPrEftps)}
                      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", fontSize: 15, lineHeight: 1 }}>
                      {showPrEftps ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>PIN</span>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input style={{ width: "100%", textAlign: "left", padding: "4px 30px 4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", fontFamily: "var(--mono)" }}
                      type={showPrPin ? "text" : "password"} value={prPin || ""}
                      onChange={e => { setPrPin(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payrollPassword: e.target.value } : s)); }} placeholder="—" />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPrPin(!showPrPin)}
                      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", fontSize: 15, lineHeight: 1 }}>
                      {showPrPin ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Payroll email</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                      {prEmails.filter(Boolean).map((em, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--blue-soft)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>
                          {em}
                          <button onClick={() => { const upd = prEmails.filter((_, j) => j !== i); setPrEmails(upd); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, payEmails: upd } : s)); }}
                            style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontSize: 12, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                    <input style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, background: "#fff", outline: "none", boxSizing: "border-box" }}
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
                      placeholder="Type email + Enter to add" />
                  </div>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Reporting Notes</span>
                  <textarea style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", minHeight: 50, resize: "vertical" }}
                    value={prReportingNotes}
                    onChange={e => { setPrReportingNotes(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, reportingNotes: e.target.value } : s)); }}
                    placeholder="Add notes about payroll filing/reporting..." />
                </div>
              </>
            )}

            {/* Tax return details */}
            {moduleKey === "tax_returns" && targetSvc.enabled && (
              <>
                <div className="sect" style={sectStyle}>Tax Return Details</div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Filing Type</span>
                  <select value={filingType} onChange={e => { setFilingType(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "tax_returns" ? { ...s, filingType: e.target.value } : s)); }}
                    style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}>
                    <option value="">—</option>
                    {FILING_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Filing State</span>
                  <select value={filingState} onChange={e => { setFilingState(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "tax_returns" ? { ...s, filingState: e.target.value } : s)); }}
                    style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}>
                    <option value="">—</option>
                    {US_STATES.map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>
                <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13.5px", borderBottom: "1px dashed #e7e1d3" }}>
                  <span className="k" style={{ color: "var(--muted)" }}>Filing Month</span>
                  <select value={filingMonth} onChange={e => { setFilingMonth(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "tax_returns" ? { ...s, filingMonth: e.target.value } : s)); }}
                    style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}>
                    <option value="">—</option>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Sales Tax: line items section — only on Sales Tax tab */}
            {moduleKey === "sales_tax" && targetSvc.enabled && <SalesTaxLineItemsSection />}

            {/* Service notes from DB */}
            {targetSvc.svcNotes && (
              <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--amber-soft)", borderRadius: 10, fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>
                <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4 }}>Service Notes (DB)</div>
                {targetSvc.svcNotes}
              </div>
            )}

            {/* Notes section — skip for sales tax (notes go on line items) */}
            {moduleKey !== "sales_tax" && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <div className="notemo">Notes for {svcLabel(moduleKey)}</div>
              <div className="noteadd">
                <select value={notesMonth} onChange={e => setNotesMonth(Number(e.target.value))}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)" }}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={noteType} onChange={e => setNoteType(e.target.value)}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)" }}>
                  {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={notesText} onChange={e => setNotesText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddNoteForModule(); } }}
                  placeholder="Add a note..." style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)", outline: "none" }} />
                <button onClick={handleAddNoteForModule}
                  style={{ all: "unset", cursor: "pointer", background: "var(--teal)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>
                  Add
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                {(() => {
                  const svc = localSvcs.find((s: any) => s.key === moduleKey);
                  const allComments = (svc?.comments || []).sort((a: CommentEntry, b: CommentEntry) => a.month - b.month);
                  const PER_PAGE = 3;
                  const totalPages = Math.ceil(allComments.length / PER_PAGE);
                  const pageComments = allComments.slice(notePage * PER_PAGE, (notePage + 1) * PER_PAGE);
                  return allComments.length > 0 ? (
                    <div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: totalPages > 1 ? 8 : 0 }}>
                        {pageComments.map((cm: CommentEntry) => (
                          <div key={cm.id} className="note">
                            <div className="ntxt">{cm.text}</div>
                            <div className="nmeta">{MONTHS[cm.month]} · {cm.author} · {new Date(cm.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                            <button onClick={() => deleteComment(moduleKey, cm.id)}
                              style={{ all: "unset", cursor: "pointer", color: "var(--red)", fontSize: 11, marginTop: 4, display: "block" }}>
                              × Delete
                            </button>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12 }}>
                          <button onClick={() => setNotePage(p => Math.max(0, p - 1))} disabled={notePage === 0}
                            style={{ all: "unset", cursor: notePage === 0 ? "default" : "pointer", padding: "3px 8px", borderRadius: 5, border: "1px solid var(--line)", color: notePage === 0 ? "var(--muted)" : "var(--ink)", fontSize: 11, opacity: notePage === 0 ? 0.4 : 1 }}>
                            ← Prev
                          </button>
                          <span style={{ color: "var(--muted)", fontWeight: 500 }}>{notePage + 1} / {totalPages}</span>
                          <button onClick={() => setNotePage(p => Math.min(totalPages - 1, p + 1))} disabled={notePage >= totalPages - 1}
                            style={{ all: "unset", cursor: notePage >= totalPages - 1 ? "default" : "pointer", padding: "3px 8px", borderRadius: 5, border: "1px solid var(--line)", color: notePage >= totalPages - 1 ? "var(--muted)" : "var(--ink)", fontSize: 11, opacity: notePage >= totalPages - 1 ? 0.4 : 1 }}>
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>No notes yet.</div>
                  );
                })()}
              </div>
            </div>
            )}

            {/* Full client record */}
            <div style={{ marginTop: 20 }}>
              <button className="reveal" onClick={() => {
                setShowFullRecord((p) => !p);
              }} style={{ fontWeight: 600, fontSize: 13 }}>
                {showFullRecord ? "▲ Hide" : "▶ Full client record"}
              </button>

              {showFullRecord && (
                <div style={{ marginTop: 12, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--card)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>Client Info</div>
                    {!showEditClient ? (
                      <button className="reveal" onClick={() => setShowEditClient(true)} style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600, fontSize: "12px" }}>
                        ✎ Edit
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="reveal" onClick={saveClientInfo} style={{ all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff", padding: "4px 10px", borderRadius: 7, fontWeight: 600, fontSize: "11px" }}>
                          Save
                        </button>
                        <button className="reveal" onClick={() => setShowEditClient(false)} style={{ all: "unset", cursor: "pointer", color: "var(--muted)", fontWeight: 600, fontSize: "11px" }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13px", borderBottom: "1px dashed #e7e1d3" }}>
                    <span style={{ color: "var(--muted)" }}>Email</span>
                    {showEditClient ? (
                      <input style={{ flex: 1, textAlign: "left", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                        value={eEmail} onChange={e => setEEmail(e.target.value)} placeholder="—" />
                    ) : (
                      <span style={{ fontWeight: 500 }}>{eEmail || "—"}</span>
                    )}
                  </div>
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13px", borderBottom: "1px dashed #e7e1d3" }}>
                    <span style={{ color: "var(--muted)" }}>Phone</span>
                    {showEditClient ? (
                      <input style={{ flex: 1, textAlign: "left", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                        value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="—" />
                    ) : (
                      <span style={{ fontWeight: 500 }}>{ePhone || "—"}</span>
                    )}
                  </div>
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13px", borderBottom: "1px dashed #e7e1d3" }}>
                    <span style={{ color: "var(--muted)" }}>Address</span>
                    {showEditClient ? (
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <input style={{ width: "100%", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none", marginBottom: 3, boxSizing: "border-box" }}
                          value={eAddress} onChange={e => setEAddress(e.target.value)} placeholder="Address" />
                        <div style={{ display: "flex", gap: 3 }}>
                          <input style={{ flex: 1, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                            value={eCity} onChange={e => setECity(e.target.value)} placeholder="City" />
                          <input style={{ width: 44, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                            value={eState} onChange={e => setEState(e.target.value)} placeholder="ST" />
                          <input style={{ width: 65, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                            value={eZip} onChange={e => setEZip(e.target.value)} placeholder="ZIP" />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 500, textAlign: "left" }}>{[eAddress, eCity, eState, eZip].filter(Boolean).join(", ") || "—"}</span>
                    )}
                  </div>
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13px", borderBottom: "1px dashed #e7e1d3" }}>
                    <span style={{ color: "var(--muted)" }}>Assigned To</span>
                    {showEditClient ? (
                      <select style={{ flex: 1, textAlign: "left", padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                        value={eAssigned} onChange={e => { setEAssigned(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, assignedTo: e.target.value } : s)); }}>
                        {profiles.map((m) => <option key={m.id} value={m.name}>{firstName(m.name)}</option>)}
                        <option>Unassigned</option>
                      </select>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{eAssigned || "—"}</span>
                    )}
                  </div>
                  <div className="field" style={{ display: "flex", justifyContent: "flex-start", gap: 14, padding: "7px 0", fontSize: "13px" }}>
                    <span style={{ color: "var(--muted)" }}>EIN</span>
                    <span style={{ fontWeight: 500, fontFamily: "var(--mono)" }}>{c.ein || "—"}</span>
                  </div>
                </div>
              )}
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
            <button className="btn" onClick={handleSaveModule} disabled={saving} style={{
              all: "unset", cursor: saving ? "default" : "pointer",
              background: saving ? "var(--muted)" : "var(--ink)",
              color: "#fff",
              padding: "10px 20px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saved" : "Save"}
            </button>
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
  // UNIVERSAL DETAIL VIEW (shows fields with edit toggle)
  // ══════════════════════════════════════════════════════════════
  if (!moduleKey) {
    const prSvc = localSvcs.find((s: any) => s.key === "payroll");

    function handleSave() {
      if (!editing) return;
      const updatedSvcs = localSvcs.map((s: any) => {
        let updated = s;
        if (s.key === "payroll") {
          updated = { ...updated, paydate: prPaydate, pay_start_date: prStartDate, payrollPassword: prPin, eftps: prEftps, payEmails: prEmails, payPeriodFrequency: prPeriodFreq, frequency: prPeriodFreq };
        }
        if (s.key === "tax_returns") {
          updated = { ...updated, filingState, filingMonth, filingType };
        }
        return updated;
      });
      onSave?.({
        ...c,
        name: eName,
        type: eType as "Business" | "Personal",
        group: eGroup,
        emails: [...new Set([eEmail, eAddEmail].filter(Boolean))],
        phones: [ePhone, eAddPhone].filter(Boolean),
        address: eAddress, city: eCity, state: eState, zip: eZip,
        assignedStaff: eAssigned,
        services: updatedSvcs,
      } as Client);
      setEditing(false);
    }

    return (
      <>
        <div className="scrim show" onClick={() => { if (editing) handleSave(); onClose(); }} />
        <div className="over show" style={{
          background: "var(--paper)", boxShadow: "-12px 0 40px rgba(33,31,26,.18)",
        }}>
          {/* Toast notification */}
          {toast && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 100,
              background: "var(--teal)", color: "#fff", padding: "8px 20px", borderRadius: 20,
              fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,.15)",
              animation: "fadeIn .25s ease",
              pointerEvents: "none",
            }}>{toast}</div>
          )}
          {/* Header */}
          <div className="ohead" style={{
            padding: "22px 24px 16px", borderBottom: "1px solid var(--line)", background: "var(--card)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div className="nm" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 23, lineHeight: 1.12 }}>{c.name}</div>
              <button className="ox" onClick={() => { if (editing) handleSave(); onClose(); }} style={{ all: "unset", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1 }}>×</button>
            </div>
          </div>

          {/* Body */}
          <div className="obody" ref={bodyRef} onScroll={saveScroll} style={{ overflowY: "auto", padding: "20px 24px 30px", flex: 1 }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="sect" style={{ marginTop: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Details
              </div>
              {!editing ? (
                <button className="reveal" onClick={() => setEditing(true)} style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600, fontSize: "12.5px" }}>
                  ✎ Edit details
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>Editing...</span>
              )}
            </div>

            {/* Email */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>Email</span>
              <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                value={eEmail} onChange={e => setEEmail(e.target.value)} disabled={!editing} placeholder="—" />
            </div>
            {/* Additional email */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>Additional email</span>
              <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                value={eAddEmail} onChange={e => setEAddEmail(e.target.value)} disabled={!editing} placeholder="—" />
            </div>
            {/* Phone */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>Phone</span>
              <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                value={ePhone} onChange={e => setEPhone(e.target.value)} disabled={!editing} placeholder="—" />
            </div>
            {/* Additional phone */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>Additional phone</span>
              <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                value={eAddPhone} onChange={e => setEAddPhone(e.target.value)} disabled={!editing} placeholder="—" />
            </div>

            {/* Assigned */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>Assigned To</span>
              <select style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none", cursor: editing ? "pointer" : "default" }}
                value={eAssigned} onChange={e => { setEAssigned(e.target.value); setLocalSvcs(prev => prev.map((s: any) => s.key === "payroll" ? { ...s, assignedTo: e.target.value } : s)); }} disabled={!editing}>
                {profiles.map((m) => <option key={m.id} value={m.name}>{firstName(m.name)}</option>)}
                <option>Unassigned</option>
              </select>
            </div>

            {/* Address */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>Address</span>
              <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                value={eAddress} onChange={e => setEAddress(e.target.value)} disabled={!editing} placeholder="—" />
            </div>

            {/* City / State / ZIP row */}
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ ...fieldStyle, flex: 2 }}>
                <span className="k" style={{ color: "var(--muted)" }}>City</span>
                <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                  value={eCity} onChange={e => setECity(e.target.value)} disabled={!editing} placeholder="—" />
              </div>
              <div className="field" style={{ ...fieldStyle, flex: 1 }}>
                <span className="k" style={{ color: "var(--muted)" }}>State</span>
                <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                  value={eState} onChange={e => setEState(e.target.value)} disabled={!editing} placeholder="—" />
              </div>
              <div className="field" style={{ ...fieldStyle, flex: 1 }}>
                <span className="k" style={{ color: "var(--muted)" }}>ZIP</span>
                <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none" }}
                  value={eZip} onChange={e => setEZip(e.target.value)} disabled={!editing} placeholder="—" />
              </div>
            </div>

            {/* EIN */}
            <div className="field" style={fieldStyle}>
              <span className="k" style={{ color: "var(--muted)" }}>EIN</span>
              <input style={{ flex: 1, textAlign: "left", padding: "4px 8px", border: editing ? "1px solid var(--line)" : "none", borderRadius: 6, fontSize: 13, background: editing ? "#fff" : "transparent", color: "var(--ink)", fontWeight: 500, outline: "none", fontFamily: "var(--mono)" }}
                value={c.ein || ""} onChange={e => { /* EIN would need API update */ }} disabled={!editing} placeholder="—" />
            </div>

            {/* ── Services ── */}
            <div style={{ marginTop: 20 }}>
              <div className="sect" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 10px" }}>
                Services
              </div>
              {localSvcs.map((svc: any) => (
                <SingleServiceCard key={svc.key} svc={svc} />
              ))}
            </div>

          </div>

          {/* Footer */}
          <div className="ofoot" style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", background: "var(--card)", display: "flex", gap: 10 }}>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} style={{
                  all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)",
                  border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11,
                  fontWeight: 600, fontSize: "13.5px",
                }}>
                  Cancel
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={handleSave} style={{
                  all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff",
                  padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px",
                }}>
                  Save changes
                </button>
              </>
            ) : (
              <>
                <button className="danger" onClick={() => { onDelete?.(c.id); onClose(); }} style={{
                  all: "unset", cursor: "pointer", color: "var(--red)", fontWeight: 600, fontSize: "13.5px",
                  padding: "10px 14px", border: "1px solid var(--red-soft)", borderRadius: 11, background: "var(--red-soft)",
                }}>
                  Remove client
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={onClose} style={{
                  all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)",
                  border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11,
                  fontWeight: 600, fontSize: "13.5px",
                }}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }
}

// ── Shared styles ──
const fieldStyle: React.CSSProperties = {
  display: "flex", justifyContent: "flex-start", gap: 14,
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
