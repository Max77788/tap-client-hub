import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/2fa/verify
 * Body: { secret: string, code: string }
 * Verifies the TOTP code and saves the secret to the user's profile.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { secret?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { secret, code } = body;

  if (!secret || !code) {
    return NextResponse.json(
      { error: "Secret and code are required" },
      { status: 400 }
    );
  }

  // Verify the TOTP code
  const isValid = authenticator.check(code, secret);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid verification code. Try again." },
      { status: 400 }
    );
  }

  // Save the secret and enable 2FA
  const { error } = await supabase
    .from("profiles")
    .update({ totp_secret: secret, totp_enabled: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save 2FA settings: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "2FA enabled successfully" });
}
