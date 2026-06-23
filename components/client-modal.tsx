"use client";

import { useEffect, useState } from "react";
import type { Client, ClientType, ServiceKey, ServiceConfig } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

interface ClientModalProps {
  open: boolean;
  client?: Client | null; // null = "Add" mode, Client = "Edit" mode
  onClose: () => void;
  onSave: (client: Client | Omit<Client, "id" | "cid">) => void;
}

// ── Service configuration metadata ──
const SERVICE_CADENCES: Record<ServiceKey, { options: string[]; label: string }> = {
  financials:  { options: ["Monthly", "Quarterly", "Yearly"], label: "Frequency" },
  payroll:     { options: ["Weekly", "Bi-Weekly", "Monthly"], label: "Payroll Cadence" },
  sales_tax:   { options: [], label: "" },   // always Monthly, no picker
  "1099s":     { options: [], label: "" },    // always Yearly, no picker — show expected count instead
  renditions:  { options: [], label: "" },     // always Yearly
  tax_returns: { options: [], label: "" },      // always Yearly
};

const SERVICE_DEFAULTS: Record<ServiceKey, { frequency: string; processor: string }> = {
  financials:  { frequency: "Monthly", processor: "QuickBooks" },
  payroll:     { frequency: "Bi-Weekly", processor: "ADP" },
  sales_tax:   { frequency: "Monthly", processor: "TA" },
  "1099s":     { frequency: "Yearly", processor: "TA" },
  renditions:  { frequency: "Yearly", processor: "TA" },
  tax_returns: { frequency: "Yearly", processor: "TA" },
};

const EMPTY_SERVICES: any[] = (
  Object.keys(SERVICE_META) as ServiceKey[]
).map((key) => ({
  key,
  label: SERVICE_META[key].label,
  enabled: false,
  frequency: SERVICE_DEFAULTS[key].frequency,
  processor: SERVICE_DEFAULTS[key].processor,
  assignedTo: "",
  expectedAnnual: key === "1099s" ? 0 : undefined,
  months: Array(12).fill("lock") as ServiceConfig["months"],
}));

function makeEmptyClient(): Omit<Client, "id" | "cid"> {
  return {
    name: "",
    type: "Business",
    status: "active",
    group: "Terry",
    city: "",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Terry Anderson",
    services: EMPTY_SERVICES,
  };
}

export default function ClientModal({ open, client, onClose, onSave }: ClientModalProps) {
  const isEdit = !!client;
  const [form, setForm] = useState<Omit<Client, "id" | "cid">>(makeEmptyClient());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staffOptions, setStaffOptions] = useState<{id: string; name: string}[]>([]);

  // Fetch staff from Supabase
  useEffect(() => {
    fetch("/api/profiles").then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) setStaffOptions(data.map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        type: client.type,
        group: client.group,
        city: client.city,
        state: client.state,
        email: client.email,
        phone: client.phone,
        address: client.address,
        status: client.status || "active",
        assignedStaff: client.assignedStaff,
        services: client.services.map((s) => ({ ...s })),
      });
    } else {
      setForm(makeEmptyClient());
    }
    setErrors({});
  }, [client, open]);

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

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleService(key: ServiceKey) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.key === key
          ? {
              ...s,
              enabled: !s.enabled,
              frequency: SERVICE_DEFAULTS[key].frequency,
              processor: SERVICE_DEFAULTS[key].processor,
              assignedTo: "",
              expectedAnnual: key === "1099s" ? 0 : undefined,
              months: !s.enabled
                ? Array(12).fill("na") as ServiceConfig["months"]
                : Array(12).fill("lock") as ServiceConfig["months"],
            }
          : s,
      ),
    }));
  }

  function setServiceField(key: ServiceKey, field: string, value: string | number) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.key === key ? { ...s, [field]: value } : s,
      ),
    }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Client name is required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email format";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave(form as Omit<Client, "id" | "cid">);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(26,35,64,0.4)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl pointer-events-auto animate-modal-in"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 rounded-t-xl"
            style={{
              backgroundColor: "var(--card)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              {isEdit ? "Edit Client" : "Add New Client"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--teal-soft)]/50 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Client Name */}
            <Field label="Client Name" error={errors.name} required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="field-input"
              />
            </Field>

            {/* Type + Group row */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <div className="flex gap-2">
                  {(["Business", "Personal"] as ClientType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update("type", t)}
                      className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                        form.type === t
                          ? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal)]"
                          : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--teal-soft)]/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Group Owner">
                <select
                  value={form.group}
                  onChange={(e) => update("group", e.target.value)}
                  className="field-input"
                >
                  {["Terry", "Lindsay", "Misty", "Jill"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* City + State row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Field label="City" error={errors.city} required>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="e.g. Austin"
                    className="field-input"
                  />
                </Field>
              </div>
              <Field label="State">
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                  className="field-input"
                />
              </Field>
            </div>

            {/* Email + Phone row */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" error={errors.email} required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="client@example.com"
                  className="field-input"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(555) 000-0000"
                  className="field-input"
                />
              </Field>
            </div>

            {/* Address */}
            <Field label="Address">
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Full street address"
                className="field-input"
              />
            </Field>

            {/* Services */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Services
              </label>
              <div className="space-y-2">
                {form.services.map((svc) => {
                  const meta = SERVICE_META[svc.key];
                  const cadence = SERVICE_CADENCES[svc.key];
                  const is1099 = svc.key === "1099s";
                  return (
                    <div key={svc.key}>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          svc.enabled
                            ? ""
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{
                          borderColor: svc.enabled ? meta.pillColor : "var(--line)",
                          backgroundColor: svc.enabled ? `${meta.pillBg}80` : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={svc.enabled}
                          onChange={() => toggleService(svc.key)}
                          className="sr-only"
                        />
                        <span
                          className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            borderColor: svc.enabled ? meta.pillColor : "var(--line)",
                            backgroundColor: svc.enabled ? meta.pillColor : "transparent",
                          }}
                        >
                          {svc.enabled && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: svc.enabled ? meta.pillColor : "var(--muted)" }}
                        >
                          {meta.label}
                        </span>
                        {svc.enabled && cadence.options.length === 0 && (
                          <span className="text-[10px] text-[var(--muted)] ml-auto">
                            {svc.frequency}
                          </span>
                        )}
                      </label>

                      {/* Expanded fields — visible only when enabled */}
                      {svc.enabled && (
                        <div
                          className="ml-7 mt-1.5 p-3 rounded-lg space-y-2.5"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--line)",
                          }}
                        >
                          {/* Frequency picker (only for services with cadence options) */}
                          {cadence.options.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                {cadence.label}
                              </span>
                              <select
                                value={svc.frequency}
                                onChange={(e) => setServiceField(svc.key, "frequency", e.target.value)}
                                className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none cursor-pointer focus:border-[var(--teal)]"
                              >
                                {cadence.options.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          ) : is1099 ? (
                            /* Expected 1099s count */
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                Expected / year
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={svc.expectedAnnual ?? 0}
                                onChange={(e) => setServiceField(svc.key, "expectedAnnual", parseInt(e.target.value) || 0)}
                                className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                              />
                            </div>
                          ) : (
                            /* Fixed cadence label */
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                Cadence
                              </span>
                              <span className="text-[11px] text-[var(--ink)]">{svc.frequency}</span>
                            </div>
                          )}

                          {/* Processor */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                              Processor
                            </span>
                            <select
                              value={svc.processor}
                              onChange={(e) => setServiceField(svc.key, "processor", e.target.value)}
                              className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none cursor-pointer focus:border-[var(--teal)]"
                            >
                              {["ADP", "QuickBooks", "Toast", "TaxDome", "TA", "Manual", "Other"].map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          {/* Assigned to */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                              Assigned to
                            </span>
                            <select
                              value={svc.assignedTo || ""}
                              onChange={(e) => setServiceField(svc.key, "assignedTo", e.target.value)}
                              className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none cursor-pointer focus:border-[var(--teal)]"
                            >
                              <option value="">Unassigned</option>
                              {staffOptions.map((s) => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Sales Tax specific fields */}
                          {svc.key === "sales_tax" && (
                            <>
                              <div className="mt-2 pt-2" style={{ borderTop: "1px dashed var(--line)" }}>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--amber)]">
                                  Sales Tax Details
                                </span>
                              </div>

                              {/* Notes */}
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0 mt-1">
                                  Notes
                                </span>
                                <textarea
                                  value={svc.salesTaxNotes || ""}
                                  onChange={(e) => setServiceField(svc.key, "salesTaxNotes", e.target.value)}
                                  placeholder="Sales tax notes"
                                  rows={2}
                                  className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] resize-y"
                                />
                              </div>

                              {/* Tax ID + S/Tax RT */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                  Tax ID
                                </span>
                                <input
                                  type="text"
                                  value={svc.taxId || ""}
                                  onChange={(e) => setServiceField(svc.key, "taxId", e.target.value)}
                                  placeholder="EIN / SSN / ITIN"
                                  className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                  S/Tax RT
                                </span>
                                <input
                                  type="text"
                                  value={svc.salesTaxRT || ""}
                                  onChange={(e) => setServiceField(svc.key, "salesTaxRT", e.target.value)}
                                  placeholder="Sales tax return type"
                                  className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                />
                              </div>

                              {/* Bank Name / Routing # / Account # */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                  Bank
                                </span>
                                <input
                                  type="text"
                                  value={svc.bankName || ""}
                                  onChange={(e) => setServiceField(svc.key, "bankName", e.target.value)}
                                  placeholder="Name"
                                  className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                />
                                <input
                                  type="text"
                                  value={svc.bankRouting || ""}
                                  onChange={(e) => setServiceField(svc.key, "bankRouting", e.target.value)}
                                  placeholder="Routing #"
                                  className="w-20 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                />
                                <input
                                  type="text"
                                  value={svc.bankAccount || ""}
                                  onChange={(e) => setServiceField(svc.key, "bankAccount", e.target.value)}
                                  placeholder="Acct #"
                                  className="w-20 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                />
                              </div>

                              {/* Group Assigned To */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shrink-0">
                                  Group
                                </span>
                                <select
                                  value={svc.groupAssignedTo || ""}
                                  onChange={(e) => setServiceField(svc.key, "groupAssignedTo", e.target.value)}
                                  className="flex-1 text-[11px] rounded-md px-2 py-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none cursor-pointer focus:border-[var(--teal)]"
                                >
                                  <option value="">Unassigned</option>
                                  {staffOptions.map((s) => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 pt-3 sticky bottom-0"
              style={{
                backgroundColor: "var(--card)",
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-soft)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-sm font-semibold px-5 py-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 transition-opacity"
              >
                {isEdit ? "Save Changes" : "Add Client"}
              </button>
            </div>
          </form>
        </div>

        {/* Modal animation */}
        <style jsx>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-modal-in {
            animation: modalIn 0.2s ease-out;
          }
        `}</style>
      </div>
    </>
  );
}

// ── Form field helper ──
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
        {label}
        {required && <span className="text-[var(--red)] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-[var(--red)] mt-1">{error}</p>
      )}
      <style jsx>{`
        :global(.field-input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--line);
          background-color: var(--card);
          color: var(--ink);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.field-input:focus) {
          border-color: var(--teal);
          box-shadow: 0 0 0 2px var(--teal-soft);
        }
        :global(.field-input::placeholder) {
          color: var(--muted);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
