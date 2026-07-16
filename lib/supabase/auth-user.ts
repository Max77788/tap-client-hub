/**
 * Resolve the current authenticated user for server-side account APIs.
 * Supabase sessions and demo sessions are both validated by the shared
 * authoritative access resolver. Client-writable display cookies are never
 * accepted as authentication.
 */
import { createClient } from "@supabase/supabase-js";
import { resolveAccessIdentity } from "@/lib/access-server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rqxscydyvrvbdkqagemy.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbG...YYP0";

export function getSupabaseClient() {
  return createClient(URL, ANON_KEY, { db: { schema: "tap_hub_project" } });
}

export function getSupabaseClientDefault() {
  return createClient(URL, ANON_KEY);
}

export async function getAuthUser(_cookieHeader: string) {
  const identity = await resolveAccessIdentity();
  if (!identity) return null;

  return {
    user: {
      id: identity.id,
      email: identity.email,
      user_metadata: { full_name: identity.name, role: identity.role },
    } as any,
    supabase: getSupabaseClient(),
  };
}
