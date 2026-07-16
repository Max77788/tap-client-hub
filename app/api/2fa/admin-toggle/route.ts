import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserManagementAccess } from "@/lib/access-server";

export async function POST(req: NextRequest) {
  const access = await requireUserManagementAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });

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
  const access = await requireUserManagementAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });

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
