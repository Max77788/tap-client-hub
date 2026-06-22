import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/2fa/status
 * Check if the current authenticated user has 2FA enabled.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ enabled: false, authenticated: false });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("totp_enabled")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    enabled: profile?.totp_enabled ?? false,
    authenticated: true,
  });
}
