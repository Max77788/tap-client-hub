/**
 * Extract the authenticated Supabase user from cookies without using @supabase/ssr.
 *
 * Works for both real Supabase auth (sb-*-auth-token) and fallback.
 * Returns { user, supabase } where supabase is a raw @supabase/supabase-js client
 * scoped to the tap_hub_project schema.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://phgogybfgovrlcdmifpv.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbG...YYP0";

export function getSupabaseClient() {
  return createClient(URL, ANON_KEY, { db: { schema: "tap_hub_project" } });
}

export function getSupabaseClientDefault() {
  return createClient(URL, ANON_KEY);
}

/**
 * Extract email from tap_demo_email cookie fallback.
 * The profiles table has no email column, so we rely on this cookie
 * set during login for demo users.
 */
function getEmailFromCookie(cookieHeader: string): string {
  const match = cookieHeader.match(/(?:^|;\\s*)tap_demo_email=([^;]*)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {}
  }
  return "";
}

export async function getAuthUser(cookieHeader: string) {
  const supabase = getSupabaseClient();

  // Strategy 1: Supabase auth token from cookies
  const authCookieMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
  if (authCookieMatch) {
    try {
      const token = JSON.parse(decodeURIComponent(authCookieMatch[1]));
      const accessToken = token.access_token;
      if (accessToken) {
        const supabaseAuth = getSupabaseClientDefault();
        const { data: { user } } = await supabaseAuth.auth.getUser(accessToken);
        if (user && user.email) {
          return { user, supabase };
        }
      }
    } catch {}
  }

  // Strategy 2: tap_demo_user cookie
  const nameMatch = cookieHeader.match(/(?:^|;\\s*)tap_demo_user=([^;]*)/);
  if (nameMatch) {
    try {
      const demoName = decodeURIComponent(nameMatch[1]);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", demoName)
        .maybeSingle();
      if (profile && profile.id) {
        return {
          user: { id: profile.id, email: getEmailFromCookie(cookieHeader) } as any,
          supabase,
        };
      }
      // Try reversed name
      const parts = demoName.trim().split(/\s+/);
      if (parts.length >= 2) {
        const last = parts.pop()!;
        const reversed = `${last}, ${parts.join(" ")}`;
        const { data: revProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", reversed)
          .maybeSingle();
        if (revProfile && revProfile.id) {
          return {
            user: { id: revProfile.id, email: getEmailFromCookie(cookieHeader) } as any,
            supabase,
          };
        }
      }
    } catch {}
  }

  // Strategy 3: tap_demo_email cookie (fallback for mismatched name formats)
  const emailMatch = cookieHeader.match(/(?:^|;\\s*)tap_demo_email=([^;]*)/);
  if (emailMatch) {
    try {
      const email = decodeURIComponent(emailMatch[1]);
      const nameFromEmail = email.split("@")[0];
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${nameFromEmail}%,full_name.eq.${nameFromEmail}`)
        .maybeSingle();
      if (data && data.id) {
        return {
          user: { id: data.id, email } as any,
          supabase,
        };
      }
    } catch {}
  }

  return null;
}
