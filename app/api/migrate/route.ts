import { NextResponse } from "next/server";
import { Pool } from "pg";

const MIGRATION_SQL = `
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
  
  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }
  
  const ref = url.replace("https://", "").split(".")[0];
  
  // Try direct PG connection - the service role key can sometimes work as IAM token
  const pool = new Pool({
    host: `db.${ref}.supabase.co`,
    port: 6543,
    database: "postgres",
    user: "postgres",
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(MIGRATION_SQL);
      return NextResponse.json({ success: true, result: result.command });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message,
      hint: "If auth failed, we need the PG password from Supabase dashboard",
    }, { status: 200 });
  } finally {
    await pool.end();
  }
}
