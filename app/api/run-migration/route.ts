import { NextResponse } from "next/server";
import { Pool } from "pg";

// We'll try to get the connection from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const sql = `
        ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_at TIMESTAMPTZ;
        ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_by TEXT;
        UPDATE tap_hub_project.clients SET active = true WHERE active IS NULL;
      `;
      
      const results: string[] = [];
      for (const stmt of sql.split(";").filter(s => s.trim())) {
        try {
          await client.query(stmt.trim());
          results.push(`OK: ${stmt.trim().substring(0, 60)}`);
        } catch (e: any) {
          results.push(`Error: ${e.message?.substring(0, 100)}`);
        }
      }
      
      const { rows } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='tap_hub_project' AND table_name='clients' AND column_name IN ('active','active_updated_at','active_updated_by')"
      );
      
      const { rows: sample } = await client.query(
        "SELECT active, active_updated_at, active_updated_by FROM tap_hub_project.clients LIMIT 1"
      );
      
      return NextResponse.json({
        success: true,
        columns_found: rows.map((r: any) => r.column_name),
        sample: sample[0] || null,
        results,
      });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
