import { NextResponse } from "next/server";
import { resolveAccessIdentity } from "@/lib/access-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ROLE_MAP: Record<string, string> = {
  admin: "Owner / Admin",
  manager: "Manager",
  staff: "Staff",
  offshore: "Offshore",
};


/**
 * Least-privilege staff directory for assignment and workload interfaces.
 * It intentionally excludes emails, modules, 2FA state, and other account
 * management fields exposed by the admin-only /api/profiles endpoint.
 */
export async function GET() {
  const identity = await resolveAccessIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, role, location, reporting_manager, active")
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nameMap: Record<string, string> = {};
  for (const profile of profiles || []) {
    nameMap[profile.id] = profile.full_name || "";
  }

  return NextResponse.json((profiles || []).map(profile => {
    const rawName = profile.full_name || "";
    const displayName = rawName.includes(",")
      ? rawName.split(",").map(part => part.trim()).reverse().join(" ")
      : rawName;
    const managerRaw = profile.reporting_manager
      ? nameMap[profile.reporting_manager] || profile.reporting_manager
      : "—";
    const managerName = managerRaw.includes(",")
      ? managerRaw.split(",").map(part => part.trim()).reverse().join(" ")
      : managerRaw;

    return {
      id: profile.id,
      name: rawName,
      displayName,
      role: ROLE_MAP[profile.role] || profile.role || "Staff",
      location: profile.location || "",
      mgr: managerName,
      status: profile.active !== false ? "Active" : "Inactive",
    };
  }));
}
