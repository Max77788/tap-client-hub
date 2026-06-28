import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only admins/managers can toggle 2FA for other users
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!caller || (caller.role !== "admin" && caller.role !== "manager")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: { target_user_id?: string; enabled?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.target_user_id) {
    return NextResponse.json({ error: "target_user_id is required" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("profiles")
    .update({
      email_2fa_enabled: body.enabled ?? true,
      // Clear any pending codes when toggling
      email_2fa_code: null,
      email_2fa_code_expires_at: null,
    })
    .eq("id", body.target_user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    enabled: body.enabled ?? true,
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only admins/managers can view all 2FA statuses
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!caller || (caller.role !== "admin" && caller.role !== "manager")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("user_id");

  const adminSupabase = createAdminClient();
  let query = adminSupabase
    .from("profiles")
    .select("id, full_name, email_2fa_enabled");

  if (targetUserId) {
    query = query.eq("id", targetUserId);
  }

  const { data, error } = await query.order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
