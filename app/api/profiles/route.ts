import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { requireUserDirectoryAccess, requireUserManagementAccess } from "@/lib/access-server";
import { effectiveModules, sanitizeModulesForRole } from "@/lib/access-policy";
import { usernameFromFullName } from "@/lib/profile-identity";

export const dynamic = "force-dynamic";

/**
 * GET /api/profiles
 * List all profiles mapped to the User shape used by app/users
 */
export async function GET() {
  const access = await requireUserDirectoryAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "tap_hub_project" } }
  );

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

  // Try to get real emails from auth.users (admin client may not have service_role key)
  let emailMap: Record<string, string> = {};
  try {
    const adminSupabase = createAdminClient();
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();
    if (!authError && authUsers?.users) {
      for (const u of authUsers.users) {
      emailMap[u.id] = u.email || "";
      }
    }
  } catch {
    // Fallback: derive email from name (no service_role key available)
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
    // ── Normalize name: DB stores "Last,First" but UI should show "First Last" ──
    const rawName = p.full_name || "";
    const displayName = rawName.includes(",")
      ? rawName.split(",").map((s: string) => s.trim()).reverse().join(" ")
      : rawName;

    // Profile email is the approved destination for 2FA. Auth email is intentionally internal.
    const email = p.email || emailMap[p.id] || "";

    // Resolve reporting_manager UUID to display name (also normalize)
    const mgrRaw = p.reporting_manager
      ? (nameMap[p.reporting_manager] || p.reporting_manager)
      : "—";
    const mgrName = typeof mgrRaw === "string" && mgrRaw.includes(",")
      ? mgrRaw.split(",").map((s: string) => s.trim()).reverse().join(" ")
      : mgrRaw;

    return {
      id: p.id,
      name: p.full_name || "",           // DB value for PATCH lookups
      displayName,                        // "First Last" for display
      email,
      username: usernameFromFullName(p.full_name),
      role: ROLE_MAP[p.role] || p.role || "Staff",
      location: p.location || "",
      mgr: mgrName,
      mgrRaw: nameMap[p.reporting_manager] || null,
      modules: effectiveModules(p.role, p.modules),
      status: STATUS_MAP[p.invite_status] ||
        (p.active ? "Active" : "Inactive"),
      email_2fa_enabled: p.email_2fa_enabled ?? false,
      allow_edit_client_data: p.allow_edit_client_data === true,
    };
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const access = await requireUserManagementAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });
  try {
    const body = await request.json();
    const { full_name, email, password, role, location, reporting_manager, modules, email_2fa_enabled, allow_edit_client_data } = body;

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "full_name, email, and password are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    // 1. Create user in Supabase Auth via sign-up (works with anon key)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: role || "staff" },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 409 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // 2. Resolve reporting_manager name → UUID if it looks like a name
    let mgrId: string | null = null;
    if (reporting_manager && reporting_manager !== "—") {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(reporting_manager)) {
        mgrId = reporting_manager;
      } else {
        const { data: mgrProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", reporting_manager)
          .maybeSingle();
        if (mgrProfile) {
          mgrId = mgrProfile.id;
        }
      }
    }

    // 3. Create profile record
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      full_name,
      email: String(email).trim().toLowerCase(),
      role: role || "staff",
      location: location || null,
      reporting_manager: mgrId,
      modules: sanitizeModulesForRole(role || "staff", modules),
      active: true,
      invite_status: "active",
      email_2fa_enabled: email_2fa_enabled === true,
      allow_edit_client_data: allow_edit_client_data === true,
    });

    if (profileError) {
      // Rollback: sign out and delete (best effort)
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: authData.user.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Also add PATCH for updating profiles ──

export async function PATCH(request: Request) {
  const access = await requireUserManagementAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });
  try {
    const body = await request.json();
    const { id, full_name, email, role, location, reporting_manager, modules, allow_edit_client_data, email_2fa_enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    const adminSupabase = createAdminClient();
    const { data: targetProfileData } = await adminSupabase.from("profiles").select("email").eq("id", id).maybeSingle();
    const targetEmail = (targetProfileData as unknown as { email?: string } | null)?.email?.toLowerCase();
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsersList = (authUsers as unknown as { users: Array<{ id: string; email?: string | null }> } | null)?.users || [];
    const authUserId = authUsersList.find((user) => user.email?.toLowerCase() === targetEmail)?.id || id;
    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
      }
      // Keep the authentication and 2FA destination addresses in sync for staff users.
      const { error: emailError } = await adminSupabase.auth.admin.updateUserById(authUserId, { email: normalizedEmail });
      if (emailError) return NextResponse.json({ error: emailError.message }, { status: 400 });
      updateData.email = normalizedEmail;
    }
    if (email_2fa_enabled !== undefined) updateData.email_2fa_enabled = email_2fa_enabled === true;
    if (role !== undefined) updateData.role = role;
    if (location !== undefined) updateData.location = location;
    if (modules !== undefined) {
      let moduleRole = role;
      if (moduleRole === undefined) {
        const adminSupabase = createAdminClient();
        const { data: existing } = await adminSupabase
          .from("profiles")
          .select("role")
          .eq("id", id)
          .maybeSingle();
        moduleRole = existing?.role || "staff";
      }
      updateData.modules = sanitizeModulesForRole(moduleRole, modules);
    }
    if (body.active !== undefined) updateData.active = body.active;
    if (body.invite_status !== undefined) updateData.invite_status = body.invite_status;
    if (allow_edit_client_data !== undefined) updateData.allow_edit_client_data = allow_edit_client_data === true;

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
          const { data: mgrProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("full_name", reporting_manager)
            .maybeSingle();
          updateData.reporting_manager = mgrProfile ? mgrProfile.id : null;
        }
      }
    }

    // Handle password change if provided (uses admin client to update auth user)
    if (body.password) {
      try {
        const { error: pwError } = await adminSupabase.auth.admin.updateUserById(authUserId, { password: body.password });
        if (pwError) {
          return NextResponse.json({ error: pwError.message }, { status: 400 });
        }
      } catch (pwErr: any) {
        return NextResponse.json({ error: pwErr.message || "Failed to update password" }, { status: 400 });
      }
    }

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
