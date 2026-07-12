import { Pool } from "pg";

/**
 * Direct PostgreSQL connection to Supabase.
 * Used for operations that PostgREST schema cache doesn't know about (newly-added columns).
 */
export function createClient(): Pool {
  return new Pool({
    host: "db.rqxscydyvrvbdkqagemy.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD || "BIvtIZP9RHIrcZRg",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    max: 1,
    idleTimeoutMillis: 30000,
  });
}
