import { NextResponse } from "next/server";

export async function GET() {
  // Report all available Postgres-related env vars
  const pgVars = Object.keys(process.env)
    .filter(k => k.includes("POSTGRES") || k.includes("DATABASE") || k.includes("SUPABASE") || k.includes("PG"))
    .reduce((acc, k) => ({ ...acc, [k]: (process.env[k] || "").substring(0, 15) + "..." }), {});
    
  return NextResponse.json({
    count: Object.keys(pgVars).length,
    vars: pgVars,
    has_db_url: !!process.env.DATABASE_URL,
    has_postgres_url: !!process.env.POSTGRES_URL,
  });
}
