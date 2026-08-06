import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/time-entries — list all time entries with joined profile/client names
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(`*`)
    .order("started_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Batch fetch profiles and clients for name resolution
  const whoIds = [...new Set((data || []).map((e: any) => e.who).filter(Boolean))];
  const clientIds = [...new Set((data || []).map((e: any) => e.client_id).filter(Boolean))];

  let profiles: any[] = [];
  let clients: any[] = [];
  if (whoIds.length > 0) {
    const { data: pData } = await supabase.from("profiles").select("id, full_name").in("id", whoIds);
    if (pData) profiles = pData;
  }
  if (clientIds.length > 0) {
    const { data: cData } = await supabase.from("clients").select("id, name").in("id", clientIds);
    if (cData) clients = cData;
  }

  const profileMap: Record<string, string> = {};
  for (const p of profiles) profileMap[p.id] = p.full_name || "Unknown";
  const clientMap: Record<string, string> = {};
  for (const c of clients) clientMap[c.id] = c.name || "";

  const entries = (data || []).map((e: any) => ({
    id: e.id,
    personId: e.who,
    personName: profileMap[e.who] || "Unknown",
    clientId: e.client_id,
    clientName: clientMap[e.client_id] || e.client_id || "",
    serviceLabel: e.task || "",
    duration: e.seconds || 0,
    date: e.started_at,
    note: e.note || "",
    edited: e.edited || false,
    manual: e.manual || false,
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
      id: body.id || undefined,
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

// PATCH /api/time-entries?id=UUID — update a time entry (including start time and the calculated duration)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, any> = {};

  if (body.who !== undefined) updates.who = body.who;
  if (body.client_id !== undefined) updates.client_id = body.client_id;
  if (body.task !== undefined) updates.task = body.task;
  if (body.seconds !== undefined) updates.seconds = body.seconds;
  if (body.note !== undefined) updates.note = body.note;
  if (body.started_at !== undefined) updates.started_at = body.started_at;
  if (body.edited !== undefined) updates.edited = body.edited;
  if (body.edited) {
    updates.edited_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
