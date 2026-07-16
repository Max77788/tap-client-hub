import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { resolveAccessIdentity } from "@/lib/access-server";

/**
 * POST /api/profiles/[id]/password
 * Change a user's password using the Supabase admin API (bypasses RLS).
 * Body: { password: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identity = await resolveAccessIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!identity.canManageUsers && identity.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.auth.admin.updateUserById(id, {
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
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
