"use client";

import { useState, useMemo } from "react";

const SUPPORT_EMAIL = "support@aifusioniqlabs.com";
const SUPPORT_PHONE = "(832) 937-4786";

const AREA_OPTIONS = [
  "Billing / Invoicing",
  "Bug Report",
  "Feature Request",
  "Client Setup",
  "Account Access",
  "General Inquiry",
  "Other",
];

export default function SupportPage() {
  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [area, setArea] = useState("");
  const [summary, setSummary] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [whatHappened, setWhatHappened] = useState("");
  const [expected, setExpected] = useState("");
  const [steps, setSteps] = useState("");

  // ── Auto-generated subject preview ──
  const subjectPreview = useMemo(() => {
    const parts: string[] = [];
    if (urgent) parts.push("[URGENT]");
    if (area) parts.push(area);
    if (summary) {
      parts.push(summary);
    } else if (area) {
      parts.push("Inquiry");
    }
    return parts.join(" ") || "Support Request";
  }, [urgent, area, summary]);

  // ── Compose email ──
  function openEmail() {
    const body = [
      `Name: ${name || "[your name]"}`,
      `Account/Firm: ${firm || "[your firm]"}`,
      "",
      "## What happened:",
      whatHappened || "[describe]",
      "",
      "## What was expected:",
      expected || "[describe]",
      "",
      "## Steps to reproduce:",
      steps || "[describe]",
    ].join("\n");

    const mailto = new URL("mailto:" + SUPPORT_EMAIL);
    mailto.searchParams.set("subject", subjectPreview);
    mailto.searchParams.set("body", body);
    window.open(mailto.toString(), "_blank");
  }

  // ── Copy request to clipboard ──
  function copyRequest() {
    const text = [
      `Subject: ${subjectPreview}`,
      `Name: ${name || "—"}`,
      `Firm: ${firm || "—"}`,
      `Area: ${area || "—"}`,
      `Urgent: ${urgent ? "Yes" : "No"}`,
      "",
      "What happened:",
      whatHappened || "—",
      "",
      "What was expected:",
      expected || "—",
      "",
      "Steps to reproduce:",
      steps || "—",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("Request copied to clipboard!");
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-2 space-y-5">
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-5">
              Submit a Support Request
            </h3>

            <div className="space-y-4">
              {/* Row 1: Name + Firm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Account / Firm
                  </label>
                  <input
                    type="text"
                    value={firm}
                    onChange={(e) => setFirm(e.target.value)}
                    placeholder="Your firm name"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
                  />
                </div>
              </div>

              {/* Row 2: Area + Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Area
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none"
                  >
                    <option value="">Select area…</option>
                    {AREA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Brief Summary
                  </label>
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="One-line summary of the issue"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
                  />
                </div>
              </div>

              {/* Urgent checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--teal)]"
                />
                <span className="text-sm text-[var(--ink)]">
                  This is urgent
                </span>
              </label>

              {/* Textareas */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                  What happened?
                </label>
                <textarea
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  placeholder="Describe the issue you encountered…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                  What did you expect to happen?
                </label>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder="Describe what you expected instead…"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                  Steps to reproduce
                </label>
                <textarea
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="Step-by-step instructions to reproduce the issue…"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60 resize-y"
                />
              </div>

              {/* Subject preview */}
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--teal-soft)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Subject Preview
                </p>
                <p className="text-sm font-medium text-[var(--teal)]">
                  {subjectPreview}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={openEmail}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--teal)",
                    color: "#ffffff",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Open email to support
                </button>

                <button
                  onClick={copyRequest}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy request instead
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4">
          {/* Contact info */}
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">
              Contact
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <div>
                  <p className="text-xs text-[var(--muted)]">Email</p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-sm font-medium text-[var(--teal)] hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <div>
                  <p className="text-xs text-[var(--muted)]">Phone</p>
                  <a
                    href={`tel:${SUPPORT_PHONE}`}
                    className="text-sm font-medium text-[var(--teal)] hover:underline"
                  >
                    {SUPPORT_PHONE}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* How support works */}
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">
              How Support Works
            </h3>
            <ol className="space-y-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                {
                  step: "1",
                  title: "Submit your request",
                  desc: "Fill out the form with as much detail as possible. The more context you provide, the faster we can help.",
                },
                {
                  step: "2",
                  title: "We triage",
                  desc: "Our support team reviews your request within 1 business day. Urgent issues are prioritized.",
                },
                {
                  step: "3",
                  title: "We investigate",
                  desc: "A team member will reproduce the issue, check logs, and determine the root cause.",
                },
                {
                  step: "4",
                  title: "Resolution",
                  desc: "You'll receive a response with a fix, workaround, or next steps. Escalated issues are tracked until closed.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-3">
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: "var(--teal-soft)",
                      color: "var(--teal)",
                    }}
                  >
                    {item.step}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Good subject lines */}
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">
              Good Subject Lines
            </h3>
            <div className="space-y-2">
              {[
                "Unable to export client list to Excel",
                "Payroll totals not matching QuickBooks",
                "Feature request: bulk status update",
                "Sales Tax — March filing stuck in 'Submitted'",
              ].map((ex, i) => (
                <div
                  key={i}
                  className="text-xs text-[var(--muted)] px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--teal-soft)" }}
                >
                  &ldquo;{ex}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
