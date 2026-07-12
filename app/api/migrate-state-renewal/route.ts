import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const migrations = [
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS state_renewal boolean DEFAULT false',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_state text',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_due_month text',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_due_day text',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_identifiers text',
  ];

  const results: string[] = [];

  for (const sql of migrations) {
    // Try direct PostgreSQL via Supabase API
    const res = await fetch(`${url}/rest/v1/`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "tx=commit",
        "Content-Profile": "pgrst",
      },
      body: JSON.stringify({
        query: sql
      }),
    });
    
    const body = await res.text();
    results.push(`${res.status}: ${sql.substring(52, 80)} → ${body.substring(0, 80)}`);
  }

  return NextResponse.json({ results });
}
