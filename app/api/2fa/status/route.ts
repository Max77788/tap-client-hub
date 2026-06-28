import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function reverseName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts.pop()!;
  return `${last}, ${parts.join(" ")}`;
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const nameMatch = cookieHeader.match(/(?:^|;\s*)tap_demo_user=([^;]*)/);
    if (!nameMatch) {
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
      .eq("full_name", reverseName(decodeURIComponent(nameMatch[1])))
      .maybeSingle();

    return NextResponse.json({
      enabled: profile?.email_2fa_enabled ?? false,
      authenticated: true,
    });
  } catch (e: any) {
    return NextResponse.json({ enabled: false, authenticated: false });
  }
}
