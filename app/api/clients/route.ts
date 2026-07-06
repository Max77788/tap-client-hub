import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";
import { randomUUID } from "crypto";

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

export const revalidate = 30; // Revalidate every 30 seconds — faster than re-fetching on every navigation

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

    // ── Single count query instead of 3 separate ones ──
    let countQuery = supabase.from("clients").select("type", { count: "exact", head: true }).eq("status", "active");
    const { data: typeCounts, count: totalCount } = await countQuery;
    // Get counts from a lightweight query
    const { data: typeData } = await supabase.from("clients").select("type").eq("status", "active");
    let bizCount = 0, persCount = 0;
    for (const r of typeData || []) {
      if (r.type?.toLowerCase() === "business") bizCount++;
      else if (r.type?.toLowerCase() === "personal") persCount++;
    }

    let query = supabase.from("clients").select("*, contacts(*)").eq("status", "active");

    if (typeFilter === "business" || typeFilter === "personal") {
      query = query.filter("type", "ilike", typeFilter);
    }
    const { data: dbClients } = await query.order("name").range(offset, offset + limit - 1);
    if (!dbClients || dbClients.length === 0) return NextResponse.json({ clients: [], stats: { total: totalCount || 0, business: bizCount, personal: persCount } });

    const ids = dbClients.map((c: any) => c.id);
    // Batch IN queries — PostgREST chokes on too many values (Bad Request)
    const BATCH_SIZE = 500;
    let dbServices: any[] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      let svcQuery = supabase
        .from("client_services")
        .select("*, service:services(*)")
        .eq("active", true)
        .in("client_id", batch);
      const { data: batchData } = await svcQuery;
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
      const BATCH_SIZE_WP = 500;
      let allPeriods: any[] = [];
      for (let i = 0; i < allCsIds.length; i += BATCH_SIZE_WP) {
        const batch = allCsIds.slice(i, i + BATCH_SIZE_WP);
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

    // Fetch period_counts (processed counts for payroll, 1099s, etc.)
    const countByCsId: Record<string, number[]> = {};
    if (allCsIds.length > 0) {
      const BATCH_SIZE_PC = 500;
      let allCounts: any[] = [];
      for (let i = 0; i < allCsIds.length; i += BATCH_SIZE_PC) {
        const batch = allCsIds.slice(i, i + BATCH_SIZE_PC);
        const { data: batchCounts } = await supabase
          .from("period_counts")
          .select("client_service_id, period, processed")
          .in("client_service_id", batch);
        if (batchCounts) allCounts = allCounts.concat(batchCounts);
      }
      for (const pc of allCounts) {
        const m = pc.period?.match(/^\d{4}-(\d{2})$/);
        if (!m) continue;
        const mi = parseInt(m[1]) - 1;
        if (mi >= 0 && mi < 12) {
          if (!countByCsId[pc.client_service_id]) countByCsId[pc.client_service_id] = Array(12).fill(0);
          countByCsId[pc.client_service_id][mi] = Math.max(0, pc.processed || 0);
        }
      }
    }

    const { data: staffRows } = await supabase.from("profiles").select("id, full_name");
    const staffNames: Record<string, string> = {};
    for (const s of staffRows || []) staffNames[s.id] = s.full_name;

    // Fetch EINs from client_tax_ids
    const { data: taxRows } = await supabase.from("client_tax_ids").select("client_id, ein");
    const einMap: Record<string, string> = {};
    for (const t of taxRows || []) {
      if (t.ein) einMap[t.client_id] = String(t.ein).replace(/\.0$/, "");
    }

    const clients = dbClients.map((db: any) => {
      const svcs = svcByClient[db.id] || [];
      const services = svcs.map((cs: any) => {
        const key = CODE_TO_KEY[cs.service?.code || ""] || "financials";
        return {
          csId: cs.id, key, label: SERVICE_META[key]?.label,
          enabled: true, frequency: cs.frequency || "Monthly",
          processor: cs.processor || "", assignedTo: staffNames[cs.assigned_to || ""] || cs.assigned_to || "",
          expectedAnnual: cs.expected_annual ? Number(cs.expected_annual) || 0 : 0,
          financialsMonth: cs.financials_month ?? 0,
          paydate: cs.paydate || "",
          payrollPassword: cs.payroll_password || "",
          eftps: cs.eftps || "",
          biweeklyCode: cs.biweekly_code || "",
          payStartDate: cs.pay_start_date || "",
          payPeriodFrequency: cs.pay_period_frequency || "",
          reportingMethod: cs.reporting_method || "",
          payrollCategory: cs.payroll_category || "",
          qbLicense: cs.qb_license || "",
          reportingNotes: cs.reporting_notes || "",
          filingState: cs.filing_state || "",
          filingMonth: cs.filing_month || "",
          filingType: cs.filing_type || "",
          payEmails: Array.isArray(cs.pay_emails) ? cs.pay_emails : [],
          comments: Array.isArray(cs.comments) ? cs.comments : [],
          salesTaxLineItems: Array.isArray(cs.sales_tax_line_items) ? cs.sales_tax_line_items : [],
          currentStage: (periodByCsId[cs.id]?.[new Date().getMonth()] || "not_started"),
          months: Array.from({ length: 12 }, (_, i) => {
            const s = periodByCsId[cs.id]?.[i];
            return !s ? "lock" : s === "done" ? "done" : s === "na" ? "na" : s === "in_progress" ? "in_progress" : s === "waiting_client" ? "waiting" : s === "prepared" ? "billed" : s === "delayed" ? "delayed" : "lock";
          }),
          periodCounts: countByCsId[cs.id] || Array(12).fill(0),
          svcNotes: cs.notes || "",
        };
      });
      const seen = new Set(services.map((s: any) => s.key));
      for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
        if (!seen.has(key)) services.push({ csId: "", key, label: SERVICE_META[key].label, enabled: false, frequency: "Monthly", processor: "", assignedTo: "", expectedAnnual: 0, financialsMonth: 0, paydate: "", payrollPassword: "", eftps: "", biweeklyCode: "", payStartDate: "", payPeriodFrequency: "", reportingMethod: "", payrollCategory: "", qbLicense: "", reportingNotes: "", svcNotes: "", filingState: "", filingMonth: "", filingType: "", payEmails: [], comments: [], salesTaxLineItems: [], currentStage: "not_started", months: Array(12).fill("lock"), periodCounts: Array(12).fill(0) });
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
        notes: db.notes || "",
        ein: einMap[db.id] || "",
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
    const { id: clientId, services, name, type, group, emails, phones, address, city, state, zip, assignedStaff, ein, notes } = body;

    if (!clientId) {
      return NextResponse.json({ error: "client id is required" }, { status: 400 });
    }

    // Update client-level fields if provided
    const clientUpdates: Record<string, any> = {};
    if (name !== undefined) clientUpdates.name = name;
    if (type !== undefined) clientUpdates.type = type;
    if (group !== undefined) clientUpdates.group_owner = group;
    if (address !== undefined) clientUpdates.address = address;
    if (city !== undefined) clientUpdates.city = city;
    if (state !== undefined) clientUpdates.state = state;
    if (zip !== undefined) clientUpdates.zip = zip;
    if (notes !== undefined) clientUpdates.notes = notes;

    if (Object.keys(clientUpdates).length > 0) {
      await supabase.from("clients").update(clientUpdates).eq("id", clientId);
    }

    // Update contact info if provided
    if (emails || phones) {
      const { data: existingContact } = await supabase
        .from("contacts").select("id").eq("client_id", clientId).maybeSingle();
      if (existingContact) {
        const contactUpdates: Record<string, any> = {};
        if (emails && emails.length > 0) contactUpdates.email = emails[0];
        if (phones && phones.length > 0) contactUpdates.phone = phones[0];
        if (Object.keys(contactUpdates).length > 0) {
          await supabase.from("contacts").update(contactUpdates).eq("id", existingContact.id);
        }
      }
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
                financials_month: svc.financialsMonth ?? existing.financials_month ?? null,
                expected_annual: svc.expectedAnnual ?? existing.expected_annual ?? null,
                paydate: svc.paydate ?? existing.paydate ?? null,
                payroll_password: svc.payrollPassword ?? existing.payroll_password ?? null,
                eftps: svc.eftps ?? existing.eftps ?? null,
                biweekly_code: svc.biweeklyCode ?? existing.biweekly_code ?? null,
                pay_start_date: svc.payStartDate ?? existing.pay_start_date ?? null,
                pay_period_frequency: svc.payPeriodFrequency ?? existing.pay_period_frequency ?? null,
                reporting_method: svc.reportingMethod ?? existing.reporting_method ?? null,
                payroll_category: svc.payrollCategory ?? existing.payroll_category ?? null,
                qb_license: svc.qbLicense ?? existing.qb_license ?? null,
                reporting_notes: svc.reportingNotes ?? existing.reporting_notes ?? null,
                filing_state: svc.filingState ?? existing.filing_state ?? null,
                filing_month: svc.filingMonth ?? existing.filing_month ?? null,
                filing_type: svc.filingType ?? existing.filing_type ?? null,
                pay_emails: svc.payEmails ?? existing.pay_emails ?? null,
                comments: svc.comments ?? existing.comments ?? null,
                sales_tax_line_items: svc.salesTaxLineItems || null,
              })
              .eq("id", existing.id);
            results.push({ key: svc.key, action: "activated" });
          } else {
            // Always update fields even if already active
            await supabase
              .from("client_services")
              .update({
                frequency: svc.frequency ?? existing.frequency ?? null,
                assigned_to: svc.assignedTo ?? existing.assigned_to ?? null,
                processor: svc.processor ?? existing.processor ?? null,
                financials_month: svc.financialsMonth ?? existing.financials_month ?? null,
                expected_annual: svc.expectedAnnual ?? existing.expected_annual ?? null,
                paydate: svc.paydate ?? existing.paydate ?? null,
                payroll_password: svc.payrollPassword ?? existing.payroll_password ?? null,
                eftps: svc.eftps ?? existing.eftps ?? null,
                biweekly_code: svc.biweeklyCode ?? existing.biweekly_code ?? null,
                pay_start_date: svc.payStartDate ?? existing.pay_start_date ?? null,
                pay_period_frequency: svc.payPeriodFrequency ?? existing.pay_period_frequency ?? null,
                reporting_method: svc.reportingMethod ?? existing.reporting_method ?? null,
                payroll_category: svc.payrollCategory ?? existing.payroll_category ?? null,
                qb_license: svc.qbLicense ?? existing.qb_license ?? null,
                reporting_notes: svc.reportingNotes ?? existing.reporting_notes ?? null,
                filing_state: svc.filingState ?? existing.filing_state ?? null,
                filing_month: svc.filingMonth ?? existing.filing_month ?? null,
                filing_type: svc.filingType ?? existing.filing_type ?? null,
                pay_emails: svc.payEmails ?? existing.pay_emails ?? null,
                comments: svc.comments ?? existing.comments ?? null,
                sales_tax_line_items: svc.salesTaxLineItems || null,
              })
              .eq("id", existing.id);
            results.push({ key: svc.key, action: "already_active" });
          }
        } else {
          // No row — create one
          const { error: insErr } = await supabase
            .from("client_services")
            .insert({
              id: randomUUID(),
              client_id: clientId,
              service_id: serviceId,
              active: true,
              frequency: svc.frequency || "Monthly",
              assigned_to: svc.assignedTo || null,
              processor: svc.processor || null,
              financials_month: svc.financialsMonth ?? null,
              expected_annual: svc.expectedAnnual ?? null,
              paydate: svc.paydate || null,
              payroll_password: svc.payrollPassword || null,
              eftps: svc.eftps || null,
              biweekly_code: svc.biweeklyCode || null,
              pay_start_date: svc.payStartDate || null,
              pay_period_frequency: svc.payPeriodFrequency || null,
              reporting_method: svc.reportingMethod || null,
              payroll_category: svc.payrollCategory || null,
              qb_license: svc.qbLicense || null,
              reporting_notes: svc.reportingNotes || null,
              filing_state: svc.filingState || null,
              filing_month: svc.filingMonth || null,
              filing_type: svc.filingType || null,
              pay_emails: svc.payEmails || null,
              comments: svc.comments || null,
              sales_tax_line_items: svc.salesTaxLineItems || null,
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

// ── PATCH /api/clients — update a client service field (assigned_to, processor, frequency) ──
export async function PATCH(request: Request) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { csId, assignedTo, processor, frequency, paydate, payrollPassword, eftps, salesTaxLineItems, biweeklyCode, payStartDate, payPeriodFrequency, reportingMethod, payrollCategory, qbLicense, reportingNotes, filingState, filingMonth, filingType, payEmails, comments } = body;

    if (!csId) {
      return NextResponse.json({ error: "csId is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    // If assignedTo is provided, resolve display name to profile UUID
    if (assignedTo !== undefined) {
      let assignedToId: string | null = null;
      if (assignedTo && assignedTo !== "Unassigned" && assignedTo !== "") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(assignedTo)) {
          assignedToId = assignedTo;
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("full_name", assignedTo)
            .maybeSingle();
          assignedToId = profile?.id || null;
        }
      }
      updates.assigned_to = assignedToId;
    }

    if (processor !== undefined) {
      updates.processor = processor || null;
    }

    if (frequency !== undefined) {
      updates.frequency = frequency || null;
    }

    if (paydate !== undefined) {
      updates.paydate = paydate || null;
    }

    if (payrollPassword !== undefined) {
      updates.payroll_password = payrollPassword || null;
    }

    if (eftps !== undefined) {
      updates.eftps = eftps || null;
    }

    if (biweeklyCode !== undefined) {
      updates.biweekly_code = biweeklyCode || null;
    }

    if (payStartDate !== undefined) {
      updates.pay_start_date = payStartDate || null;
    }

    if (payPeriodFrequency !== undefined) {
      updates.pay_period_frequency = payPeriodFrequency || null;
    }

    if (reportingMethod !== undefined) {
      updates.reporting_method = reportingMethod || null;
    }

    if (payrollCategory !== undefined) {
      updates.payroll_category = payrollCategory || null;
    }

    if (qbLicense !== undefined) {
      updates.qb_license = qbLicense || null;
    }

    if (reportingNotes !== undefined) {
      updates.reporting_notes = reportingNotes || null;
    }

    if (filingState !== undefined) {
      updates.filing_state = filingState || null;
    }

    if (filingMonth !== undefined) {
      updates.filing_month = filingMonth || null;
    }

    if (filingType !== undefined) {
      updates.filing_type = filingType || null;
    }

    if (payEmails !== undefined) {
      updates.pay_emails = payEmails;
    }

    if (comments !== undefined) {
      updates.comments = comments;
    }

    if (salesTaxLineItems !== undefined) {
      updates.sales_tax_line_items = salesTaxLineItems;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("client_services")
      .update(updates)
      .eq("id", csId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}
