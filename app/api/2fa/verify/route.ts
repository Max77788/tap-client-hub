import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { secret?: string; code?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.secret || !body.code) {
    return NextResponse.json({ error: "Secret and code are required" }, { status: 400 });
  }

  const verified = speakeasy.totp.verify({
    secret: body.secret,
    encoding: "base32",
    token: body.code,
    window: 1,
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ totp_secret: body.secret, totp_enabled: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save: " + error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
