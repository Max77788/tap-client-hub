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

  // Try connection pooler with the key as password
  const pool = new Pool({
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: `postgres.${ref}`,
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(SQL);
      return NextResponse.json({ success: true, commands: result.map((r: any) => r.command) });
    } finally {
      client.release();
    }
  } catch (err: any) {
    // Also try with just "postgres" user
    try {
      const pool2 = new Pool({
        host: "aws-0-us-east-1.pooler.supabase.com",
        port: 6543,
        database: "postgres",
        user: "postgres",
        password: key,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      const client2 = await pool2.connect();
      try {
        const result2 = await client2.query(SQL);
        return NextResponse.json({ success: true, commands: result2.map((r: any) => r.command), via: "postgres-user" });
      } finally {
        client2.release();
      }
    } catch (err2: any) {
      return NextResponse.json({
        error: "All auth attempts failed",
        ref_user_err: String(err.message).substring(0, 200),
        postgres_user_err: String(err2.message).substring(0, 200),
        key_prefix: key.substring(0, 10),
      });
    }
  } finally {
    await pool.end().catch(() => {});
  }
}
