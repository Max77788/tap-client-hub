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

  // Try 1: pooler with postgres.ref user
  try {
    const pool = new Pool({ host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, database: "postgres", user: `postgres.${ref}`, password: key, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    const c = await pool.connect();
    try { const r = await c.query(SQL); results.push("pooler-postgres.ref: " + JSON.stringify(r.map(x => x.command))); return NextResponse.json({ success: true, results }); }
    finally { c.release(); await pool.end(); }
  } catch (e: any) { results.push("pooler-postgres.ref: " + String(e.message).substring(0, 100)); }

  // Try 2: pooler with postgres user
  try {
    const pool = new Pool({ host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, database: "postgres", user: "postgres", password: key, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    const c = await pool.connect();
    try { const r = await c.query(SQL); results.push("pooler-postgres: " + JSON.stringify(r.map(x => x.command))); return NextResponse.json({ success: true, results }); }
    finally { c.release(); await pool.end(); }
  } catch (e: any) { results.push("pooler-postgres: " + String(e.message).substring(0, 100)); }

  // Try 3: direct with postgres user
  try {
    const pool = new Pool({ host: `db.${ref}.supabase.co`, port: 6543, database: "postgres", user: "postgres", password: key, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    const c = await pool.connect();
    try { const r = await c.query(SQL); results.push("direct-6543: " + JSON.stringify(r.map(x => x.command))); return NextResponse.json({ success: true, results }); }
    finally { c.release(); await pool.end(); }
  } catch (e: any) { results.push("direct-6543: " + String(e.message).substring(0, 100)); }

  return NextResponse.json({ error: "All attempts failed", results, keyPrefix: key.substring(0, 12) });
}
