import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with service_role key — bypasses RLS.
 * Use ONLY in API routes that need to query profiles without an auth session
 * (e.g., 2FA login flow).
 *
 * Falls back to anon key if SERVICE_ROLE_KEY is not set (e.g., local dev).
 * Auth admin operations (createUser, updateUserById) will fail without it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "tap_hub_project" } });
}
