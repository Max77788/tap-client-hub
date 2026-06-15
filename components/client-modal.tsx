"use client";

import { useEffect, useState } from "react";
import type { Client, ClientType, ServiceKey, ServiceConfig } from "@/lib/types";
import { SERVICE_META, STAFF } from "@/lib/data";

interface ClientModalProps {
  open: boolean;
  client?: Client | null; // null = "Add" mode, Client = "Edit" mode
  onClose: () => void;
  onSave: (client: Client | Omit<Client, "id" | "cid">) => void;
}

const EMPTY_SERVICES: ServiceConfig[] = (
  Object.keys(SERVICE_META) as ServiceKey[]
).map((key) => ({
  key,
  label: SERVICE_META[key].label,
  enabled: false,
  frequency: "Monthly" as const,
  processor: "TA",
  months: Array(12).fill("lock") as ServiceConfig["months"],
}));

function makeEmptyClient(): Omit<Client, "id" | "cid"> {
  return {
    name: "",
    type: "Business",
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
              months: !s.enabled
                ? Array(12).fill("na") as ServiceConfig["months"]
                : Array(12).fill("lock") as ServiceConfig["months"],
            }
          : s,
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
              <div className="grid grid-cols-2 gap-2">
                {form.services.map((svc) => {
                  const meta = SERVICE_META[svc.key];
                  return (
                    <label
                      key={svc.key}
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
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Primary assigned staff */}
            <Field label="Primary Assigned Staff">
              <select
                value={form.assignedStaff}
                onChange={(e) => update("assignedStaff", e.target.value)}
                className="field-input"
              >
                {STAFF.map((s) => (
                  <option key={s.id} value={s.name}>{s.name} ({s.initials})</option>
                ))}
              </select>
            </Field>

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
