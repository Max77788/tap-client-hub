import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

const CODE_TO_KEY: Record<string, ServiceKey> = {
  FIN: "financials",
  PR: "payroll",
  STX: "sales_tax",
  T9: "1099s",
  REND: "renditions",
  TAX: "tax_returns",
};

export async function GET() {
  const supabase = await createClient();

  const { data: dbClients, error: clientsError } = await supabase
    .from("clients").select("*").eq("status", "active").order("name");

  if (clientsError || !dbClients) {
    return NextResponse.json({ error: clientsError?.message }, { status: 500 });
  }

  const { data: dbServices, error: svcError } = await supabase
    .from("client_services").select("*, service:services(*)").eq("active", true);

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

  // Load work_periods for current year (use high limit to avoid 1000-row cap)
  const periodByCsId: Record<string, Record<number, string>> = {};
  try {
    const { data: dbPeriods, error: periodErr } = await supabase
      .from("work_periods").select("client_service_id, period, stage")
      .like("period", `${currentYear}-%`)
      .limit(100000);
    if (periodErr) console.error("period query error:", periodErr);
    if (dbPeriods) {
      console.log("periods loaded:", dbPeriods.length);
      // Check if our saved 1099s data is in there
      const hasTarget = dbPeriods.some((p: any) => p.client_service_id === "d574fd8f-4603-4788-9154-be35f040bab2");
      console.log("has target 1099s period:", hasTarget);
      for (const wp of dbPeriods) {
        if (!periodByCsId[wp.client_service_id]) periodByCsId[wp.client_service_id] = {};
        const monthNum = parseInt(wp.period.split("-")[1], 10) - 1;
        periodByCsId[wp.client_service_id][monthNum] = wp.stage;
      }
    }
  } catch (e) { console.error("period query exception:", e); }

  const clients = dbClients.map((db: any) => {
    const clientServices = servicesByClient[db.id] || [];
    const services = clientServices.map((cs: any) => {
      const svcCode = cs.service?.code || "";
      const key = CODE_TO_KEY[svcCode] || "financials";
      return {
        csId: cs.id,
        key,
        label: SERVICE_META[key]?.label || svcCode,
        enabled: true,
        frequency: cs.frequency || "Monthly",
        processor: cs.processor || "",
        assignedTo: cs.assigned_to || "",
        expectedAnnual: cs.expected_annual || undefined,
        // Sales Tax fields
        ...(key === "sales_tax" ? {
          salesTaxNotes: cs.sales_tax_notes || "", taxId: cs.tax_id || "",
          bankName: cs.bank_name || "", bankRouting: cs.bank_routing || "",
          bankAccount: cs.bank_account || "", groupAssignedTo: cs.group_assigned_to || "",
          salesTaxRT: cs.sales_tax_rt || "",
        } : {}),
        // Payroll fields
        ...(key === "payroll" ? {
          cdg: cs.cdg || "", eftps: cs.eftps || "",
          payrollPassword: cs.payroll_password || "", paydate: cs.paydate || "",
        } : {}),
        currentStage: (periodByCsId[cs.id]?.[currentMonth] || "not_started"),
        months: Array.from({ length: 12 }, (_, i) => {
          const wpStage = periodByCsId[cs.id]?.[i];
          if (!wpStage) return "lock";
          return wpStage === "done" ? "done" : wpStage === "na" ? "na" : "billed";
        }),
      };
    });

    const existingKeys = new Set(services.map((s) => s.key));
    for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
      if (!existingKeys.has(key)) {
        services.push({
          csId: "", key, label: SERVICE_META[key].label, enabled: false,
          frequency: "Monthly", processor: "", assignedTo: "",
          expectedAnnual: undefined, currentStage: "not_started",
          months: Array(12).fill("lock"),
        });
      }
    }

    return {
      id: db.id, cid: db.cid || `CID-${db.id.substring(0, 4)}`,
      name: db.name, type: db.type === "business" ? "Business" : "Personal",
      group: db.group_owner || "Unassigned", status: db.status || "active",
      city: db.city || "", state: db.state || "TX", email: "", phone: "",
      address: db.address || "",
      assignedStaff: clientServices[0]?.assigned_to || "Unassigned",
      services,
    };
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Create client
  const { data: client, error } = await supabase
    .from("clients").insert({
      name: body.name, type: body.type?.toLowerCase() || "business",
      group_owner: body.group || null, status: body.status || "active",
      city: body.city || "", state: body.state || "TX",
      address: body.address || "", cid: body.cid || null,
    }).select().single();

  if (error || !client) {
    return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
  }

  // Create client_services for enabled services
  const services = Array.isArray(body.services) ? body.services : [];
  const svcInserts: any[] = [];

  for (const svc of services) {
    if (!svc.enabled) continue;
    const entry: any = {
      client_id: client.id,
      service_id: null,
      frequency: svc.frequency || "Monthly",
      processor: svc.processor || "",
      assigned_to: svc.assignedTo || "",
      active: true,
    };

    // Sales Tax fields
    if (svc.key === "sales_tax") {
      entry.sales_tax_notes = svc.salesTaxNotes || "";
      entry.tax_id = svc.taxId || "";
      entry.bank_name = svc.bankName || "";
      entry.bank_routing = svc.bankRouting || "";
      entry.bank_account = svc.bankAccount || "";
      entry.group_assigned_to = svc.groupAssignedTo || "";
      entry.sales_tax_rt = svc.salesTaxRT || "";
    }

    // Payroll fields
    if (svc.key === "payroll") {
      entry.cdg = svc.cdg || "";
      entry.eftps = svc.eftps || "";
      entry.payroll_password = svc.payrollPassword || "";
      entry.paydate = svc.paydate || "";
    }

    if (svc.key === "1099s") {
      entry.expected_annual = svc.expectedAnnual || 0;
    }

    svcInserts.push(entry);
  }

  if (svcInserts.length > 0) {
    await supabase.from("client_services").insert(svcInserts);
  }

  return NextResponse.json({ client }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
