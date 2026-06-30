import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { generateAndStoreCode, sendCodeEmail } from "@/lib/email-2fa";

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

  if (profile?.email_2fa_enabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  const result = await generateAndStoreCode(supabase, user.id);
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
