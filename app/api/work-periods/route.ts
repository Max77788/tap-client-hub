import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/work-periods?client_id=X&service_code=FIN&year=2026
// Returns work_periods joined with client_services and services
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const clientId = searchParams.get("client_id");
  const serviceCode = searchParams.get("service_code");
  const year = searchParams.get("year");

  let query = supabase
    .from("work_periods")
    .select(`
      id,
      client_service_id,
      period,
      stage,
      done_by,
      done_at,
      client_service:client_services(
        id,
        client_id,
        service_id,
        assigned_to,
        active,
        frequency,
        processor,
        service:services(id, code, name)
      )
    `)
    .order("period", { ascending: true });

  if (clientId) {
    // Filter by client_id through client_services
    query = query.eq("client_service.client_id", clientId);
  }

  if (serviceCode) {
    // Need to get the service_id first
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .eq("code", serviceCode.toUpperCase())
      .single();

    if (svc) {
      // Join through client_services to filter by service_id
      // We filter work_periods whose client_service has this service_id
      const { data: csIds } = await supabase
        .from("client_services")
        .select("id")
        .eq("service_id", svc.id);

      if (csIds && csIds.length > 0) {
        query = query.in(
          "client_service_id",
          csIds.map((cs: any) => cs.id)
        );
      } else {
        // No matching client_services, return empty
        return NextResponse.json({ periods: [] });
      }
    }
  }

  if (year) {
    const yearInt = parseInt(year) * 100;
    query = query.gte("period", yearInt + 1).lte("period", yearInt + 12);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const periods = (data || []).map((wp: any) => ({
    id: wp.id,
    clientServiceId: wp.client_service_id,
    period: wp.period,
    stage: wp.stage,
    doneBy: wp.done_by,
    doneAt: wp.done_at,
    clientService: wp.client_service
      ? {
          id: wp.client_service.id,
          clientId: wp.client_service.client_id,
          serviceId: wp.client_service.service_id,
          assignedTo: wp.client_service.assigned_to,
          active: wp.client_service.active,
          frequency: wp.client_service.frequency,
          processor: wp.client_service.processor,
          service: wp.client_service.service
            ? {
                id: wp.client_service.service.id,
                code: wp.client_service.service.code,
                name: wp.client_service.service.name,
              }
            : null,
        }
      : null,
  }));

  return NextResponse.json({ periods });
}

// POST /api/work-periods — upsert a work period
// Body: { client_service_id, period, stage, done_by? }
// Uses upsert based on client_service_id + period conflict
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { client_service_id, period, stage, done_by } = body;

  if (!client_service_id || !period || !stage) {
    return NextResponse.json(
      { error: "Missing required fields: client_service_id, period, stage" },
      { status: 400 }
    );
  }

  // Convert "2026-07" to integer 202607 for DB compatibility
  const periodInt = typeof period === "string" && period.includes("-")
    ? parseInt(period.replace("-", ""))
    : parseInt(String(period));

  // Check if a row already exists for this client_service_id + period
  const { data: existing } = await supabase
    .from("work_periods")
    .select("id")
    .eq("client_service_id", client_service_id)
    .eq("period", periodInt)
    .maybeSingle();

  let result;
  if (existing) {
    // Update
    result = await supabase
      .from("work_periods")
      .update({
        stage,
        done_by: done_by || null,
        done_at: stage === "done" ? new Date().toISOString() : null,
      })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    // Insert
    result = await supabase
      .from("work_periods")
      .insert({
        client_service_id,
        period: periodInt,
        stage,
        done_by: done_by || null,
        done_at: stage === "done" ? new Date().toISOString() : null,
      })
      .select()
      .single();
  }

  const { data, error } = result;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ period: data });
}
