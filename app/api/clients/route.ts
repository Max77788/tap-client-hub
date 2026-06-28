import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

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
      const { data: periods } = await supabase.from("work_periods").select("client_service_id, stage, period").in("client_service_id", allCsIds);
      for (const wp of periods || []) {
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
          processor: cs.processor || "", assignedTo: cs.assigned_to || "",
          currentStage: (periodByCsId[cs.id]?.[new Date().getMonth()] || "not_started"),
          months: Array.from({ length: 12 }, (_, i) => {
            const s = periodByCsId[cs.id]?.[i];
            return !s ? "lock" : s === "done" ? "done" : s === "na" ? "na" : s === "in_progress" ? "in_progress" : s === "waiting_client" ? "waiting" : s === "prepared" ? "billed" : "lock";
          }),
        };
      });
      const seen = new Set(services.map((s: any) => s.key));
      for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
        if (!seen.has(key)) services.push({ csId: "", key, label: SERVICE_META[key].label, enabled: false, frequency: "Monthly", processor: "", assignedTo: "", currentStage: "not_started", months: Array(12).fill("lock") });
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
