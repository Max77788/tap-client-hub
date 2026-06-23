import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      error: "Missing env vars",
      has_url: !!url,
      has_key: !!key,
      url_preview: url ? url.substring(0, 30) + "..." : null,
    });
  }

  // Use raw fetch to call Supabase REST API for column check
  const columns = [
    "sales_tax_notes",
    "tax_id",
    "bank_name",
    "bank_routing",
    "bank_account",
    "group_assigned_to",
    "sales_tax_rt",
  ];

  const results: string[] = [];

  for (const col of columns) {
    const res = await fetch(
      `${url}/rest/v1/client_services?select=${col}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );

    if (res.ok) {
      results.push(`✓ ${col}: exists`);
    } else {
      const txt = await res.text();
      if (txt.includes("does not exist") || txt.includes("column")) {
        results.push(`❌ ${col}: MISSING`);
      } else {
        results.push(`⚠ ${col}: ${txt.substring(0, 100)}`);
      }
    }
  }

  return NextResponse.json({ results, ok: true });
}
