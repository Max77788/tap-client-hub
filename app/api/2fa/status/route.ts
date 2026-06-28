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
    let profile: any = null;

    // Strategy 1: tap_demo_user cookie
    const nameMatch = cookieHeader.match(/(?:^|;\s*)tap_demo_user=([^;]*)/);
    if (nameMatch) {
      const demoName = decodeURIComponent(nameMatch[1]);
      // Try raw name first, then reversed
      let { data } = await supabase
        .from("profiles")
        .select("email_2fa_enabled")
        .eq("full_name", demoName)
        .maybeSingle();
      if (!data) {
        const { data: rev } = await supabase
          .from("profiles")
          .select("email_2fa_enabled")
          .eq("full_name", reverseName(demoName))
          .maybeSingle();
        data = rev;
      }
      profile = data;
    }

    // Strategy 2: Supabase auth token
    if (!profile) {
      const authMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
      if (authMatch) {
        try {
          const token = JSON.parse(decodeURIComponent(authMatch[1]));
          const supabaseAuth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { user } } = await supabaseAuth.auth.getUser(token.access_token);
          if (user) {
            const { data } = await supabase
              .from("profiles")
              .select("email_2fa_enabled")
              .eq("id", user.id)
              .maybeSingle();
            profile = data;
          }
        } catch {}
      }
    }

    // Strategy 3: tap_demo_email cookie
    if (!profile) {
      const emailMatch = cookieHeader.match(/(?:^|;\s*)tap_demo_email=([^;]*)/);
      if (emailMatch) {
        const { data } = await supabase
          .from("profiles")
          .select("email_2fa_enabled")
          .eq("email", decodeURIComponent(emailMatch[1]))
          .maybeSingle();
        profile = data;
      }
    }

    return NextResponse.json({
      enabled: profile?.email_2fa_enabled ?? false,
      authenticated: true,
    });
  } catch (e: any) {
    return NextResponse.json({ enabled: false, authenticated: false });
  }
}
