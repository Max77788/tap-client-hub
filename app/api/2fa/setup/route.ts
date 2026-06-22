import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { createClient } from "@/lib/supabase/server";

const ISSUER = "TAP Hub";

/**
 * POST /api/2fa/setup
 * Generate a TOTP secret and provisioning URI.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if 2FA is already enabled
  const { data: profile } = await supabase
    .from("profiles")
    .select("totp_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.totp_enabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  // Generate secret
  const secret = authenticator.generateSecret();
  const email = user.email || user.id;

  // Build otpauth URI
  const otpauth = authenticator.keyuri(email, ISSUER, secret);

  return NextResponse.json({ secret, otpauth });
}
