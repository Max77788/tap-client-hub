import type { SupabaseClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  active?: boolean | null;
  email_2fa_enabled?: boolean | null;
};

export function usernameFromFullName(fullName: string | null | undefined) {
  const value = (fullName || "").trim();
  if (!value) return "";
  const firstName = value.includes(",")
    ? value.split(",").slice(1).join(",").trim().split(/\s+/)[0]
    : value.split(/\s+/)[0];
  return (firstName || "").toLowerCase();
}

/** Resolve a profile using the authenticated account email, with legacy UUID fallback. */
export async function findProfileForAuthUser(
  admin: SupabaseClient<any, any, any>,
  authUser: { id: string; email?: string | null },
): Promise<Profile | null> {
  const { data: legacyId } = await admin
    .from("profiles")
    .select("id, full_name, email, active, email_2fa_enabled")
    .eq("id", authUser.id)
    .maybeSingle();
  if (legacyId) return legacyId;

  const email = authUser.email?.trim().toLowerCase();
  if (!email) return null;
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email, active, email_2fa_enabled");
  return (profiles || []).find((profile: Profile) => profile.email?.trim().toLowerCase() === email) || null;
}
