import { NextResponse } from "next/server";
import { resolveAccessIdentity } from "@/lib/access-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await resolveAccessIdentity();
    if (!identity) {
      return NextResponse.json(
        { enabled: false, authenticated: false },
        { status: 401 }
      );
    }

    const { data: profile, error } = await createAdminClient()
      .from("profiles")
      .select("email_2fa_enabled")
      .eq("id", identity.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      enabled: profile?.email_2fa_enabled ?? false,
      authenticated: true,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { enabled: false, authenticated: false },
      { status: 500 }
    );
  }
}