import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "tap_hub_project" } }
  );

  const { data, error } = await supabase
    .from("contacts")
    .select("id, client_id, email, phone")
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: data?.length || 0, sample: data });
}
