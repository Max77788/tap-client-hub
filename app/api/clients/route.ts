import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

// ── Helper: create a Supabase client ──
async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "tap_hub_project" } }
  );
}

const CODE_TO_KEY: Record<string, ServiceKey> = {
  FIN: "financials", PR: "payroll", STX: "sales_tax",
  T9: "1099s", REND: "renditions", TAX: "tax_returns",
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "tap_hub_project" } }
    );

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type")?.toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "1000");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [totalCount, bizCount, persCount] = (await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active").ilike("type", "business"),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active").ilike("type", "personal"),
    ])).map(r => r.count ?? 0);

    let query = supabase.from("clients").select("*, contacts(*)").eq("status", "active");
    if (typeFilter === "business" || typeFilter === "personal") {
      query = query.filter("type", "ilike", typeFilter);
    }
    const { data: dbClients } = await query.order("name").range(offset, offset + limit - 1);
    if (!dbClients) return NextResponse.json({ clients: [], stats: { total: totalCount, business: bizCount, personal: persCount } });

    const ids = dbClients.map((c: any) => c.id);
    // Batch IN queries — PostgREST chokes on too many values (Bad Request)
    const BATCH_SIZE = 200;
    let dbServices: any[] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const { data: batchData } = await supabase
        .from("client_services")
        .select("*, service:services(*)")
        .eq("active", true)
        .in("client_id", batch);
      if (batchData) dbServices = dbServices.concat(batchData);
    }

    const svcByClient: Record<string, any[]> = {};
    for (const cs of dbServices || []) {
      if (!svcByClient[cs.client_id]) svcByClient[cs.client_id] = [];
      svcByClient[cs.client_id].push(cs);
    }

    const allCsIds = (dbServices || []).map((cs: any) => cs.id);
    const periodByCsId: Record<string, Record<number, string>> = {};
    if (allCsIds.length > 0) {
      const BATCH_SIZE = 200;
      let allPeriods: any[] = [];
      for (let i = 0; i < allCsIds.length; i += BATCH_SIZE) {
        const batch = allCsIds.slice(i, i + BATCH_SIZE);
        const { data: batchPeriods } = await supabase
          .from("work_periods")
          .select("client_service_id, stage, period")
          .in("client_service_id", batch);
        if (batchPeriods) allPeriods = allPeriods.concat(batchPeriods);
      }
      for (const wp of allPeriods) {
        const m = wp.period?.match(/^\d{4}-(\d{2})$/);
        if (!m) continue;
        const mi = parseInt(m[1]) - 1;
        if (mi >= 0 && mi < 12) {
          if (!periodByCsId[wp.client_service_id]) periodByCsId[wp.client_service_id] = {};
          periodByCsId[wp.client_service_id][mi] = wp.stage;
        }
      }
    }

    const { data: staffRows } = await supabase.from("profiles").select("id, full_name");
    const staffNames: Record<string, string> = {};
    for (const s of staffRows || []) staffNames[s.id] = s.full_name;

    const clients = dbClients.map((db: any) => {
      const svcs = svcByClient[db.id] || [];
      const services = svcs.map((cs: any) => {
        const key = CODE_TO_KEY[cs.service?.code || ""] || "financials";
        return {
          csId: cs.id, key, label: SERVICE_META[key]?.label,
          enabled: true, frequency: cs.frequency || "Monthly",
          processor: cs.processor || "", assignedTo: staffNames[cs.assigned_to || ""] || cs.assigned_to || "",
          expectedAnnual: cs.expected_annual ? Number(cs.expected_annual) || 0 : 0,
          currentStage: (periodByCsId[cs.id]?.[new Date().getMonth()] || "not_started"),
          months: Array.from({ length: 12 }, (_, i) => {
            const s = periodByCsId[cs.id]?.[i];
            return !s ? "lock" : s === "done" ? "done" : s === "na" ? "na" : s === "in_progress" ? "in_progress" : s === "waiting_client" ? "waiting" : s === "prepared" ? "billed" : "lock";
          }),
        };
      });
      const seen = new Set(services.map((s: any) => s.key));
      for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
        if (!seen.has(key)) services.push({ csId: "", key, label: SERVICE_META[key].label, enabled: false, frequency: "Monthly", processor: "", assignedTo: "", expectedAnnual: 0, currentStage: "not_started", months: Array(12).fill("lock") });
      }
      return {
        id: db.id, cid: db.cid || "CID-" + db.id.substring(0, 4),
        name: db.name, type: db.type === "Business" ? "Business" : "Personal",
        group: db.group_owner || "Unassigned", status: db.status || "active",
        city: db.city || "", state: db.state || "TX",
        emails: [...new Set((db.contacts || []).map((c: any) => c.email).filter(Boolean))],
        phones: (db.contacts || []).map((c: any) => c.phone).filter(Boolean),
        address: db.address || "",
        assignedStaff: staffNames[svcs[0]?.assigned_to || ""] || svcs[0]?.assigned_to || "Unassigned",
        services,
      };
    });

    return NextResponse.json({ clients, stats: { total: totalCount, business: bizCount, personal: persCount } });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}

// ── PUT /api/clients — update client services (e.g. service toggle on/off) ──
export async function PUT(request: Request) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { id: clientId, services } = body;

    if (!clientId) {
      return NextResponse.json({ error: "client id is required" }, { status: 400 });
    }

    // Reverse map: frontend key -> service code
    const KEY_TO_CODE: Record<string, string> = {
      financials: "FIN", payroll: "PR", sales_tax: "STX",
      "1099s": "T9", renditions: "REND", tax_returns: "TAX",
    };

    // Build unique codes we need
    const codes = [...new Set(services
      .filter((s: any) => KEY_TO_CODE[s.key])
      .map((s: any) => KEY_TO_CODE[s.key])
    )];

    // Get service IDs for codes
    const { data: svcRows } = await supabase
      .from("services")
      .select("id, code")
      .in("code", codes);

    if (!svcRows) {
      return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }

    const svcCodeToId: Record<string, string> = {};
    for (const sr of svcRows) svcCodeToId[sr.code] = sr.id;

    // Get existing client_services rows for this client
    const { data: existingRows } = await supabase
      .from("client_services")
      .select("id, client_id, service_id, active, frequency, assigned_to, processor")
      .eq("client_id", clientId);

    const existingByServiceId: Record<string, any> = {};
    for (const row of existingRows || []) {
      existingByServiceId[row.service_id] = row;
    }

    const results: { key: string; action: string }[] = [];

    for (const svc of services) {
      const code = KEY_TO_CODE[svc.key];
      if (!code) continue;
      const serviceId = svcCodeToId[code];
      if (!serviceId) {
        results.push({ key: svc.key, action: "skipped (no service row)" });
        continue;
      }

      const existing = existingByServiceId[serviceId];
      const wantsEnabled = svc.enabled === true;

      if (wantsEnabled) {
        if (existing) {
          // Already exists — activate if inactive
          if (!existing.active) {
            await supabase
              .from("client_services")
              .update({
                active: true,
                frequency: svc.frequency || existing.frequency || "Monthly",
                assigned_to: svc.assignedTo || existing.assigned_to || null,
                processor: svc.processor || existing.processor || null,
              })
              .eq("id", existing.id);
            results.push({ key: svc.key, action: "activated" });
          } else {
            results.push({ key: svc.key, action: "already_active" });
          }
        } else {
          // No row — create one
          const { error: insErr } = await supabase
            .from("client_services")
            .insert({
              client_id: clientId,
              service_id: serviceId,
              active: true,
              frequency: svc.frequency || "Monthly",
              assigned_to: svc.assignedTo || null,
              processor: svc.processor || null,
            });
          if (insErr) {
            results.push({ key: svc.key, action: `create_failed: ${insErr.message}` });
          } else {
            results.push({ key: svc.key, action: "created" });
          }
        }
      } else {
        // Want disabled
        if (existing && existing.active) {
          await supabase
            .from("client_services")
            .update({ active: false })
            .eq("id", existing.id);
          results.push({ key: svc.key, action: "deactivated" });
        } else {
          results.push({ key: svc.key, action: "already_inactive" });
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}

// ── PATCH /api/clients — update a client service field (e.g. assigned_to) ──
export async function PATCH(request: Request) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { csId, assignedTo } = body;

    if (!csId) {
      return NextResponse.json({ error: "csId is required" }, { status: 400 });
    }

    // If assignedTo is a display name, resolve it to profile UUID
    let assignedToId: string | null = null;
    if (assignedTo && assignedTo !== "Unassigned" && assignedTo !== "") {
      // Check if it's already a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(assignedTo)) {
        assignedToId = assignedTo;
      } else {
        // Look up UUID from display name
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", assignedTo)
          .maybeSingle();
        assignedToId = profile?.id || null;
      }
    }

    const { error } = await supabase
      .from("client_services")
      .update({ assigned_to: assignedToId })
      .eq("id", csId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignedTo });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}
