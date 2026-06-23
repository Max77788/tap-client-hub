import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const results: string[] = [];

  // Check if columns exist by selecting them
  try {
    const { data, error } = await supabase
      .from("client_services")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json({ error: `client_services table error: ${error.message}` });
    }

    results.push("✓ client_services table accessible");
  } catch (e: any) {
    return NextResponse.json({ error: `Connection failed: ${e.message}` });
  }

  const columns = [
    "sales_tax_notes",
    "tax_id", 
    "bank_name",
    "bank_routing",
    "bank_account",
    "group_assigned_to",
    "sales_tax_rt",
  ];

  for (const col of columns) {
    const { data, error } = await supabase
      .from("client_services")
      .select(col)
      .limit(1);

    if (error) {
      if (error.message.includes("does not exist")) {
        results.push(`❌ ${col}: MISSING`);
      } else {
        results.push(`⚠ ${col}: ${error.message}`);
      }
    } else {
      results.push(`✓ ${col}: exists`);
    }
  }

  return NextResponse.json({ results });
}
