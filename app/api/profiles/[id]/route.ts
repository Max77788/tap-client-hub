import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { requireUserManagementAccess } from "@/lib/access-server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/profiles/[id]
 * Remove a user from Supabase Auth AND the profiles table.
 * Requires the admin client (service_role key).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireUserManagementAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });
  try {
    const { id } = await params;

    const supabase = createAdminClient();

    // 1. Delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    // 2. Delete the profile row (triggers cascade or manual)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
