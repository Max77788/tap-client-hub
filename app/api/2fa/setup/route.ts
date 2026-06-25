import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAndStoreCode, sendCodeEmail } from "@/lib/email-2fa";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_2fa_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.email_2fa_enabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  const result = await generateAndStoreCode(user.id);
  if (!result.ok) {
    console.error("setup: failed to store code:", result.error);
    return NextResponse.json({ error: "Failed to generate code. Try again." }, { status: 500 });
  }

  const sent = await sendCodeEmail(user.email, result.code, "setup");

  return NextResponse.json({
    sent,
    email: user.email,
    message: sent
      ? `Verification code sent to ${user.email}`
      : "Code generated (email not configured — set RESEND_API_KEY)",
  });
}
