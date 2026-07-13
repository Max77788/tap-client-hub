import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * GET /api/me
 * Reads the current user's role from profiles table and sets it as a cookie.
 * Called after successful login.
 */
export async function GET() {
  const cookieStore = await cookies();
  const demoEmail = cookieStore.get("tap_demo_email")?.value || "";
  // Check for Supabase auth token cookies
  const allCookies = cookieStore.getAll();
  const demoTokens = allCookies.filter(c => c.name.includes("auth-token"));

  // Determine user identity
  let profileId = "";
  let profileEmail = demoEmail;

  if (demoTokens.length > 0) {
    // Supabase auth — decode JWT to get user ID
    try {
      const token = demoTokens[0].value;
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      profileId = payload.sub || "";
      profileEmail = payload.email || demoEmail;
    } catch {}
  }

  // Try to find profile by email or ID
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "tap_hub_project" } }
  );

  let profile = null;
  if (profileId) {
    const { data } = await supabase.from("profiles").select("role, full_name, modules").eq("id", profileId).single();
    profile = data;
  }
  if (!profile && profileEmail) {
    // Try matching by name from tap_demo_user cookie
    const userName = cookieStore.get("tap_demo_user")?.value || "";
    const { data: all } = await supabase.from("profiles").select("id, role, full_name");
    if (all) {
      profile = all.find((p: any) => {
        const dbName = (p.full_name || "").trim().toLowerCase();
        const userLower = decodeURIComponent(userName).trim().toLowerCase();
        if (!userLower) return false;
        // Direct match
        if (dbName === userLower) return true;
        // "lastname, firstname" vs "firstname lastname"
        if (dbName.includes(",")) {
          const [last, first] = dbName.split(",").map((s: string) => s.trim());
          return `${first} ${last}` === userLower;
        }
        return false;
      }) || null;

      // Fallback: try email prefix match
      if (!profile) {
        const emailPrefix = profileEmail.split("@")[0].toLowerCase();
        profile = all.find((p: any) => {
          const dbName = (p.full_name || "").trim().toLowerCase();
          if (dbName.includes(",")) {
            const first = dbName.split(",")[1]?.trim() || "";
            return first === emailPrefix;
          }
          const parts = dbName.split(/\s+/);
          return (parts[0] || "") === emailPrefix;
        }) || null;
      }
    }
  }

  const role = profile?.role || "staff";
  const modules = Array.isArray(profile?.modules) ? profile.modules : [];

  const response = NextResponse.json({ role, modules });
  response.cookies.set("tap_demo_role", role, {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
    httpOnly: false,
  });
  response.cookies.set("tap_modules", modules.join(","), {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
