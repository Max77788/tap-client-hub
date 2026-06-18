"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
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
            Associates, LLC &middot; Client Hub
          </p>
        </div>

        <h1 className="text-xl font-semibold text-center mb-6">
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-colors
                border outline-none
                focus:ring-2 focus:ring-offset-0"
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
              <a
                href="#"
                className="text-xs"
                style={{ color: "var(--muted)" }}
              >
                Forgot password?
              </a>
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
              className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-colors
                border outline-none
                focus:ring-2 focus:ring-offset-0"
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
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity
              disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--teal)",
              color: "#ffffff",
            }}
          >
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--muted)" }}
        >
          Contact your administrator for account access.
        </p>
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
            <p style={{ color: "var(--muted)" }}>Loading…</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
