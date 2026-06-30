import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { generateAndStoreCode, sendCodeEmail, verifyCode } from "@/lib/email-2fa";

/**
 * POST /api/2fa/challenge
 * Two modes:
 *   1. No body or { email: string } — sends a new code to the user's email
 *   2. { code: string } — verifies the code
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req.headers.get("cookie") || "");
  if (!auth || !auth.user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { user, supabase } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_2fa_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.email_2fa_enabled) {
    return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
  }

  let body: { code?: string } = {};
  try { body = await req.json(); } catch {}

  // Mode 2: verify code
  if (body.code) {
    if (body.code.length !== 6) {
      return NextResponse.json({ error: "6-digit code is required" }, { status: 400 });
    }

    const valid = await verifyCode(supabase, user.id, body.code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Clear the used code
    await supabase
      .from("profiles")
      .update({ email_2fa_code: null, email_2fa_code_expires_at: null })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  }

  // Mode 1: send code
  const result = await generateAndStoreCode(supabase, user.id);
  if (!result.ok) {
    console.error("challenge: failed to store code:", result.error);
    return NextResponse.json({ error: "Failed to generate code. Try again." }, { status: 500 });
  }

  const sent = await sendCodeEmail(user.email, result.code, "login");

  return NextResponse.json({
    sent,
    email: user.email,
    message: sent
      ? `Code sent to ${user.email}`
      : "Code generated (email not configured)",
  });
}
