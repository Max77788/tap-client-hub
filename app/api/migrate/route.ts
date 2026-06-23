import { NextResponse } from "next/server";

// SQL migration to add sales tax columns to client_services
const MIGRATION_SQL = `
-- Add missing columns to client_services table
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
  
  // Extract project ref from URL: https://<ref>.supabase.co
  const ref = url.replace("https://", "").split(".")[0];
  
  try {
    // Use Supabase Management API SQL endpoint
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key,
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: result.message || "Migration failed",
        detail: result,
        status: response.status,
      }, { status: 200 });
    }
    
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
