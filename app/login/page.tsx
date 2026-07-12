"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageSkeleton } from "@/components/loading-skeleton";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAMessage, setTwoFAMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Clear stale demo cookies on mount so login always starts fresh
  useEffect(() => {
    document.cookie = "tap_demo_user=; path=/; max-age=0";
    document.cookie = "tap_demo_email=; path=/; max-age=0";
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  // ── Demo accounts bypass everything ──
  const DEMO_USERS: Record<string, { password: string; name: string }> = {
    "tushar@tapallc.com": { password: "TapHub2024!", name: "Tushar Patil" },
    "lizette@tapallc.com": { password: "TapHub2024!", name: "Lizette" },
    "mmatronin@gmail.com": { password: "MaxHub2025!", name: "Max Matronin" },
    "ben@aifusioniqlabs.com": { password: "TapHub2024!", name: "Ben" },
    "staff@tapallc.com": { password: "TapHub2024!", name: "Staff Test" },
    "janeth@tapallc.com": { password: "TapHub2024!", name: "Janeth Noguera" },
    "alvaro@tapallc.com": { password: "TapHub2024!", name: "Alvaro Ortega" },
    "bonnie@tapallc.com": { password: "TapHub2024!", name: "Bonnie Edwards" },
    "shilpa@tapallc.com": { password: "TapHub2024!", name: "Shilpa Kulkarni" },
    "sam@tapallc.com": { password: "TapHub2024!", name: "Sam Patil" },
  };

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Demo credentials - check 2FA before auto-login
    const demo = DEMO_USERS[email.toLowerCase()];
    if (demo && password === demo.password) {
      // Set temporary cookie so 2FA endpoints can identify this user
      document.cookie = `tap_demo_user=${encodeURIComponent(demo.name)}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `tap_demo_email=${encodeURIComponent(email.toLowerCase())}; path=/; max-age=86400; SameSite=Lax`;
      (() => {
        const e = email.toLowerCase();
        if (e === "tushar@tapallc.com") document.cookie = "tap_demo_role=owner; path=/; max-age=86400; SameSite=Lax";
        else if (e === "lizette@tapallc.com" || e === "mmatronin@gmail.com") document.cookie = "tap_demo_role=admin; path=/; max-age=86400; SameSite=Lax";
      })();

      // Check if 2FA is enabled for this user
      try {
        const res = await fetch("/api/2fa/status");
        const data = await res.json();
        if (data.enabled) {
          setStep("2fa");
          setTwoFAMessage("Sending verification code...");
          setLoading(false);
          fetch("/api/2fa/challenge", { method: "POST" })
            .then(r => r.json())
            .then(d => setTwoFAMessage(d.message || "Check your email for the code"))
            .catch(() => setTwoFAMessage("Enter the code from your email"));
          return;
        }
      } catch {
        // If 2FA check fails, proceed with login
      }

      fetch("/api/me", { credentials: "include" }).catch(() => {});
      router.push(next);
      router.refresh();
      return;
    }

    try {
      // Sign in with Supabase
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Check if this user has 2FA enabled
      const res = await fetch("/api/2fa/status");
      const data = await res.json();

      if (data.enabled) {
        // Send 2FA code to email
        setStep("2fa");
        setTwoFAMessage("Sending verification code...");
        setLoading(false);
        fetch("/api/2fa/challenge", { method: "POST" })
          .then(r => r.json())
          .then(d => setTwoFAMessage(d.message || "Check your email for the code"))
          .catch(() => setTwoFAMessage("Enter the code from your email"));
      } else {
        // No 2FA - proceed
        document.cookie = `tap_demo_user=${encodeURIComponent(demo?.name || email.split('@')[0])}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `tap_demo_email=${encodeURIComponent(email.toLowerCase())}; path=/; max-age=86400; SameSite=Lax`;
        fetch("/api/me", { credentials: "include" }).catch(() => {});
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setLoading(false);
    }
  }

  async function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    if (twoFACode.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        setLoading(false);
        return;
      }

      document.cookie = `tap_demo_user=${encodeURIComponent(data.name || email.split('@')[0])}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `tap_demo_email=${encodeURIComponent(email.toLowerCase())}; path=/; max-age=86400; SameSite=Lax`;
      fetch("/api/me", { credentials: "include" }).catch(() => {});

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed"
      );
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--paper)" }}
    >
      <div
        className="w-full max-w-sm mx-4 sm:mx-auto p-6 sm:p-8 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <h2
            className="text-2xl tracking-tight mb-1"
            style={{ color: "var(--teal)" }}
          >
            TAP
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Associates, LLC - Client Hub
          </p>
        </div>

        {/* === 2FA STEP === */}
        {step === "2fa" ? (
          <>
            <h1 className="text-xl font-semibold text-center mb-2" style={{ fontFamily: '"Fraunces", Georgia, serif', color: "var(--ink)" }}>
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-center mb-2" style={{ color: "var(--muted)" }}>
              {twoFAMessage || "Check your email for the verification code"}
            </p>
            <p className="text-sm text-center font-bold mb-3" style={{ color: "var(--amber)" }}>
              If you don't see the code check the spam folder in your email
            </p>

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <input
                  id="2fa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => { setTwoFACode(e.target.value.replace(/\D/g, "")); setError(null); }}
                  placeholder="000000"
                  autoFocus
                  className="w-full px-3.5 py-3 rounded-lg text-lg text-center tracking-[0.3em] font-mono border outline-none focus:ring-2 focus:ring-offset-0"
                  style={{
                    borderColor: error ? "var(--red)" : "var(--line)",
                    backgroundColor: "var(--card)",
                    color: "var(--ink)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--teal)";
                    e.target.style.boxShadow = "0 0 0 2px var(--teal-soft)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = error ? "var(--red)" : "var(--line)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {error && (
                <div
                  className="text-sm p-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--red-soft)",
                    color: "var(--red)",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || twoFACode.length !== 6}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--teal)",
                  color: "#ffffff",
                }}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("login"); setError(null); setTwoFACode(""); setTwoFAMessage(""); document.cookie = "tap_demo_user=; path=/; max-age=0"; document.cookie = "tap_demo_email=; path=/; max-age=0"; }}
                className="w-full py-2 rounded-lg text-sm border border-[var(--line)] text-[var(--ink)]"
              >
                Back to sign in
              </button>

              <button
                type="button"
                onClick={async () => {
                  setTwoFAMessage("Sending new code...");
                  try {
                    const r = await fetch("/api/2fa/challenge", { method: "POST" });
                    const d = await r.json();
                    setTwoFAMessage(d.message || "Code resent");
                  } catch {
                    setTwoFAMessage("Failed to send code. Try again.");
                  }
                }}
                className="w-full py-2 rounded-lg text-sm text-[var(--teal)] font-medium hover:underline bg-transparent border-none cursor-pointer"
              >
                Resend code
              </button>
            </form>
          </>
        ) : (
          <>
            {/* === PASSWORD STEP === */}
            <h1 className="text-xl font-semibold text-center mb-6" style={{ fontFamily: '"Fraunces", Georgia, serif', color: "var(--ink)" }}>
              Sign in to your account
            </h1>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--ink)" }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@tap-associates.com"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-colors border outline-none focus:ring-2 focus:ring-offset-0"
                  style={{
                    borderColor: "var(--line)",
                    backgroundColor: "var(--card)",
                    color: "var(--ink)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--teal)";
                    e.target.style.boxShadow = "0 0 0 2px var(--teal-soft)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--line)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    Password
                  </label>
                  {/* Forgot password? — contact admin for reset */}
                </div>
                <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-colors border outline-none focus:ring-2 focus:ring-offset-0"
                  style={{
                    borderColor: "var(--line)",
                    backgroundColor: "var(--card)",
                    color: "var(--ink)",
                    paddingRight: 40,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--teal)";
                    e.target.style.boxShadow = "0 0 0 2px var(--teal-soft)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--line)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--muted)",
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              </div>

              {error && (
                <div
                  className="text-sm p-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--red-soft)",
                    color: "var(--red)",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--teal)",
                  color: "#ffffff",
                }}
              >
                {loading ? "Signing in..." : "Sign in with email"}
              </button>
            </form>

            <p
              className="text-center text-xs mt-6"
              style={{ color: "var(--muted)" }}
            >
              Contact your administrator for account access.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--paper)" }}>
          <PageSkeleton rows={3} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
