import { NextResponse } from "next/server";
import { Pool } from "pg";

const SQL = `
CREATE TABLE IF NOT EXISTS work_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id uuid REFERENCES client_services(id) ON DELETE CASCADE,
  period text NOT NULL,
  stage text DEFAULT 'not_started',
  done_by text,
  done_at timestamptz,
  UNIQUE(client_service_id, period)
);

ALTER TABLE client_services 
  ADD COLUMN IF NOT EXISTS sales_tax_notes TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_routing TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS group_assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS sales_tax_rt TEXT;
`;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Missing env" }, { status: 500 });
  const ref = url.replace("https://", "").split(".")[0];
  const results: string[] = [];
  
  // Try every combination
  const combos = [
    { user: `postgres.${ref}`, host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, label: "tx-pooler-postgres.ref" },
    { user: `postgres.${ref}`, host: "aws-0-us-east-1.pooler.supabase.com", port: 5432, label: "sess-pooler-postgres.ref" },
    { user: "postgres", host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, label: "tx-pooler-postgres" },
    { user: "postgres", host: `db.${ref}.supabase.co`, port: 5432, label: "direct-5432" },
    { user: `postgres.${ref}`, host: `db.${ref}.supabase.co`, port: 5432, label: "direct-postgres.ref" },
  ];
  
  for (const { user, host, port, label } of combos) {
    const pool = new Pool({
      host, port, database: "postgres", user, password: key,
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000,
    });
    try {
      const c = await pool.connect();
      try {
        const r = await c.query("SELECT 1 as test");
        // Connection works! Run the actual migration
        const m = await c.query(SQL);
        return NextResponse.json({ success: true, via: label, host, port, user, commands: m.map((x: any) => x.command) });
      } finally {
        c.release();
      }
    } catch (e: any) {
      results.push(`${label}: ${String(e.message).substring(0, 120)}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }
  
  return NextResponse.json({ error: "All failed", results, keyType: key.startsWith("eyJ") ? "JWT" : "raw" });
}
