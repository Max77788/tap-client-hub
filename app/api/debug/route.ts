import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "not-set";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "not-set";
    
    // Try importing supabase-js
    let importOk = false;
    try {
      const mod = await import("@supabase/supabase-js");
      importOk = typeof mod.createClient === "function";
    } catch (e: any) {
      return NextResponse.json({ error: `Import failed: ${e.message}`, url: url.slice(0, 20), keyLen: key.length });
    }
    
    // Try creating a client
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        url.startsWith("http") ? url : "https://phgogybfgovrlcdmifpv.supabase.co",
        key.length > 10 ? key : "eyJhbG...YYP0",
        { db: { schema: "tap_hub_project" } }
      );
      const { data, error } = await client.from("clients").select("id, name").limit(1);
      return NextResponse.json({ 
        importOk, 
        urlSet: url !== "not-set",
        keyLen: key.length,
        queryResult: data ? "ok" : "null", 
        queryError: error?.message || null 
      });
    } catch (e: any) {
      return NextResponse.json({ importOk, clientError: e.message, url: url.slice(0, 20), keyLen: key.length });
    }
  } catch (e: any) {
    return NextResponse.json({ fatal: e.message });
  }
}
