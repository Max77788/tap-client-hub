import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

const CODE_TO_KEY: Record<string, ServiceKey> = {
  FN: "financials",
  PR: "payroll",
  ST: "sales_tax",
  T9: "1099s",
  RD: "renditions",
  TR: "tax_returns",
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

    const [{ count: totalCount }, { count: bizCount }, { count: persCount }] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active").ilike("type", "business"),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active").ilike("type", "personal"),
    ]);

    let clientsQuery = supabase
      .from("clients")
      .select("*, contacts(*)")
      .eq("status", "active");

    if (typeFilter === "business" || typeFilter === "personal") {
      clientsQuery = clientsQuery.filter('"type"', "ilike", typeFilter);
    }

    clientsQuery = clientsQuery.order("name").range(offset, offset + limit - 1);

    const { data: dbClients, error: clientsError } = await clientsQuery;

    if (clientsError || !dbClients) {
      return NextResponse.json({ error: clientsError?.message }, { status: 500 });
    }

    if (dbClients.length === 0) {
      return NextResponse.json({ clients: [], stats: { total: totalCount ?? 0, business: bizCount ?? 0, personal: persCount ?? 0 }, hasMore: false });
    }

    const clientIds = dbClients.map((c: any) => c.id);
    const { data: dbServices, error: svcError } = await supabase
      .from("client_services")
      .select("*, service:services(*)")
      .eq("active", true)
      .in("client_id", clientIds);

    if (svcError) {
      return NextResponse.json({ error: svcError.message }, { status: 500 });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const servicesByClient: Record<string, any[]> = {};
    for (const cs of dbServices || []) {
      if (!servicesByClient[cs.client_id]) servicesByClient[cs.client_id] = [];
      servicesByClient[cs.client_id].push(cs);
    }

    const periodByCsId: Record<string, Record<number, string>> = {};
    try {
      const allCsIds = (dbServices || []).map((cs: any) => cs.id);
      if (allCsIds.length > 0) {
        const { data: allPeriods } = await supabase
          .from("work_periods")
          .select("client_service_id, stage, period")
          .gte("period", `${currentYear}-01`)
          .lte("period", `${currentYear}-12`)
          .in("client_service_id", allCsIds);
        if (allPeriods) {
          for (const wp of allPeriods) {
            const match = wp.period?.match(/^\d{4}-(\d{2})$/);
            if (!match) continue;
            const monthIdx = parseInt(match[1], 10) - 1;
            if (monthIdx < 0 || monthIdx > 11) continue;
            if (!periodByCsId[wp.client_service_id]) periodByCsId[wp.client_service_id] = {};
            periodByCsId[wp.client_service_id][monthIdx] = wp.stage;
          }
        }
      }
    } catch {}

    // Resolve staff UUIDs to names
    const { data: allStaff } = await supabase.from("profiles").select("id, name");
    const staffMap: Record<string, string> = {};
    for (const s of allStaff || []) staffMap[s.id] = s.name;

    const clients = dbClients.map((db: any) => {
      const clientServices = servicesByClient[db.id] || [];
      const services = clientServices.map((cs: any) => {
        const svcCode = cs.service?.code || "";
        const key = CODE_TO_KEY[svcCode] || "financials";
        return {
          csId: cs.id, key,
          label: SERVICE_META[key]?.label || svcCode,
          enabled: true,
          frequency: cs.frequency || "Monthly",
          processor: cs.processor || "",
          assignedTo: cs.assigned_to || "",
          expectedAnnual: cs.expected_annual || undefined,
          financialsMonth: cs.financials_month ?? undefined,
          ...(key === "sales_tax" ? { salesTaxNotes: cs.sales_tax_notes || "", taxId: cs.tax_id || "", bankName: cs.bank_name || "", bankRouting: cs.bank_routing || "", bankAccount: cs.bank_account || "", groupAssignedTo: cs.group_assigned_to || "", salesTaxRT: cs.sales_tax_rt || "" } : {}),
          ...(key === "payroll" ? { cdg: cs.cdg || "", eftps: cs.eftps || "", payrollPassword: cs.payroll_password || "", paydate: cs.paydate || "" } : {}),
          currentStage: (periodByCsId[cs.id]?.[currentMonth] || "not_started"),
          months: Array.from({ length: 12 }, (_, i) => {
            const wpStage = periodByCsId[cs.id]?.[i];
            if (!wpStage) return "lock";
            return wpStage === "done" ? "done" : wpStage === "na" ? "na" : wpStage === "in_progress" ? "in_progress" : wpStage === "waiting_client" ? "waiting" : wpStage === "prepared" ? "billed" : "lock";
          }),
        };
      });

      const existingKeys = new Set(services.map((s) => s.key));
      for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
        if (!existingKeys.has(key)) {
          services.push({ csId: "", key, label: SERVICE_META[key].label, enabled: false, frequency: "Monthly", processor: "", assignedTo: "", expectedAnnual: undefined, financialsMonth: undefined, currentStage: "not_started", months: Array(12).fill("lock") });
        }
      }

      return {
        id: db.id, cid: db.cid || "CID-" + db.id.substring(0, 4),
        name: db.name, type: db.type === "business" ? "Business" : "Personal",
        group: db.group_owner || "Unassigned", status: db.status || "active",
        city: db.city || "", state: db.state || "TX",
        emails: (db.contacts || []).map((c: any) => c.email).filter(Boolean),
        phones: (db.contacts || []).map((c: any) => c.phone).filter(Boolean),
        address: db.address || "",
        assignedStaff: staffMap[clientServices[0]?.assigned_to || ""] || clientServices[0]?.assigned_to || "Unassigned",
        services,
      };
    });

    return NextResponse.json({
      clients,
      stats: { total: totalCount ?? 0, business: bizCount ?? 0, personal: persCount ?? 0 },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)), stack: (e?.stack || "").split("\\n").slice(0,3).join(" | ") }, { status: 500 });
  }
}
