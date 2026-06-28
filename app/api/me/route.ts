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
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    // Strategy 1: Read tap_demo_user cookie (demo logins)
    const nameMatch = cookieHeader.match(/(?:^|;\s*)tap_demo_user=([^;]*)/);
    if (nameMatch) {
      const demoName = decodeURIComponent(nameMatch[1]);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("full_name", reverseName(demoName))
        .maybeSingle();
      if (profile) {
        return NextResponse.json({
          id: profile.id,
          email: profile.email || "",
          name: profile.full_name || "",
          role: profile.role || "",
          location: profile.location || "",
          email_2fa_enabled: profile.email_2fa_enabled ?? false,
        });
      }
    }

    // Strategy 2: Read Supabase auth token from cookies (real auth)
    const authCookieMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
    if (authCookieMatch) {
      try {
        const token = JSON.parse(decodeURIComponent(authCookieMatch[1]));
        const accessToken = token.access_token;
        if (accessToken) {
          const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { user } } = await supabaseAuth.auth.getUser(accessToken);
          if (user) {
            // Also try to set tap_demo_user for future requests
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();
            if (profile) {
              return NextResponse.json({
                id: profile.id,
                email: user.email || "",
                name: profile.full_name || "",
                role: profile.role || "",
                location: profile.location || "",
                email_2fa_enabled: profile.email_2fa_enabled ?? false,
              });
            }
          }
        }
      } catch {}
    }

    // Strategy 3: Try tap_demo_email cookie (fallback)
    const emailMatch = cookieHeader.match(/(?:^|;\s*)tap_demo_email=([^;]*)/);
    if (emailMatch) {
      const email = decodeURIComponent(emailMatch[1]);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (profile) {
        return NextResponse.json({
          id: profile.id,
          email: email,
          name: profile.full_name || "",
          role: profile.role || "",
          location: profile.location || "",
          email_2fa_enabled: profile.email_2fa_enabled ?? false,
        });
      }
    }

    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}
