"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "done">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Check current 2FA status on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/2fa/status");
        const data = await res.json();
        setStatus(data);
        if (data.enabled) {
          setStep("done");
        } else {
          setStep("setup");
        }
      } catch {
        setError("Failed to load 2FA status. Are you logged in?");
      }
    }
    loadStatus();
  }, []);

  // Start setup: send code to email
  async function startSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEmail(data.email || "");
      setMessage(data.message || "Code sent");
      setCode("");
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to start setup");
    } finally {
      setLoading(false);
    }
  }

  // Verify the code and enable 2FA
  async function verifyCode() {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  // Disable flow: send code first
  async function startDisable() {
    setLoading(true);
    setError("");
    setCode("");
    try {
      const res = await fetch("/api/2fa/disable", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEmail(data.email || "");
      setMessage(data.message || "Code sent");
      setStep("verify"); // reuse verify step but with disable intent
    } catch (err: any) {
      setError(err.message || "Failed to start disable");
    } finally {
      setLoading(false);
    }
  }

  // Confirm disable with code
  async function confirmDisable() {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus({ enabled: false });
      setStep("setup");
      setCode("");
    } catch (err: any) {
      setError(err.message || "Failed to disable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--paper)" }}>
      <div className="w-full max-w-md p-6 sm:p-8 rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <h1 className="text-xl font-semibold text-center mb-2" style={{ color: "var(--ink)" }}>
          Two-Factor Authentication
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: "var(--muted)" }}>
          Add an extra layer of security to your account
        </p>

        {/* === DONE STATE (enabled) === */}
        {step === "done" && status?.enabled && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--green-soft)", border: "1px solid var(--green)" }}>
              <span className="text-2xl">&#x2705;</span>
              <p className="text-sm font-semibold mt-2" style={{ color: "var(--green)" }}>
                2FA is enabled on your account
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                You'll receive a verification code via email when signing in.
              </p>
            </div>

            <div className="space-y-3">
              {error && (
                <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: "var(--red-soft)", color: "var(--red)" }}>
                  {error}
                </div>
              )}
              <button
                onClick={startDisable}
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--red)" }}
              >
                {loading ? "Sending code..." : "Disable 2FA"}
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border border-[var(--line)] text-[var(--ink)]"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* === VERIFY STATE (setup or disable) === */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--teal-soft)", border: "1px solid var(--teal)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--teal)" }}>
                Check your email
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--ink)" }}>
                {message}{email ? ` — sent to ${email}` : ""}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                Enter the 6-digit code below. It expires in 10 minutes.
              </p>
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: "var(--red-soft)", color: "var(--red)" }}>
                {error}
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") status?.enabled ? confirmDisable() : verifyCode(); }}
              placeholder="000000"
              autoFocus
              className="w-full px-3.5 py-3 rounded-lg text-lg text-center tracking-[0.3em] font-mono border outline-none focus:ring-2 focus:ring-offset-0"
              style={{
                borderColor: error ? "var(--red)" : "var(--line)",
                backgroundColor: "var(--card)",
                color: "var(--ink)",
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(status?.enabled ? "done" : "setup"); setError(""); setCode(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-[var(--line)] text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                onClick={status?.enabled ? confirmDisable : verifyCode}
                disabled={loading || code.length !== 6}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--teal)" }}
              >
                {loading ? "Verifying..." : status?.enabled ? "Confirm Disable" : "Verify & Enable"}
              </button>
            </div>

            <button
              onClick={status?.enabled ? startDisable : startSetup}
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm text-[var(--teal)] font-medium hover:underline bg-transparent border-none cursor-pointer"
            >
              Resend code
            </button>
          </div>
        )}

        {/* === SETUP STATE (not enabled) === */}
        {step === "setup" && !status?.enabled && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--amber-soft)", border: "1px solid #ead9b6" }}>
              <p className="text-sm" style={{ color: "#7a5210" }}>
                <strong>Recommended</strong> - When enabled, you'll receive a 6-digit verification code via email each time you sign in. Make sure your email address is accessible.
              </p>
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: "var(--red-soft)", color: "var(--red)" }}>
                {error}
              </div>
            )}

            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--teal)" }}
            >
              {loading ? "Sending code..." : "Set Up Email Two-Factor Authentication"}
            </button>
          </div>
        )}

        {/* === LOADING STATE === */}
        {step === "loading" && (
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
        )}
      </div>
    </div>
  );
}
