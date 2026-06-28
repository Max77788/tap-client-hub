import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Read user email from demo cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)tap_demo_email=([^;]*)/);
    if (!match) {
      return NextResponse.json({ enabled: false, authenticated: false });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("email_2fa_enabled")
      .eq("email", decodeURIComponent(match[1]))
      .maybeSingle();

    return NextResponse.json({
      enabled: profile?.email_2fa_enabled ?? false,
      authenticated: true,
    });
  } catch (e: any) {
    return NextResponse.json({ enabled: false, authenticated: false });
  }
}
