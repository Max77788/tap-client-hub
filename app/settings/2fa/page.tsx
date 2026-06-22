"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "done">("loading");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);

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

  // Start setup: get secret + generate QR code
  async function startSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSecret(data.secret);

      // Generate QR code as data URL
      const qr = await QRCode.toDataURL(data.otpauth, {
        width: 240,
        margin: 2,
        color: { dark: "#1a2330", light: "#ffffff" },
      });
      setQrDataUrl(qr);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to generate 2FA secret");
    } finally {
      setLoading(false);
    }
  }

  // Verify the code and enable 2FA
  async function verifyCode() {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code }),
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

  async function disable2FA() {
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
      setSecret("");
      setQrDataUrl("");
      setCode("");
    } catch (err: any) {
      setError(err.message || "Failed to disable 2FA");
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

        {/* === DONE STATE === */}
        {step === "done" && status?.enabled && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "var(--green-soft)", border: "1px solid var(--green)" }}>
              <span className="text-2xl">&#x2705;</span>
              <p className="text-sm font-semibold mt-2" style={{ color: "var(--green)" }}>
                2FA is enabled on your account
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                You will need your authenticator app to sign in.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter current 6-digit code"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] text-center tracking-[0.3em] font-mono"
              />
              <button
                onClick={disable2FA}
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--red)" }}
              >
                {loading ? "Disabling..." : "Disable 2FA"}
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

        {/* === SETUP STATE === */}
        {step === "setup" && !status?.enabled && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--amber-soft)", border: "1px solid #ead9b6" }}>
              <p className="text-sm" style={{ color: "#7a5210" }}>
                <strong>Recommended</strong> - Protect your account with time-based one-time passwords (TOTP). You will need an authenticator app like Google Authenticator, Authy, or 1Password.
              </p>
            </div>

            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--teal)" }}
            >
              {loading ? "Generating..." : "Set Up Two-Factor Authentication"}
            </button>
          </div>
        )}

        {/* === VERIFY STATE === */}
        {step === "verify" && qrDataUrl && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#ffffff", border: "1px solid var(--line)" }}>
                <img src={qrDataUrl} alt="QR Code" className="w-60 h-60" />
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Manual setup key
                </p>
                <code className="text-xs px-3 py-1.5 rounded font-mono select-all break-all" style={{ backgroundColor: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)" }}>
                  {secret}
                </code>
              </div>

              <div className="text-center">
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Scan the QR code with your authenticator app, then enter the 6-digit code below.
                </p>
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") verifyCode(); }}
              placeholder="000000"
              autoFocus
              className="w-full px-3.5 py-3 rounded-lg text-lg text-center tracking-[0.3em] font-mono border outline-none focus:ring-2 focus:ring-offset-0"
              style={{
                borderColor: error ? "var(--red)" : "var(--line)",
                backgroundColor: "var(--card)",
                color: "var(--ink)",
              }}
            />

            {error && (
              <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: "var(--red-soft)", color: "var(--red)" }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("setup"); setError(""); setQrDataUrl(""); setSecret(""); setCode(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-[var(--line)] text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                onClick={verifyCode}
                disabled={loading || code.length !== 6}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--teal)" }}
              >
                {loading ? "Verifying..." : "Verify & Enable"}
              </button>
            </div>
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
