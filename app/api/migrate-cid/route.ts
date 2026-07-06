import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, { db: { schema: "tap_hub_project" } });

    // Add cid column
    const { error: alterError } = await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS cid TEXT;`,
    });

    if (alterError) {
      // Try raw SQL via REST
      return NextResponse.json({ error: alterError.message, hint: "Try running this SQL in Supabase dashboard: ALTER TABLE clients ADD COLUMN IF NOT EXISTS cid TEXT;" });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
