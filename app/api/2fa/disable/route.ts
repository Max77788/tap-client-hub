import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("totp_secret, totp_enabled").eq("id", user.id).maybeSingle();

  if (!profile?.totp_enabled || !profile?.totp_secret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
  }

  let body: { code?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const verified = speakeasy.totp.verify({
    secret: profile.totp_secret, encoding: "base32", token: body.code, window: 1,
  });

  if (!verified) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  await supabase.from("profiles").update({ totp_secret: null, totp_enabled: false }).eq("id", user.id);
  return NextResponse.json({ success: true });
}
