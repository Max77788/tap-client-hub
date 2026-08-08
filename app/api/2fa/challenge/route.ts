import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { findProfileForAuthUser } from "@/lib/profile-identity";
import { generateAndStoreCode, sendCodeEmail, verifyCode } from "@/lib/email-2fa";

/** POST /api/2fa/challenge - issue or verify a login code. */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req.headers.get("cookie") || "");
  if (!auth || !auth.user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { user } = auth;
  const admin = createAdminClient();
  const profile = await findProfileForAuthUser(admin, user);
  if (!profile?.email_2fa_enabled || !profile.email) {
    return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
  }

  let body: { code?: string } = {};
  try { body = await req.json(); } catch {}

  if (body.code) {
    if (body.code.length !== 6) {
      return NextResponse.json({ error: "6-digit code is required" }, { status: 400 });
    }

    const valid = await verifyCode(admin, profile.id, body.code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    await admin
      .from("profiles")
      .update({ email_2fa_code: null, email_2fa_code_expires_at: null })
      .eq("id", profile.id);

    return NextResponse.json({ success: true, name: profile.full_name || user.email });
  }

  const result = await generateAndStoreCode(admin, profile.id);
  if (!result.ok) {
    console.error("challenge: failed to store code:", result.error);
    return NextResponse.json({ error: "Failed to generate code. Try again." }, { status: 500 });
  }

  const sent = await sendCodeEmail(profile.email, result.code, "login");
  return NextResponse.json({
    sent,
    email: profile.email,
    message: sent ? `Code sent to ${profile.email}` : "Code generated (email not configured)",
  });
}
