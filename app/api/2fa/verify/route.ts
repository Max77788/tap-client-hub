import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getSupabaseClient } from "@/lib/supabase/auth-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCode } from "@/lib/email-2fa";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req.headers.get("cookie") || "");
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { user, supabase } = auth;

  let body: { code?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.code || body.code.length !== 6) {
    return NextResponse.json({ error: "6-digit code is required" }, { status: 400 });
  }

  // Use admin client (service_role key) for verification to bypass RLS
  const adminSupabase = createAdminClient();
  const valid = await verifyCode(adminSupabase, user.id, body.code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from("profiles")
    .update({
      email_2fa_enabled: true,
      email_2fa_code: null,
      email_2fa_code_expires_at: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save: " + error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
