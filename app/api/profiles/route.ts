import { createClient } from "@/lib/supabase/server";
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
