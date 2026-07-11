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
    const { data } = await supabase.from("profiles").select("role, full_name").eq("id", profileId).single();
    profile = data;
  }
  if (!profile && profileEmail) {
    // Look up by derived email
    const { data: all } = await supabase.from("profiles").select("id, role, full_name");
    if (all) {
      profile = all.find((p: any) => {
        const parts = (p.full_name || "").trim().split(/\s+/);
        const derived = `${(parts[0] || "").toLowerCase()}.${(parts[parts.length - 1] || "").toLowerCase()}@tapallc.com`;
        return derived === profileEmail;
      }) || null;
    }
  }

  const role = profile?.role || "staff"; // Default to staff if not found

  const response = NextResponse.json({ role });
  response.cookies.set("tap_demo_role", role, {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
    httpOnly: false, // Allow JS to read for sidebar filtering
  });

  return response;
}
