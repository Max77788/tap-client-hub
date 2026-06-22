import { NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { createClient } from "@/lib/supabase/server";

const ISSUER = "TAP Hub";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("totp_enabled").eq("id", user.id).maybeSingle();

  if (profile?.totp_enabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  const secret = speakeasy.generateSecret({
    name: `${ISSUER}: ${user.email || user.id}`,
    length: 20,
  });

  return NextResponse.json({
    secret: secret.base32,
    otpauth: secret.otpauth_url,
  });
}
