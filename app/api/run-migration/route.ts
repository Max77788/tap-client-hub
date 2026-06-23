import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const pool = new Pool({
    host: "db.phgogybfgovrlcdmifpv.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const results: string[] = [];
  const columns = [
    "sales_tax_notes",
    "tax_id",
    "bank_name",
    "bank_routing",
    "bank_account",
    "group_assigned_to",
    "sales_tax_rt",
  ];

  try {
    for (const col of columns) {
      try {
        await pool.query(
          `ALTER TABLE client_services ADD COLUMN IF NOT EXISTS ${col} text;`
        );
        results.push(`✓ ${col}`);
      } catch (e: any) {
        results.push(`❌ ${col}: ${e.message}`);
      }
    }
  } finally {
    await pool.end();
  }

  return NextResponse.json({ results });
}
