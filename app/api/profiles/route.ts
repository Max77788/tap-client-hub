import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/profiles
 * List all profiles mapped to the User shape used by app/users
 */
export async function GET() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles) {
    return NextResponse.json([]);
  }

  // ── DB → User mapping ──
  const ROLE_MAP: Record<string, string> = {
    admin: "Owner / Admin",
    manager: "Manager",
    staff: "Staff",
    offshore: "Offshore",
  };

  const STATUS_MAP: Record<string, string> = {
    invited: "Invite sent",
    active: "Active",
    disabled: "Inactive",
  };

  const users = profiles.map((p: any) => {
    // Derive email: lowercase first + dot + last @tapallc.com
    const nameParts = (p.full_name || "").trim().split(/\s+/);
    const first = (nameParts[0] || "").toLowerCase();
    const last = nameParts.length > 1
      ? nameParts[nameParts.length - 1].toLowerCase()
      : "";
    const email = `${first}.${last}@tapallc.com`;

    return {
      id: p.id,
      name: p.full_name || "",
      email,
      username: email.split("@")[0],
      role: ROLE_MAP[p.role] || p.role || "Staff",
      location: p.location || "",
      mgr: p.reporting_manager || "—",
      modules: Array.isArray(p.modules) ? p.modules : [],
      status: STATUS_MAP[p.invite_status] ||
        (p.active ? "Active" : "Inactive"),
    };
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, email, password, role, location, reporting_manager, modules } = body;

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "full_name, email, and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: role || "staff" },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 409 });
    }

    // 2. Create profile record
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authUser.user.id,
      full_name,
      role: role || "staff",
      location: location || null,
      reporting_manager: reporting_manager || null,
      modules: Array.isArray(modules) ? modules : [],
      active: true,
      invite_status: "active",
    });

    if (profileError) {
      // Rollback: delete the auth user
      await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: authUser.user.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Also add PATCH for updating profiles ──

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name, role, location, reporting_manager, modules } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (location !== undefined) updateData.location = location;
    if (reporting_manager !== undefined) updateData.reporting_manager = reporting_manager;
    if (modules !== undefined) updateData.modules = modules;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
