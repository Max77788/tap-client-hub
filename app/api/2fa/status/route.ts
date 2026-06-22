import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/2fa/status
 * Check if the current user has 2FA enabled.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated — user hasn't logged in yet
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

/**
 * POST /api/2fa/status
 * Body: { email: string }
 * Check if a specific user has 2FA enabled (for login flow, no auth required).
 * Only returns whether 2FA is enabled on the profile, no secret exposure.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Look up the profile by email (derived from full_name)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, totp_enabled")
    .order("created_at");

  if (!profiles) {
    return NextResponse.json({ enabled: false });
  }

  // Match by derived email pattern
  const targetEmail = body.email.toLowerCase().trim();
  const match = profiles.find((p: any) => {
    const parts = (p.full_name || "").trim().split(/\s+/);
    const first = (parts[0] || "").toLowerCase();
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    return `${first}.${last}@tapallc.com` === targetEmail;
  });

  return NextResponse.json({
    enabled: match?.totp_enabled ?? false,
    profileId: match?.id ?? null,
  });
}
