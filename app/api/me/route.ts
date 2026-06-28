import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Read user email from demo cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)tap_demo_email=([^;]*)/);
    if (!match) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const email = decodeURIComponent(match[1]);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email || email,
      name: profile.full_name || "",
      role: profile.role || "",
      location: profile.location || "",
      email_2fa_enabled: profile.email_2fa_enabled ?? false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}
