"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [totpCode, setTotpCode] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  // ── Demo accounts bypass everything ──
  const DEMO_USERS: Record<string, { password: string; name: string }> = {
    "tushar@tapallc.com": { password: "TapHub2024!", name: "Tushar Patil" },
    "lizette@tapallc.com": { password: "TapHub2024!", name: "Lizette" },
  };

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Demo credentials - skip Supabase and 2FA entirely
    const demo = DEMO_USERS[email.toLowerCase()];
    if (demo && password === demo.password) {
      document.cookie = `tap_demo_user=${encodeURIComponent(demo.name)}; path=/; max-age=86400; SameSite=Lax`;
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
        // Show 2FA challenge
        setStep("2fa");
        setLoading(false);
      } else {
        // No 2FA - proceed
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
    if (totpCode.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        setLoading(false);
        return;
      }

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
            <h1 className="text-xl font-semibold text-center mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-center mb-6" style={{ color: "var(--muted)" }}>
              Enter the 6-digit code from your authenticator app
            </p>

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "")); setError(null); }}
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
                disabled={loading || totpCode.length !== 6}
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
                onClick={() => { setStep("login"); setError(null); setTotpCode(""); }}
                className="w-full py-2 rounded-lg text-sm border border-[var(--line)] text-[var(--ink)]"
              >
                Back to sign in
              </button>
            </form>
          </>
        ) : (
          <>
            {/* === PASSWORD STEP === */}
            <h1 className="text-xl font-semibold text-center mb-6">
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
                <input
                  id="password"
                  name="password"
                  type="password"
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
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "var(--paper)" }}
        >
          <div
            className="w-full max-w-sm p-8 rounded-xl text-center"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "var(--shadow)",
            }}
          >
            <p style={{ color: "var(--muted)" }}>Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
