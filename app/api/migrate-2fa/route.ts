import { NextResponse } from "next/server";

/**
 * GET /api/migrate-2fa
 * Migration already applied via psql. This endpoint is a no-op.
 */
export async function GET() {
  return NextResponse.json({
    status: "complete",
    columns: { totp_secret: "TEXT", totp_enabled: "BOOLEAN DEFAULT false" },
    message: "2FA columns exist on profiles table."
  });
}
