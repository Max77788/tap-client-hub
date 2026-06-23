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

type Attempt = { label: string; user: string; host: string; port: number };

const ATTEMPTS: Attempt[] = [
  { label: "session-pooler-postgres.ref", user: "postgres.PH_REF", host: "aws-0-us-east-1.pooler.supabase.com", port: 5432 },
  { label: "transaction-pooler-postgres.ref", user: "postgres.PH_REF", host: "aws-0-us-east-1.pooler.supabase.com", port: 6543 },
  { label: "session-pooler-postgres", user: "postgres", host: "aws-0-us-east-1.pooler.supabase.com", port: 5432 },
  { label: "direct-postgres", user: "postgres", host: "db.PH_REF.supabase.co", port: 5432 },
  { label: "direct-postgres-6543", user: "postgres", host: "db.PH_REF.supabase.co", port: 6543 },
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const ref = url.replace("https://", "").split(".")[0];

  const results: Record<string, string> = {};

  for (const { label, user, host, port } of ATTEMPTS) {
    const actualUser = user.replace("PH_REF", ref);
    const actualHost = host.replace("PH_REF", ref);
    
    const pool = new Pool({
      host: actualHost,
      port,
      database: "postgres",
      user: actualUser,
      password: key,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(MIGRATION_SQL);
        return NextResponse.json({ 
          success: true, 
          command: result.command,
          via: `${label} (${actualHost}:${port})`,
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      results[label] = err.message?.substring(0, 100);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  return NextResponse.json({ 
    error: "All connection attempts failed",
    results,
  });
}
