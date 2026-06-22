import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/2fa/challenge
 * Body: { email: string, code: string }
 * Verifies a 2FA code during login (no auth session required yet).
 * Returns a session cookie if valid.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  let body: { email?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, code } = body;

  if (!email || !code) {
    return NextResponse.json(
      { error: "Email and code are required" },
      { status: 400 }
    );
  }

  // Look up the profile and its TOTP secret
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, totp_secret, totp_enabled")
    .order("created_at");

  if (!profiles) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetEmail = email.toLowerCase().trim();
  const match = profiles.find((p: any) => {
    const parts = (p.full_name || "").trim().split(/\s+/);
    const first = (parts[0] || "").toLowerCase();
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    return `${first}.${last}@tapallc.com` === targetEmail;
  });

  if (!match || !match.totp_enabled || !match.totp_secret) {
    return NextResponse.json(
      { error: "2FA is not configured for this account" },
      { status: 400 }
    );
  }

  // Verify the TOTP code
  const isValid = authenticator.check(code, match.totp_secret);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid verification code. Try again." },
      { status: 400 }
    );
  }

  // Set a 2FA-verified session cookie so the middleware allows access
  const response = NextResponse.json({ success: true, verified: true });
  response.cookies.set("tap_2fa_verified", match.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400, // 24 hours
  });

  return response;
}
