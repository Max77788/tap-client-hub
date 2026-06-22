import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/2fa/challenge
 * Body: { email: string, code: string }
 * Verifies a 2FA code during login (no auth session required).
 */
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: { email?: string; code?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email || !body.code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, totp_secret, totp_enabled")
    .order("created_at");

  if (!profiles) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const targetEmail = body.email.toLowerCase().trim();
  const match = profiles.find((p: any) => {
    const parts = (p.full_name || "").trim().split(/\s+/);
    const first = (parts[0] || "").toLowerCase();
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    return `${first}.${last}@tapallc.com` === targetEmail;
  });

  if (!match || !match.totp_enabled || !match.totp_secret) {
    return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
  }

  const verified = speakeasy.totp.verify({
    secret: match.totp_secret,
    encoding: "base32",
    token: body.code,
    window: 1,
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("tap_2fa_verified", match.id, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 86400,
  });
  return response;
}
