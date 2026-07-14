import { NextResponse } from "next/server";

async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await getSupabase();

    // Run each migration statement via raw SQL
    const { error } = await supabase.rpc("", {}).select(); // dummy check
    
    // Use direct query approach
    const sql = `
      ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    `;
    
    // Supabase JS doesn't have raw SQL. Let's use the REST API directly.
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const statements = [
      "ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true",
      "ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_at TIMESTAMPTZ",
      "ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_by TEXT",
      "UPDATE tap_hub_project.clients SET active = true WHERE active IS NULL",
    ];
    
    const results: string[] = [];
    for (const stmt of statements) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": key,
            "Authorization": `Bearer ${key}`,
            "Prefer": "resolution=merge-duplicates",
          },
          body: JSON.stringify({ query: stmt }),
        });
        results.push(`${res.status}: ${stmt.substring(0, 60)}...`);
      } catch (e: any) {
        results.push(`Error: ${e.message}`);
      }
    }
    
    // Verify
    const { data, error: checkErr } = await supabase
      .from("clients")
      .select("active,active_updated_at,active_updated_by")
      .limit(1);
    
    return NextResponse.json({
      success: !checkErr,
      results,
      sample: data?.[0] || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
