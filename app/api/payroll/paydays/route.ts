import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET() {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    const { data, error } = await supabase
      .from("client_services")
      .select("paydate")
      .not("paydate", "is", null)
      .neq("paydate", "");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unique = Array.from(new Set(data.map((r: any) => r.paydate)))
      .filter(Boolean)
      .filter((v: string) => !v.includes("@"))  // exclude emails
      .sort();
    return NextResponse.json({ paydays: unique });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
