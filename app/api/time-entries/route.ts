import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/time-entries — list all time entries with joined profile/client names
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(`
      id,
      who,
      client_id,
      client_service_id,
      task,
      started_at,
      seconds,
      note,
      edited,
      edited_by,
      edited_at,
      profile:profiles!time_entries_who_fkey(full_name),
      client:clients(name)
    `)
    .order("started_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data || []).map((e: any) => ({
    id: e.id,
    personId: e.who,
    personName: e.profile?.full_name || "Unknown",
    clientId: e.client_id,
    clientName: e.client?.name || "",
    serviceLabel: e.task || "",
    duration: e.seconds || 0,
    date: e.started_at,
    note: e.note || "",
    edited: e.edited || false,
  }));

  return NextResponse.json({ entries });
}

// POST /api/time-entries — create a new time entry
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      who: body.who,
      client_id: body.client_id || null,
      client_service_id: body.client_service_id || null,
      task: body.task || "",
      started_at: body.started_at || new Date().toISOString(),
      seconds: body.seconds || 0,
      note: body.note || "",
      edited: false,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

// DELETE /api/time-entries?id=UUID — delete a time entry
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const { error } = await supabase.from("time_entries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
