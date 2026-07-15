import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const demoEmail = cookieStore.get("tap_demo_email")?.value || "";
  const demoUser = cookieStore.get("tap_demo_user")?.value || "";
  const clientId = cookieStore.get("client-id")?.value || "";
  const allCookies = cookieStore.getAll();
  const demoTokens = allCookies.filter(c => c.name.includes("auth-token"));

  let profileId = "";
  let profileEmail = demoEmail;

  if (demoTokens.length > 0) {
    try {
      const token = demoTokens[0].value;
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      profileId = payload.sub || "";
      profileEmail = payload.email || demoEmail;
    } catch {}
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "tap_hub_project" } }
  );

  let profile = null;

  // 1. By profile ID (JWT sub)
  if (profileId) {
    const { data, error } = await supabase.from("profiles").select("role, full_name, modules").eq("id", profileId).maybeSingle();
    if (!error) profile = data;
  }

  // 2. By email
  if (!profile && profileEmail) {
    const { data } = await supabase.from("profiles").select("role, full_name, modules").eq("email", profileEmail).maybeSingle();
    profile = data;
  }

  // 3. By client-id cookie (profile ID override)
  if (!profile && clientId) {
    const { data } = await supabase.from("profiles").select("role, full_name, modules").eq("id", clientId).maybeSingle();
    profile = data;
  }

  // 4. By name (tap_demo_user cookie)
  if (!profile && demoUser) {
    const { data: all } = await supabase.from("profiles").select("id, role, full_name, modules");
    if (all) {
      const userLower = decodeURIComponent(demoUser).trim().toLowerCase();
      profile = all.find((p: any) => {
        const dbName = (p.full_name || "").trim().toLowerCase();
        if (dbName === userLower) return true;
        if (dbName.includes(",")) {
          const [last, first] = dbName.split(",").map((s: string) => s.trim());
          return `${first} ${last}` === userLower;
        }
        return false;
      }) || null;

      // 4b. Email prefix match
      if (!profile && profileEmail) {
        const emailPrefix = profileEmail.split("@")[0].toLowerCase();
        profile = all.find((p: any) => {
          const dbName = (p.full_name || "").trim().toLowerCase();
          if (dbName.includes(",")) {
            return (dbName.split(",")[1]?.trim() || "") === emailPrefix;
          }
          return (dbName.split(/\s+/)[0] || "") === emailPrefix;
        }) || null;
      }

      // 4c. Substring match on demoUser name
      if (!profile) {
        profile = all.find((p: any) => {
          const dbName = (p.full_name || "").trim().toLowerCase();
          return dbName.includes(userLower) || userLower.includes(dbName.replace(",", "").replace(/\s+/g, ""));
        }) || null;
      }
    }
  }

  // 5. Complete fallback: return all modules so nothing is blocked
  const role = profile?.role || "staff";
  const modules = (Array.isArray(profile?.modules) && profile.modules.length > 0)
    ? profile.modules
    : (profile ? [] : [
        // If no profile found, grant all modules as safety net (sidebar is the real gate)
        "Clients", "Workload", "Timesheet", "Financials", "Payroll",
        "Sales Tax", "1099s", "Tax Returns", "Renditions", "Annual Reports", "Vault",
        "Users & Access", "Support"
      ]);

  const response = NextResponse.json({ role, modules });
  response.cookies.set("tap_demo_role", role, {
    path: "/", maxAge: 86400, sameSite: "lax", httpOnly: false,
  });
  response.cookies.set("tap_modules", modules.join(","), {
    path: "/", maxAge: 86400, sameSite: "lax", httpOnly: false,
  });

  return response;
}
