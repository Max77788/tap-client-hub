import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/profiles
 * List all profiles mapped to the User shape used by app/users
 */
export async function GET() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

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

  // Fetch real emails from auth.users via admin client
  let emailMap: Record<string, string> = {};
  try {
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
    if (!authError && authUsers?.users) {
      for (const u of authUsers.users) {
        emailMap[u.id] = u.email || "";
      }
    }
  } catch {
    // Fallback: derive email from name
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

  // Build profile name lookup for reporting_manager UUID → name resolution
  const nameMap: Record<string, string> = {};
  for (const p of profiles) {
    nameMap[p.id] = p.full_name || "";
  }

  const users = profiles.map((p: any) => {
    // Use real email from auth.users if available, otherwise derive
    let email = emailMap[p.id] || "";
    if (!email) {
      const nameParts = (p.full_name || "").trim().split(/\s+/);
      const first = (nameParts[0] || "").toLowerCase();
      const last = nameParts.length > 1
        ? nameParts[nameParts.length - 1].toLowerCase()
        : "";
      email = `${first}.${last}@tapallc.com`;
    }

    // Resolve reporting_manager UUID to display name
    const mgrName = p.reporting_manager
      ? (nameMap[p.reporting_manager] || p.reporting_manager)
      : "—";

    return {
      id: p.id,
      name: p.full_name || "",
      email,
      username: email.split("@")[0],
      role: ROLE_MAP[p.role] || p.role || "Staff",
      location: p.location || "",
      mgr: mgrName,
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

    // 2. Resolve reporting_manager name → UUID if it looks like a name (not a UUID and not "—")
    let mgrId: string | null = null;
    if (reporting_manager && reporting_manager !== "—") {
      // Check if it's already a UUID (from the dropdown using IDs)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(reporting_manager)) {
        mgrId = reporting_manager;
      } else {
        // It's a name — look up the UUID from profiles
        const { data: mgrProfile } = await adminSupabase
          .from("profiles")
          .select("id")
          .eq("full_name", reporting_manager)
          .maybeSingle();
        if (mgrProfile) {
          mgrId = mgrProfile.id;
        }
      }
    }

    // 3. Create profile record (use admin client — anon key can't insert profiles)
    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: authUser.user.id,
      full_name,
      role: role || "staff",
      location: location || null,
      reporting_manager: mgrId,
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

    const adminSupabase = createAdminClient();

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (location !== undefined) updateData.location = location;
    if (modules !== undefined) updateData.modules = modules;

    // Resolve reporting_manager name → UUID if needed
    if (reporting_manager !== undefined) {
      if (!reporting_manager || reporting_manager === "—") {
        updateData.reporting_manager = null;
      } else {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(reporting_manager)) {
          updateData.reporting_manager = reporting_manager;
        } else {
          // It's a name — look up UUID
          const { data: mgrProfile } = await adminSupabase
            .from("profiles")
            .select("id")
            .eq("full_name", reporting_manager)
            .maybeSingle();
          updateData.reporting_manager = mgrProfile ? mgrProfile.id : null;
        }
      }
    }

    const { error } = await adminSupabase
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
