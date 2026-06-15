"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, MonthStatus, ServiceConfig } from "@/lib/types";
import { MONTHS_SHORT, SERVICE_META } from "@/lib/data";

// ── Month status colors ──
const STATUS_COLORS: Record<MonthStatus, { bg: string; fg: string; label: string }> = {
  done:   { bg: "var(--green-soft)", fg: "var(--green)", label: "Done" },
  billed: { bg: "var(--amber-soft)", fg: "var(--amber)", label: "Billed" },
  paid:   { bg: "var(--paid-soft)",  fg: "var(--paid)",  label: "Paid" },
  na:     { bg: "var(--red-soft)",   fg: "var(--red)",   label: "N/A" },
  lock:   { bg: "transparent",       fg: "var(--muted)", label: "—" },
};

// ── Props ──
interface ClientSlideoverProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  onSave?: (client: Client) => void;
}

export default function ClientSlideover({ client, open, onClose, onSave }: ClientSlideoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);
  const [localServices, setLocalServices] = useState<ServiceConfig[]>(client.services);

  // Reset local state when client changes
  useEffect(() => {
    setLocalServices(client.services);
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

  const typeBadgeColor = client.type === "Business"
    ? { bg: "var(--teal-soft)", fg: "var(--teal)" }
    : { bg: "var(--blue-soft)", fg: "var(--blue)" };

  function toggleService(key: string) {
    setLocalServices((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, enabled: !s.enabled, months: s.enabled ? Array(12).fill("lock") : s.months } : s,
      ),
    );
  }

  function handleSave() {
    onSave?.({ ...client, services: localServices });
    setEditable(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: "rgba(26,35,64,0.4)" }}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto shadow-2xl animate-slide-in"
        style={{
          width: "460px",
          maxWidth: "100vw",
          backgroundColor: "var(--card)",
          borderLeft: "1px solid var(--line)",
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
            <h2 className="text-lg font-semibold text-[var(--ink)] truncate leading-tight">
              {client.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--muted)]">{client.cid}</span>
              <span
                className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
                style={{ backgroundColor: typeBadgeColor.bg, color: typeBadgeColor.fg }}
              >
                {client.type === "Business" ? "BIZ" : "PERS"}
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
              Client Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoLine label="Address" value={`${client.city}, ${client.state}`} />
              <InfoLine label="Group" value={client.group} />
              <InfoLine label="Email" value={client.email} />
              <InfoLine label="Phone" value={client.phone} />
            </div>
            <div className="mt-2">
              <InfoLine label="Full Address" value={client.address} />
            </div>
          </section>

          {/* Services section */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
              Services
            </h3>
            <div className="space-y-2">
              {localServices.map((svc) => {
                const meta = SERVICE_META[svc.key];
                const isExpanded = expandedService === svc.key;
                const enabledMonths = svc.months.filter((m) => m !== "lock" && m !== "na").length;

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
                        {/* Frequency + Processor */}
                        <div className="flex items-center gap-4 pt-2 text-xs">
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--muted)]">Processor:</span>
                            <span className="font-medium text-[var(--ink)]">{svc.processor}</span>
                          </div>
                        </div>

                        {/* Month tracking grid */}
                        <div>
                          <p className="text-[11px] text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wider">
                            Month Tracking
                          </p>
                          <div className="grid grid-cols-12 gap-0.5">
                            {svc.months.map((status, i) => {
                              const c = STATUS_COLORS[status];
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
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

// ── Helper ──
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
