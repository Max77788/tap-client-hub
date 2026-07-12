import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/payroll/paydays
 * Returns payday options grouped by frequency from the payroll spreadsheet.
 */
export async function GET() {
  // Payday options by frequency (from PAYROLL SPREADSHEET - Janeth)
  const FREQ_PAYDAYS: Record<string, string[]> = {
    "Weekly":       ["Fridays", "Saturdays"],
    "Bi-Weekly":    ["Thursdays", "Fridays"],
    "Semi-Monthly": ["5th/20th", "15th & EOM", "15th/EOM", "16th/EOM"],
    "Monthly":      ["EOM", "25th", "Fridays"],
    "Quarterly":    ["EOM"],
  };

  return NextResponse.json({ paydaysByFreq: FREQ_PAYDAYS });
}
