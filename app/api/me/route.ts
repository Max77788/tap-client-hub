import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function reverseName(name: string): string {
  // "Tushar Patil" -> "Patil, Tushar"
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const demoName = decodeURIComponent(nameMatch[1]);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    // Try direct match first, then reversed "Last, First" format
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("full_name", reverseName(demoName))
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email || "",
      name: profile.full_name || "",
      role: profile.role || "",
      location: profile.location || "",
      email_2fa_enabled: profile.email_2fa_enabled ?? false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}
