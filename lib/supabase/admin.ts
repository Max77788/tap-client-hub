import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with service_role key — bypasses RLS.
 * Use ONLY in API routes that need to query profiles without an auth session
 * (e.g., 2FA login flow).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "tap_hub_project" } }
  );
}
