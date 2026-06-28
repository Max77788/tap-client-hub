import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

async function await getDb() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "tap_hub_project" } }
  );
}

const CODE_TO_KEY: Record<string, ServiceKey> = {
  FN: "financials",
  PR: "payroll",
  ST: "sales_tax",
  T9: "1099s",
  RD: "renditions",
  TR: "tax_returns",
};

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("type")?.toLowerCase();
  const limit = parseInt(searchParams.get("limit") || "1000");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Always fetch stats (lightweight, no joins)
  const [{ count: totalCount }, { count: bizCount }, { count: persCount }] = await Promise.all([
    await getDb().from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    await getDb().from("clients").select("*", { count: "exact", head: true }).eq("status", "active").ilike("type", "business"),
    await getDb().from("clients").select("*", { count: "exact", head: true }).eq("status", "active").ilike("type", "personal"),
  ]);

  // Build clients query with pagination
  let clientsQuery = await getDb()
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

  // Only fetch services for the returned page of clients
  const clientIds = dbClients.map((c: any) => c.id);
  const { data: dbServices, error: svcError } = await getDb()
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

  // Load work_periods for current year — single query
  const periodByCsId: Record<string, Record<number, string>> = {};
  try {
    const allCsIds = (dbServices || []).map((cs: any) => cs.id);
    if (allCsIds.length > 0) {
      const { data: allPeriods } = await getDb()
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

  // Build staff name lookup map (resolve UUIDs to names)
  const { data: allStaff } = await getDb().from("profiles").select("id, name");
  const staffMap: Record<string, string> = {};
  for (const s of allStaff || []) staffMap[s.id] = s.name;

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
      assignedStaff: staffMap[clientServices[0]?.assigned_to || ""] || clientServices[0]?.assigned_to || "Unassigned",
      services,
    };
  });

  return NextResponse.json({
    clients,
    stats: { total: totalCount ?? 0, business: bizCount ?? 0, personal: persCount ?? 0 },
  });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e), stack: e?.stack?.split("\n")?.slice(0,3)?.join(" | ") || "" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data: client, error } = await getDb()
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
    await getDb().from("contacts").insert(contacts);
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
    await getDb().from("client_services").insert(svcInserts);
  }

  return NextResponse.json({ client }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: "Missing client id" }, { status: 400 });

  const KEY_TO_SERVICE_CODE: Record<string, string> = {
    financials: "FN", payroll: "PR", sales_tax: "ST",
    "1099s": "T9", renditions: "RD", tax_returns: "TR",
  };

  // 1. Fetch service template IDs
  const { data: serviceTemplates } = await getDb()
    .from("services").select("id, code");
  const codeToSvcId: Record<string, string> = {};
  for (const s of serviceTemplates || []) {
    codeToSvcId[s.code] = s.id;
  }

  // 2. Fetch existing client_services for this client (including inactive)
  const { data: existingSvc } = await getDb()
    .from("client_services").select("id, service_id").eq("client_id", id);
  const existingBySvcId = new Map<string, string>();
  for (const cs of existingSvc || []) {
    existingBySvcId.set(cs.service_id, cs.id);
  }

  // 3. Update client row
  const { error: clientError } = await getDb()
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

  // 4. Sync contacts
  await getDb().from("contacts").delete().eq("client_id", id);
  const emails = Array.isArray(body.emails) ? body.emails.filter((e: string) => e.trim()) : [];
  const phones = Array.isArray(body.phones) ? body.phones.filter((p: string) => p.trim()) : [];
  const contacts: any[] = [];
  const maxLen = Math.max(emails.length, phones.length, 1);
  for (let i = 0; i < maxLen; i++) {
    contacts.push({ client_id: id, email: emails[i] || "", phone: phones[i] || "", is_primary: i === 0 });
  }
  if (contacts.length > 0) {
    await getDb().from("contacts").insert(contacts);
  }

  // 5. Sync client_services
  const services = Array.isArray(body.services) ? body.services : [];

  if (body.assignedStaff) {
    const firstEnabled = services.find((s: any) => s.enabled);
    if (firstEnabled && !firstEnabled.assignedTo) {
      firstEnabled.assignedTo = body.assignedStaff;
    }
  }

  for (const svc of services) {
    const code = KEY_TO_SERVICE_CODE[svc.key];
    if (!code) continue;
    const svcId = codeToSvcId[code];
    if (!svcId) continue;

    const existingCsId = existingBySvcId.get(svcId);

    if (svc.enabled) {
      const payload: any = { active: true, frequency: svc.frequency || "Monthly" };
      if (svc.assignedTo !== undefined) payload.assigned_to = svc.assignedTo || null;
      if (svc.processor !== undefined) payload.processor = svc.processor || null;
      if (svc.expectedAnnual !== undefined) payload.expected_annual = svc.expectedAnnual || null;
      if (svc.financialsMonth !== undefined) payload.financials_month = svc.financialsMonth;

      if (existingCsId) {
        await getDb().from("client_services").update(payload).eq("id", existingCsId);
      } else {
        await getDb().from("client_services").insert({
          client_id: id, service_id: svcId, ...payload,
        });
      }
    } else {
      if (existingCsId) {
        await getDb().from("client_services").update({ active: false }).eq("id", existingCsId);
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  const { error } = await getDb().from("clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
