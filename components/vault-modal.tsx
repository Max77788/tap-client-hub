"use client";

import { useEffect, useState } from "react";
import type { VaultEntry } from "@/lib/types";

interface VaultModalProps {
  open: boolean;
  vaultEntry?: VaultEntry | null; // null = "Add" mode
  clients: { id: string; name: string }[];
  onClose: () => void;
  onSave: (entry: VaultEntry | Omit<VaultEntry, "id">) => void | Promise<void>;
  saveError?: string | null;
}

function makeEmptyEntry(): Omit<VaultEntry, "id"> {
  return {
    site: "",
    service: "",
    url: "",
    email: "",
    password: "",
    notes: "",
    clientId: "",
    isBank: false,
    purpose: "",
    additionalInfo01: "",
    additionalInfo02: "",
  };
}

export default function VaultModal({ open, vaultEntry, clients, onClose, onSave, saveError }: VaultModalProps) {
  const isEdit = !!vaultEntry;
  const [form, setForm] = useState<Omit<VaultEntry, "id">>(makeEmptyEntry());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (vaultEntry) {
      setForm({
        site: vaultEntry.site || "",
        service: vaultEntry.service || "",
        url: vaultEntry.url || "",
        email: vaultEntry.email || "",
        password: vaultEntry.password || "",
        notes: vaultEntry.notes || "",
        clientId: vaultEntry.clientId || "",
        isBank: vaultEntry.isBank || false,
        purpose: vaultEntry.purpose || "",
        additionalInfo01: vaultEntry.additionalInfo01 || "",
        additionalInfo02: vaultEntry.additionalInfo02 || "",
      });
    } else {
      setForm(makeEmptyEntry());
    }
    setErrors({});
  }, [vaultEntry, open]);

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

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.site.trim()) errs.site = "Site is required";
    if (!form.isBank && !form.password?.trim()) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      if (isEdit && vaultEntry) {
        await onSave({ ...form, id: vaultEntry.id } as VaultEntry);
      } else {
        await onSave(form as Omit<VaultEntry, "id">);
      }
    } finally {
      setSubmitting(false);
    }
    // Note: onSave (the parent) is responsible for closing the modal on success.
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
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl pointer-events-auto animate-modal-in"
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
              {isEdit ? "Edit Credential" : "Add Credential"}
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
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {saveError && (
              <div
                className="text-sm px-3 py-2 rounded-lg border"
                style={{
                  color: "var(--red)",
                  borderColor: "var(--red)",
                  backgroundColor: "rgba(244,63,94,0.08)",
                }}
                role="alert"
              >
                {saveError}
              </div>
            )}
            {/* Site (required) + URL row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Site" error={errors.site} required>
                  <input
                    type="text"
                    value={form.site}
                    onChange={(e) => update("site", e.target.value)}
                    placeholder="e.g. QuickBooks Online"
                    className="field-input"
                  />
                </Field>
              </div>
              <Field label="URL">
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => update("url", e.target.value)}
                  placeholder="https://..."
                  className="field-input"
                />
              </Field>
            </div>

            {/* Username + Password row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username">
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="client@example.com or login ID"
                  className="field-input"
                />
              </Field>
              <Field label="Password" error={errors.password} required>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="••••••••"
                    className="field-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      /* eye-off icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      /* eye icon */
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </Field>
            </div>

            {/* Client dropdown */}
            <Field label="Client">
              <select
                value={form.clientId}
                onChange={(e) => update("clientId", e.target.value)}
                className="field-input cursor-pointer"
              >
                <option value="">Unassigned</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {/* Service */}
            <Field label="Service">
              <input
                type="text"
                value={form.service}
                onChange={(e) => update("service", e.target.value)}
                placeholder="e.g. Payroll, Sales Tax, Bookkeeping"
                className="field-input"
              />
            </Field>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Access notes, EFIN reference, etc."
                rows={3}
                className="field-input resize-none"
              />
            </Field>

            {/* Purpose */}
            <Field label="Purpose">
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => update("purpose", e.target.value)}
                placeholder="e.g. Payroll Reports, Sales Tax"
                className="field-input"
              />
            </Field>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Info 1">
                <input
                  type="text"
                  value={form.additionalInfo01}
                  onChange={(e) => update("additionalInfo01", e.target.value)}
                  placeholder="Security questions, PIN, etc."
                  className="field-input"
                />
              </Field>
              <Field label="Info 2">
                <input
                  type="text"
                  value={form.additionalInfo02}
                  onChange={(e) => update("additionalInfo02", e.target.value)}
                  placeholder="Additional notes"
                  className="field-input"
                />
              </Field>
            </div>

            {/* isBank checkbox */}
            <label
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={form.isBank}
                onChange={(e) => update("isBank", e.target.checked)}
                className="w-4 h-4 rounded border-2 border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)] cursor-pointer"
                style={{ accentColor: "var(--teal)" }}
              />
              <span className="text-sm text-[var(--ink)]">
                Bank Login (TAP Bank)
              </span>
            </label>

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
                disabled={submitting}
                className="text-sm font-semibold px-5 py-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Credential"}
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
