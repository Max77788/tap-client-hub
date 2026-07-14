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
    
    // First, check if columns exist by trying to select them
    const { data: check, error: checkErr } = await supabase
      .from("clients")
      .select("active, active_updated_at, active_updated_by")
      .limit(1);
    
    if (checkErr) {
      // Columns don't exist — need to create them
      // Use the REST API to create an RPC function first, then call it
      return NextResponse.json({
        status: "columns_missing",
        error: checkErr.message,
        hint: "Run the migration SQL manually in Supabase Dashboard SQL Editor",
        sql: `ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;\nALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_at TIMESTAMPTZ;\nALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_by TEXT;\nUPDATE tap_hub_project.clients SET active = true WHERE active IS NULL;`
      });
    }
    
    // Columns exist — run the UPDATE to set defaults
    const { error: updateErr } = await supabase
      .from("clients")
      .update({ active: true })
      .is("active", null);
    
    return NextResponse.json({
      status: "columns_exist",
      sample: check?.[0] || null,
      updated_count: updateErr ? 0 : "done",
      update_error: updateErr?.message || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
