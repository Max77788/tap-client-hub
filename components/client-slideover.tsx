"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, MonthStatus, ServiceConfig } from "@/lib/types";
import { MONTHS_SHORT, SERVICE_META } from "@/lib/data";

// ── Module-specific processor options ──
const PROCESSOR_OPTIONS: Record<string, string[]> = {
  payroll: ["ADP", "QuickBooks Payroll", "Gusto", "Paychex", "Toast", "Other"],
  financials: ["QuickBooks", "Xero", "NetSuite", "Other"],
  sales_tax: ["Avalara", "TaxJar", "Self-filed", "Other"],
  "1099s": ["Track1099", "Tax1099", "Yearli", "Other"],
  renditions: ["Manual", "Other"],
  tax_returns: ["UltraTax", "Lacerte", "ProSeries", "Other"],
};
const STATUS_COLORS: Record<MonthStatus, { bg: string; fg: string; label: string }> = {
  done:   { bg: "var(--green-soft)", fg: "var(--green)", label: "Done" },
  billed: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Billed" },
  paid:   { bg: "var(--paid-soft)",  fg: "var(--paid)",  label: "Paid" },
  na:     { bg: "var(--red-soft)",   fg: "var(--red)",   label: "N/A" },
  lock:   { bg: "transparent",       fg: "var(--muted)", label: "—" },
  in_progress: { bg: "var(--blue-soft)", fg: "var(--blue)", label: "In Progress" },
  waiting:     { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Waiting" },
};

// ── Props ──
interface ClientSlideoverProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  onSave?: (client: Client) => void;
  onDelete?: (clientId: string) => void;
}

// ── Editable client info ──
interface ClientInfo {
  name: string;
  type: "Business" | "Personal";
  group: string;
  city: string;
  state: string;
  emails: string[];
  phones: string[];
  address: string;
  assignedStaff: string;
}

export default function ClientSlideover({ client, open, onClose, onSave, onDelete }: ClientSlideoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);
  const [localServices, setLocalServices] = useState<any[]>(client.services);
  const [localInfo, setLocalInfo] = useState<ClientInfo>(() => ({
    name: client.name,
    type: client.type,
    group: client.group,
    city: client.city,
    state: client.state,
    emails: client.emails?.length ? [...client.emails] : [""],
    phones: client.phones?.length ? [...client.phones] : [],
    address: client.address,
    assignedStaff: client.assignedStaff || "",
  }));

  // Reset local state when client changes
  useEffect(() => {
    setLocalServices(client.services);
    setLocalInfo({
      name: client.name,
      type: client.type,
      group: client.group,
      city: client.city,
      state: client.state,
      emails: client.emails?.length ? [...client.emails] : [""],
      phones: client.phones?.length ? [...client.phones] : [],
      address: client.address,
      assignedStaff: client.assignedStaff || "",
    });
    setExpandedService(null);
    setEditable(false);
  }, [client]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const typeBadgeColor = localInfo.type === "Business"
    ? { bg: "var(--ink)", fg: "#fff" }
    : { bg: "#dfe7e6", fg: "var(--teal-ink)" };

  // ── Section label ──
  const sectionLabel = "text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] mb-3";

  function toggleService(key: string) {
    setLocalServices((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, enabled: !s.enabled, months: s.enabled ? Array(12).fill("lock") : s.months } : s,
      ),
    );
  }

  function updateInfo<K extends keyof ClientInfo>(key: K, value: ClientInfo[K]) {
    setLocalInfo((prev) => ({ ...prev, [key]: value }));
  }

  function updateEmail(idx: number, value: string) {
    const next = [...localInfo.emails];
    next[idx] = value;
    updateInfo("emails", next);
  }

  function addEmail() {
    if (localInfo.emails.length < 3) updateInfo("emails", [...localInfo.emails, ""]);
  }

  function removeEmail(idx: number) {
    if (localInfo.emails.length <= 1) return;
    updateInfo("emails", localInfo.emails.filter((_, i) => i !== idx));
  }

  function updatePhone(idx: number, value: string) {
    const next = [...localInfo.phones];
    next[idx] = value;
    updateInfo("phones", next);
  }

  function addPhone() {
    if (localInfo.phones.length < 3) updateInfo("phones", [...localInfo.phones, ""]);
  }

  function removePhone(idx: number) {
    updateInfo("phones", localInfo.phones.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const payload = {
      id: client.id,
      name: localInfo.name,
      type: localInfo.type,
      group: localInfo.group,
      city: localInfo.city,
      state: localInfo.state,
      emails: localInfo.emails.filter((e) => e.trim()),
      phones: localInfo.phones.filter((p) => p.trim()),
      address: localInfo.address,
    };

    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Failed to save client:", err.error);
        return;
      }
    } catch (err) {
      console.error("Failed to save client:", err);
      return;
    }

    onSave?.({ ...client, ...localInfo, services: localServices } as Client);
    setEditable(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: "rgba(33,31,26,0.34)" }}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto shadow-2xl animate-slide-in"
        style={{
          width: "460px",
          maxWidth: "100vw",
          backgroundColor: "var(--paper)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 40px rgba(33,31,26,.18)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            backgroundColor: "var(--card)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="min-w-0">
            {editable ? (
              <input
                type="text"
                value={localInfo.name}
                onChange={(e) => updateInfo("name", e.target.value)}
                className="w-full text-lg font-semibold px-2 py-1 rounded border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                style={{ fontFamily: '"Fraunces", Georgia, serif' }}
              />
            ) : (
              <h2
                className="truncate leading-tight m-0"
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontSize: 23,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {localInfo.name}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-xs" style={{ color: "#9a9484" }}>{client.cid || `CID-${client.id}`}</span>
              {editable ? (
                <select
                  value={localInfo.type}
                  onChange={(e) => updateInfo("type", e.target.value as "Business" | "Personal")}
                  className="text-[10.5px] font-bold px-2 py-1 rounded-[20px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none cursor-pointer"
                >
                  <option value="Business">BIZ</option>
                  <option value="Personal">PERS</option>
                </select>
              ) : (
                <span
                  className="inline-flex text-[10.5px] font-bold px-[9px] py-[3px] rounded-[20px] uppercase tracking-[0.05em]"
                  style={{ backgroundColor: typeBadgeColor.bg, color: typeBadgeColor.fg }}
                >
                  {localInfo.type === "Business" ? "BIZ" : "PERS"}
                </span>
              )}
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                &nbsp;{localInfo.group || "—"} · handled by <b style={{ color: "var(--ink)", fontWeight: 600 }}>{localInfo.assignedStaff || "—"}</b>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!editable ? (
              <button
                onClick={() => setEditable(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-soft)] transition-colors"
              >
                Edit
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--teal-soft)]/50 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Info section */}
          <section>
            <h3 className={sectionLabel}>
              Client Information
            </h3>
            {editable ? (
              <div className="space-y-3">
                {/* City + State */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <InfoInput label="City" value={localInfo.city} onChange={(v) => updateInfo("city", v)} placeholder="e.g. Austin" />
                  </div>
                  <InfoInput label="State" value={localInfo.state} onChange={(v) => updateInfo("state", v)} placeholder="TX" maxLength={2} />
                </div>

                {/* Group */}
                <div>
                  <span className="block text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">Group</span>
                  <select
                    value={localInfo.group}
                    onChange={(e) => updateInfo("group", e.target.value)}
                    className="w-full text-sm rounded-lg px-2.5 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none cursor-pointer focus:border-[var(--teal)]"
                  >
                    {["Terry", "Lindsay", "Misty", "Jill"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Emails */}
                <div>
                  <span className="block text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">Emails</span>
                  <div className="space-y-1.5">
                    {localInfo.emails.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(idx, e.target.value)}
                          placeholder="client@example.com"
                          className="flex-1 text-sm rounded-lg px-2.5 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                        />
                        {idx === localInfo.emails.length - 1 && localInfo.emails.length < 3 ? (
                          <button type="button" onClick={addEmail} className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-dashed border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-soft)] shrink-0">+ Add</button>
                        ) : localInfo.emails.length > 1 ? (
                          <button type="button" onClick={() => removeEmail(idx)} className="text-xs px-2 py-1.5 rounded-lg text-[var(--red)] hover:bg-[var(--red-soft)] shrink-0">Remove</button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phones */}
                <div>
                  <span className="block text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">Phones</span>
                  <div className="space-y-1.5">
                    {localInfo.phones.map((phone, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => updatePhone(idx, e.target.value)}
                          placeholder="(555) 000-0000"
                          className="flex-1 text-sm rounded-lg px-2.5 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                        />
                        {idx === localInfo.phones.length - 1 && localInfo.phones.length < 3 ? (
                          <button type="button" onClick={addPhone} className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-dashed border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-soft)] shrink-0">+ Add</button>
                        ) : (
                          <button type="button" onClick={() => removePhone(idx)} className="text-xs px-2 py-1.5 rounded-lg text-[var(--red)] hover:bg-[var(--red-soft)] shrink-0">Remove</button>
                        )}
                      </div>
                    ))}
                    {localInfo.phones.length === 0 && (
                      <button type="button" onClick={addPhone} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-soft)]">+ Add Phone</button>
                    )}
                  </div>
                </div>

                {/* Address */}
                <InfoInput label="Full Address" value={localInfo.address} onChange={(v) => updateInfo("address", v)} placeholder="Full street address" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoLine label="Address" value={`${localInfo.city}, ${localInfo.state}`} />
                  <div className="col-span-2">
                    <InfoLine label="Group" value={localInfo.group} />
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <InfoLine label="Emails" value={localInfo.emails?.filter(Boolean).join(", ") || "—"} />
                  <InfoLine label="Phones" value={localInfo.phones?.filter(Boolean).join(", ") || "—"} />
                  <InfoLine label="Full Address" value={localInfo.address} />
                </div>
              </>
            )}
          </section>

          {/* Services section */}
          <section>
            <h3 className={sectionLabel}>
              Services
            </h3>
            <div className="space-y-2">
              {localServices.map((svc) => {
                const meta = (svc.key && (SERVICE_META as any)[svc.key]) || { label: "Unknown", pillColor: "var(--muted)", pillBg: "var(--line)" };
                const isExpanded = expandedService === svc.key;
                const enabledMonths = (svc.months as string[]).filter((m: string) => m !== "lock" && m !== "na").length;

                return (
                  <div
                    key={svc.key}
                    className="rounded-lg border transition-colors"
                    style={{
                      borderColor: svc.enabled ? meta.pillColor : "var(--line)",
                      backgroundColor: svc.enabled ? `${meta.pillBg}80` : "transparent",
                    }}
                  >
                    {/* Service header row */}
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                      onClick={() => setExpandedService(isExpanded ? null : svc.key)}
                    >
                      {/* Toggle switch (only in edit mode) */}
                      {editable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleService(svc.key);
                          }}
                          className="relative shrink-0 w-8 h-4 rounded-full transition-colors"
                          style={{
                            backgroundColor: svc.enabled ? meta.pillColor : "var(--line)",
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform"
                            style={{
                              left: svc.enabled ? "calc(100% - 14px)" : "2px",
                            }}
                          />
                        </button>
                      )}

                      {/* Service name + pill */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: meta.pillBg, color: meta.pillColor }}
                        >
                          {meta.label}
                        </span>

                        {svc.enabled && (
                          <span className="text-[11px] text-[var(--muted)]">
                            {svc.frequency} · {enabledMonths}/12 mo
                          </span>
                        )}
                      </div>

                      {/* Expand chevron */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--muted)"
                        strokeWidth="2"
                        className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && svc.enabled && (
                      <div
                        className="px-3 pb-3 space-y-3"
                        style={{ borderTop: `1px solid var(--line)` }}
                      >
                        {/* Frequency + Processor (skip for 1099s) */}
                        <div className="flex items-center gap-4 pt-2 text-xs">
                          {svc.key !== "1099s" && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--muted)]">Frequency:</span>
                            {editable ? (
                              <select
                                value={svc.frequency}
                                onChange={(e) =>
                                  setLocalServices((prev) =>
                                    prev.map((s) =>
                                      s.key === svc.key
                                        ? { ...s, frequency: e.target.value as ServiceConfig["frequency"] }
                                        : s,
                                    ),
                                  )
                                }
                                className="text-xs rounded border border-[var(--line)] px-1.5 py-0.5 bg-[var(--card)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option>Monthly</option>
                                <option>Quarterly</option>
                                <option>Annually</option>
                                <option>N/A</option>
                              </select>
                            ) : (
                              <span className="font-medium text-[var(--ink)]">{svc.frequency}</span>
                            )}
                          </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--muted)]">Processor:</span>
                            {editable ? (
                              <select
                                value={svc.processor || ""}
                                onChange={(e) =>
                                  setLocalServices((prev) =>
                                    prev.map((s) =>
                                      s.key === svc.key
                                        ? { ...s, processor: e.target.value }
                                        : s,
                                    ),
                                  )
                                }
                                className="text-xs rounded border border-[var(--line)] px-1.5 py-0.5 bg-[var(--card)] cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">-- select --</option>
                                {(PROCESSOR_OPTIONS[svc.key] || ["Other"]).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-medium text-[var(--ink)]">{svc.processor || "—"}</span>
                            )}
                          </div>
                        </div>

                        {/* Sales Tax specialized fields */}
                        {svc.key === "sales_tax" && svc.enabled && (
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1" style={{ borderTop: "1px dashed var(--line)" }}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-[var(--muted)]">RT Number</span>
                              {editable ? (
                                <input
                                  type="text"
                                  value={svc.rtNumber || ""}
                                  onChange={(e) =>
                                    setLocalServices((prev) =>
                                      prev.map((s) => s.key === svc.key ? { ...s, rtNumber: e.target.value } : s)
                                    )
                                  }
                                  className="text-xs rounded border border-[var(--line)] px-2 py-1 bg-[var(--card)]"
                                  placeholder="RT-..."
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="font-medium text-[var(--ink)]">{svc.rtNumber || "—"}</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-[var(--muted)]">Tax ID</span>
                              {editable ? (
                                <input
                                  type="text"
                                  value={svc.taxId || ""}
                                  onChange={(e) =>
                                    setLocalServices((prev) =>
                                      prev.map((s) => s.key === svc.key ? { ...s, taxId: e.target.value } : s)
                                    )
                                  }
                                  className="text-xs rounded border border-[var(--line)] px-2 py-1 bg-[var(--card)]"
                                  placeholder="XX-XXXXXXX"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="font-medium text-[var(--ink)]">{svc.taxId || "—"}</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-[var(--muted)]">Bank Routing</span>
                              {editable ? (
                                <input
                                  type="text"
                                  value={svc.bankRouting || ""}
                                  onChange={(e) =>
                                    setLocalServices((prev) =>
                                      prev.map((s) => s.key === svc.key ? { ...s, bankRouting: e.target.value } : s)
                                    )
                                  }
                                  className="text-xs rounded border border-[var(--line)] px-2 py-1 bg-[var(--card)]"
                                  placeholder="XXXXXXXXX"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="font-medium text-[var(--ink)]">{svc.bankRouting || "—"}</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-[var(--muted)]">Account Number</span>
                              {editable ? (
                                <input
                                  type="text"
                                  value={svc.accountNumber || ""}
                                  onChange={(e) =>
                                    setLocalServices((prev) =>
                                      prev.map((s) => s.key === svc.key ? { ...s, accountNumber: e.target.value } : s)
                                    )
                                  }
                                  className="text-xs rounded border border-[var(--line)] px-2 py-1 bg-[var(--card)]"
                                  placeholder="XXXXXXXX"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="font-medium text-[var(--ink)]">{svc.accountNumber || "—"}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Month tracking grid */}
                        <div>
                          <p className="text-[11px] text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wider">
                            Month Tracking
                          </p>
                          <div className="grid grid-cols-12 gap-0.5">
                            {(svc.months as string[]).map((status: string, i: number) => {
                              const c = (STATUS_COLORS as any)[status];
                              return (
                                <div
                                  key={i}
                                  className="flex flex-col items-center rounded py-1 text-[9px] leading-tight"
                                  style={{
                                    backgroundColor: c.bg,
                                    color: c.fg,
                                    border: status === "lock" ? "1px dashed var(--line)" : "none",
                                  }}
                                  title={`${MONTHS_SHORT[i]}: ${c.label}`}
                                >
                                  <span className="font-semibold">{MONTHS_SHORT[i]}</span>
                                </div>
                              );
                            })}
                          </div>
                          {/* Legend */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px]">
                            {(["done", "billed", "paid", "na"] as MonthStatus[]).map((s) => {
                              const c = STATUS_COLORS[s];
                              return (
                                <span key={s} className="flex items-center gap-1">
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm"
                                    style={{ backgroundColor: c.bg, border: `1px solid ${c.fg}` }}
                                  />
                                  <span style={{ color: c.fg }}>{c.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Assigned Staff overview */}
          <section>
            <h3 className={sectionLabel}>
              Staff Assignments
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const seen = new Set<string>();
                return localServices
                  .filter((s) => s.enabled)
                  .map((s) => s.processor)
                  .filter((p) => {
                    if (seen.has(p)) return false;
                    seen.add(p);
                    return true;
                  })
                  .map((processor) => (
                    <span
                      key={processor}
                      className="inline-flex text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "var(--teal-soft)",
                        color: "var(--teal)",
                      }}
                    >
                      {processor}
                    </span>
                  ));
              })()}
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <div
          className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{
            backgroundColor: "var(--card)",
            borderTop: "1px solid var(--line)",
          }}
        >
          {editable && onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete ${localInfo.name}?\n\nThis cannot be undone. All timesheet entries and vault credentials for this client will also be removed.`)) {
                  onDelete(client.id);
                  onClose();
                }
              }}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors mr-auto"
            >
              Delete Client
            </button>
          )}
          <button
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-soft)] transition-colors"
          >
            Close
          </button>
          {editable && (
            <button
              onClick={handleSave}
              className="text-sm font-semibold px-5 py-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 transition-opacity"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Slide-in animation style */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

// ── Helpers ──
function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] text-[var(--muted)] uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span className="text-sm text-[var(--ink)] break-all">{value}</span>
    </div>
  );
}

function InfoInput({ label, value, onChange, placeholder, maxLength }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <span className="block text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full text-sm rounded-lg px-2.5 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
      />
    </div>
  );
}
