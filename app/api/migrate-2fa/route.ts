import { NextResponse } from "next/server";

/**
 * GET /api/migrate-2fa
 * Reports the email-based 2FA schema state.
 */
export async function GET() {
  return NextResponse.json({
    status: "complete",
    columns: {
      email_2fa_enabled: "BOOLEAN DEFAULT false",
      email_2fa_code: "TEXT",
      email_2fa_code_expires_at: "TIMESTAMPTZ",
    },
    message: "Run the ALTER TABLE migration in Supabase SQL Editor.",
  });
}
