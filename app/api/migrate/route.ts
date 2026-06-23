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

  // Try connecting via Supabase session pooler (resolves to IPv4)
  const pool = new Pool({
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 5432,
    database: "postgres",
    user: `postgres.${ref}`,
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(MIGRATION_SQL);
      return NextResponse.json({ success: true, command: result.command });
    } finally {
      client.release();
    }
  } catch (err: any) {
    // If session pooler fails, try transaction pooler
    if (err.message?.includes("auth") || err.message?.includes("password")) {
      try {
        const pool2 = new Pool({
          host: `aws-0-us-east-1.pooler.supabase.com`,
          port: 6543,
          database: "postgres",
          user: `postgres.${ref}`,
          password: key,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        });
        const client2 = await pool2.connect();
        try {
          const result2 = await client2.query(MIGRATION_SQL);
          return NextResponse.json({ success: true, command: result2.command, via: "transaction-pooler" });
        } finally {
          client2.release();
        }
      } catch (err2: any) {
        return NextResponse.json({
          error: "Both poolers failed",
          session_error: err.message,
          transaction_error: err2.message,
        });
      }
    }

    return NextResponse.json({
      error: err.message,
      hint: "DNS or connection issue"
    });
  } finally {
    await pool.end().catch(() => {});
  }
}
