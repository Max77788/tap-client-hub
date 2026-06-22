import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/2fa/challenge
 * Body: { email: string, code: string }
 * Verifies a 2FA code during login. Requires Supabase session from password step.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  let body: { code?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.code || body.code.length !== 6) {
    return NextResponse.json({ error: "6-digit code is required" }, { status: 400 });
  }

  // Get the user's TOTP secret from their profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("totp_secret, totp_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.totp_enabled || !profile?.totp_secret) {
    return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
  }

  const verified = speakeasy.totp.verify({
    secret: profile.totp_secret,
    encoding: "base32",
    token: body.code,
    window: 1,
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
