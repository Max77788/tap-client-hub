import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY in env" }, { status: 500 });
  }

  // First: ALTER TABLE to add columns
  const supabase = createClient(url, key, { db: { schema: "tap_hub_project" } });
  const results: Record<string, unknown>[] = [];

  // Try running SQL via the management endpoint
  // Supabase allows raw SQL via the REST API with service_role key
  const sql = `
    -- period_counts table for count-based worklists (payroll, 1099s)
    CREATE TABLE IF NOT EXISTS tap_hub_project.period_counts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      client_service_id UUID NOT NULL,
      period TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(client_service_id, period)
    );

    ALTER TABLE tap_hub_project.period_counts
      ADD CONSTRAINT IF NOT EXISTS fk_period_counts_client_service
      FOREIGN KEY (client_service_id)
      REFERENCES tap_hub_project.client_services(id)
      ON DELETE CASCADE;

    ALTER TABLE IF EXISTS tap_hub_project.period_counts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all" ON tap_hub_project.period_counts;
    CREATE POLICY "Allow all" ON tap_hub_project.period_counts FOR ALL USING (true) WITH CHECK (true);

    -- Credentials table columns
    ALTER TABLE IF EXISTS credentials
      ADD COLUMN IF NOT EXISTS login TEXT,
      ADD COLUMN IF NOT EXISTS password TEXT,
      ADD COLUMN IF NOT EXISTS url TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS created_by TEXT,
      ADD COLUMN IF NOT EXISTS client_name TEXT,
      ADD COLUMN IF NOT EXISTS entity_name TEXT,
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS portal_url TEXT,
      ADD COLUMN IF NOT EXISTS service_type TEXT,
      ADD COLUMN IF NOT EXISTS ip_restrictions TEXT;

    -- Client services 7/2 redesign columns
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS biweekly_code TEXT DEFAULT NULL;
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS pay_start_date TEXT DEFAULT NULL;
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS filing_state TEXT DEFAULT NULL;
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS due_month TEXT DEFAULT NULL;
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS return_type TEXT DEFAULT NULL;
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS pay_emails TEXT[] DEFAULT NULL;
  `;

  // Use PostgREST with raw SQL (requires pgjwt claim in service_role)
  const resp = await fetch(`${url}/rest/v1/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Accept": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  results.push({
    step: "ALTER TABLE via PostgREST",
    status: resp.status,
    body: await resp.text().catch(() => "n/a"),
  });

  // Next: try via rpc if PostgREST doesn't work
  if (resp.status !== 200) {
    const { error } = await supabase.rpc("exec_sql", { sql_text: sql }).maybeSingle();
    results.push({
      step: "ALTER TABLE via rpc",
      error: error?.message || null,
    });
  }

  try {
    const { data: cols, error: colErr } = await supabase
      .from("credentials")
      .select("login, password, url, notes, created_by, client_name, entity_name, category, portal_url, service_type, ip_restrictions")
      .limit(1);

    results.push({
      step: "Verify columns",
      data: cols,
      error: colErr?.message || null,
    });
  } catch (e: unknown) {
    results.push({
      step: "Verify columns (catch)",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({ results });
}
