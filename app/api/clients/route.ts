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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("type")?.toLowerCase(); // "business" | "personal" | undefined

  const supabase = await createClient();

  // Always fetch stats (lightweight, no joins) — so counts stay accurate even when filtered
  const [{ count: totalCount }, { count: bizCount }, { count: persCount }] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active").ilike("type", "business"),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active").ilike("type", "personal"),
  ]);

  // Build clients query
  let clientsQuery = supabase
    .from("clients")
    .select("*, contacts(*)")
    .eq("status", "active");

  if (typeFilter === "business" || typeFilter === "personal") {
    clientsQuery = clientsQuery.ilike("type", typeFilter);
  }

  clientsQuery = clientsQuery.order("name");

  const { data: dbClients, error: clientsError } = await clientsQuery;

  if (clientsError || !dbClients) {
    return NextResponse.json({ error: clientsError?.message }, { status: 500 });
  }

  // ── Build client_services query ──
  let svcQuery = supabase
    .from("client_services")
    .select("*, service:services(*)")
    .eq("active", true);

  if (typeFilter === "business" || typeFilter === "personal") {
    // Only fetch services for clients of the requested type
    const clientIds = dbClients.map((c: any) => c.id);
    if (clientIds.length === 0) {
      return NextResponse.json({ clients: [], stats: { business: 0, personal: 0 } });
    }
    svcQuery = svcQuery.in("client_id", clientIds);
  }

  const { data: dbServices, error: svcError } = await svcQuery;

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

  // Load work_periods for current year — single query
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
        financialsMonth: cs.financials_month ?? undefined,
        ...(key === "sales_tax" ? {
          salesTaxNotes: cs.sales_tax_notes || "", taxId: cs.tax_id || "",
          bankName: cs.bank_name || "", bankRouting: cs.bank_routing || "",
          bankAccount: cs.bank_account || "", groupAssignedTo: cs.group_assigned_to || "",
          salesTaxRT: cs.sales_tax_rt || "",
        } : {}),
        ...(key === "payroll" ? {
          cdg: cs.cdg || "", eftps: cs.eftps || "",
          payrollPassword: cs.payroll_password || "", paydate: cs.paydate || "",
        } : {}),
        currentStage: (periodByCsId[cs.id]?.[currentMonth] || "not_started"),
        months: Array.from({ length: 12 }, (_, i) => {
          const wpStage = periodByCsId[cs.id]?.[i];
          if (!wpStage) return "lock";
          return wpStage === "done" ? "done"
            : wpStage === "na" ? "na"
            : wpStage === "in_progress" ? "in_progress"
            : wpStage === "waiting_client" ? "waiting"
            : wpStage === "prepared" ? "billed"
            : "lock";
        }),
      };
    });

    const existingKeys = new Set(services.map((s) => s.key));
    for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
      if (!existingKeys.has(key)) {
        services.push({
          csId: "", key, label: SERVICE_META[key].label, enabled: false,
          frequency: "Monthly", processor: "", assignedTo: "",
          expectedAnnual: undefined, financialsMonth: undefined, currentStage: "not_started",
          months: Array(12).fill("lock"),
        });
      }
    }

    return {
      id: db.id, cid: db.cid || `CID-${db.id.substring(0, 4)}`,
      name: db.name, type: db.type === "business" ? "Business" : "Personal",
      group: db.group_owner || "Unassigned", status: db.status || "active",
      city: db.city || "", state: db.state || "TX",
      emails: (db.contacts || []).map((c: any) => c.email).filter(Boolean),
      phones: (db.contacts || []).map((c: any) => c.phone).filter(Boolean),
      address: db.address || "",
      assignedStaff: clientServices[0]?.assigned_to || "Unassigned",
      services,
    };
  });

  return NextResponse.json({
    clients,
    stats: { total: totalCount ?? 0, business: bizCount ?? 0, personal: persCount ?? 0 },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

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

  const contacts: { client_id: string; email: string; phone: string; is_primary: boolean }[] = [];
  const emails = Array.isArray(body.emails) ? body.emails.filter((e: string) => e.trim()) : [];
  const phones = Array.isArray(body.phones) ? body.phones.filter((p: string) => p.trim()) : [];

  const maxLen = Math.max(emails.length, phones.length, 1);
  for (let i = 0; i < maxLen; i++) {
    contacts.push({
      client_id: client.id,
      email: emails[i] || "",
      phone: phones[i] || "",
      is_primary: i === 0,
    });
  }

  if (contacts.length > 0) {
    await supabase.from("contacts").insert(contacts);
  }

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

    if (svc.key === "sales_tax") {
      entry.sales_tax_notes = svc.salesTaxNotes || "";
      entry.tax_id = svc.taxId || "";
      entry.bank_name = svc.bankName || "";
      entry.bank_routing = svc.bankRouting || "";
      entry.bank_account = svc.bankAccount || "";
      entry.group_assigned_to = svc.groupAssignedTo || "";
      entry.sales_tax_rt = svc.salesTaxRT || "";
    }

    if (svc.key === "payroll") {
      entry.cdg = svc.cdg || "";
      entry.eftps = svc.eftps || "";
      entry.payroll_password = svc.payrollPassword || "";
      entry.paydate = svc.paydate || "";
    }

    if (svc.key === "1099s") {
      entry.expected_annual = svc.expectedAnnual || 0;
    }

    if (svc.key === "financials" && svc.financialsMonth !== undefined) {
      entry.financials_month = svc.financialsMonth;
    }

    svcInserts.push(entry);
  }

  if (svcInserts.length > 0) {
    await supabase.from("client_services").insert(svcInserts);
  }

  return NextResponse.json({ client }, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: "Missing client id" }, { status: 400 });

  const { error: clientError } = await supabase
    .from("clients").update({
      name: body.name,
      type: body.type?.toLowerCase() || "business",
      group_owner: body.group || null,
      status: body.status || "active",
      city: body.city || "",
      state: body.state || "TX",
      address: body.address || "",
    }).eq("id", id);

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  await supabase.from("contacts").delete().eq("client_id", id);

  const emails = Array.isArray(body.emails) ? body.emails.filter((e: string) => e.trim()) : [];
  const phones = Array.isArray(body.phones) ? body.phones.filter((p: string) => p.trim()) : [];
  const contacts: any[] = [];
  const maxLen = Math.max(emails.length, phones.length, 1);
  for (let i = 0; i < maxLen; i++) {
    contacts.push({
      client_id: id,
      email: emails[i] || "",
      phone: phones[i] || "",
      is_primary: i === 0,
    });
  }
  if (contacts.length > 0) {
    await supabase.from("contacts").insert(contacts);
  }

  const finSvc = Array.isArray(body.services) ? body.services.find((s: any) => s.key === "financials") : null;
  if (finSvc?.csId && finSvc.financialsMonth !== undefined) {
    await supabase.from("client_services").update({ financials_month: finSvc.financialsMonth }).eq("id", finSvc.csId);
  }

  return NextResponse.json({ success: true });
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
