import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const results: string[] = [];

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
    // Check if column already exists by trying to select it
    const { error } = await supabase
      .from("client_services")
      .select(col)
      .limit(1);

    if (error) {
      results.push(`❌ ${col}: ${error.message}`);
    } else {
      results.push(`✓ ${col}: exists`);
    }
  }

  return NextResponse.json({ results });
}
