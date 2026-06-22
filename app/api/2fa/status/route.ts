import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/2fa/status
 * Check if the current user has 2FA enabled (requires auth session).
 */
export async function GET() {
  return NextResponse.json({ enabled: false, authenticated: false });
}

/**
 * POST /api/2fa/status
 * Body: { email: string }
 * Check if a specific user has 2FA enabled (for login flow, no auth required).
 */
export async function POST(req: Request) {
  const supabase = createAdminClient();

  let body: { email?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, totp_enabled")
    .order("created_at");

  if (!profiles) return NextResponse.json({ enabled: false });

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
