import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAndStoreCode, sendCodeEmail, verifyCode } from "@/lib/email-2fa";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("email_2fa_enabled").eq("id", user.id).maybeSingle();

  if (!profile?.email_2fa_enabled) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
  }

  let body: { code?: string } = {};
  try { body = await req.json(); } catch {}

  // If code provided, verify and disable
  if (body.code) {
    const valid = await verifyCode(user.id, body.code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    await supabase
      .from("profiles")
      .update({
        email_2fa_enabled: false,
        email_2fa_code: null,
        email_2fa_code_expires_at: null,
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  }

  // No code — send challenge email first
  const code = await generateAndStoreCode(user.id);
  const sent = await sendCodeEmail(user.email, code, "disable");

  return NextResponse.json({
    sent,
    email: user.email,
    message: sent
      ? `Verification code sent to ${user.email}`
      : "Code generated (email not configured)",
    awaiting_code: true,
  });
}
