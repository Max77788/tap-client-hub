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

    // `profiles.id` is not guaranteed to be the Supabase Auth user id. TAP Hub
    // has legacy/imported profiles where the two UUIDs differ. Resolve the
    // auth account by the profile's canonical email before updating it.
    let authUserId = id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", id)
      .maybeSingle();

    if (profile?.email) {
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }
      const authUserList = (authUsers as unknown as { users: Array<{ id: string; email?: string | null }> }).users || [];
      const matchingAuthUser = authUserList.find(
        (authUser) => authUser.email?.trim().toLowerCase() === profile.email.trim().toLowerCase()
      );
      if (!matchingAuthUser) {
        return NextResponse.json({ error: "No login account found for this profile" }, { status: 404 });
      }
      authUserId = matchingAuthUser.id;
    }

    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("tap_force_password");
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
