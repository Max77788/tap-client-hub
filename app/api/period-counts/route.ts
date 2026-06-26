import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/period-counts?client_service_id=X&year=2026
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const csId = searchParams.get("client_service_id");
  const year = searchParams.get("year");

  let query = supabase.from("period_counts").select("*");
  if (csId) query = query.eq("client_service_id", csId);
  if (year) query = query.like("period", `${year}-%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counts: data || [] });
}

// POST /api/period-counts — upsert a count for a month
// Body: { client_service_id, period, processed }
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { client_service_id, period, processed } = body;

  if (!client_service_id || !period || processed === undefined) {
    return NextResponse.json({ error: "Missing client_service_id, period, or processed" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("period_counts")
    .select("client_service_id, period")
    .eq("client_service_id", client_service_id)
    .eq("period", period)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("period_counts")
      .update({ processed: Math.max(0, processed), updated_at: new Date().toISOString() })
      .eq("client_service_id", client_service_id)
      .eq("period", period)
      .select()
      .single();
  } else {
    result = await supabase
      .from("period_counts")
      .insert({ client_service_id, period, processed: Math.max(0, processed) })
      .select()
      .single();
  }

  const { data, error } = result;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data });
}
