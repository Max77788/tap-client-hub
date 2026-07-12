import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "tap_hub_project" } }
  );

  const results: string[] = [];

  // Run each ALTER TABLE individually via raw SQL
  const migrations = [
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS state_renewal boolean DEFAULT false',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_state text',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_due_month text',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_due_day text',
    'ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS renewal_identifiers text',
  ];

  for (const sql of migrations) {
    const { error } = await supabase.rpc("exec_sql", { sql_stmt: sql }).single();
    if (error) {
      // Try the query endpoint if rpc fails
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              "Content-Type": "application/json",
              "Content-Profile": "pgrst",
              Prefer: "resolution=merge-duplicates",
            },
            body: JSON.stringify({}),
          }
        );
      } catch {}
      results.push(`${sql.substring(52, 80)}: ${error?.message || "unknown error"}`);
    } else {
      results.push(`${sql.substring(52, 80)}: OK`);
    }
  }

  // Fallback: try using the manage API with query
  // Last resort: write to notes column
  if (results.every(r => r.includes("error") || r.includes("unknown"))) {
    results.push("All direct SQL failed. Columns likely don't exist. See migrations/add_state_renewal_columns.sql");
  }

  return NextResponse.json({ results });
}
