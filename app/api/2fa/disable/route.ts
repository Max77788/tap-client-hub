import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/2fa/disable
 * Body: { code: string }
 * Disables 2FA for the current user. Requires current TOTP code.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get current secret
  const { data: profile } = await supabase
    .from("profiles")
    .select("totp_secret, totp_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.totp_enabled || !profile?.totp_secret) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.code) {
    return NextResponse.json({ error: "Current code is required to disable 2FA" }, { status: 400 });
  }

  // Verify the code before disabling
  const isValid = authenticator.check(body.code, profile.totp_secret);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Disable 2FA
  const { error } = await supabase
    .from("profiles")
    .update({ totp_secret: null, totp_enabled: false })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "2FA disabled" });
}
