import { NextResponse } from "next/server";
import type { ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";
import { randomUUID } from "crypto";

// ── Helper: create a Supabase client ──
async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "tap_hub_project" } }
  );
}

// Separate reader client for unauthenticated GETs
async function getSupabaseAnon() {
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

export const dynamic = "force-dynamic"; // Never cache — data changes frequently

export async function GET(request: Request) {
  try {
    const supabase = await getSupabase();

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type")?.toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "1000");
    const lite = searchParams.get("fields") === "lite";
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

    let query = supabase.from("clients").select("*").eq("status", "active");

    if (typeFilter === "business" || typeFilter === "personal") {
      query = query.filter("type", "ilike", typeFilter);
    }
    const { data: dbClients } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (!dbClients || dbClients.length === 0) return NextResponse.json({ clients: [], stats: { total: totalCount || 0, business: bizCount, personal: persCount } });

    const ids = dbClients.map((c: any) => c.id);

    // Batch IN queries — keep under ~200 UUIDs to stay below Supabase's ~16KB URL header limit
    const BATCH_SIZE = 200;
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
      const BATCH_SIZE_WP = 200;
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
      const BATCH_SIZE_PC = 200;
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

    // EIN is now stored directly on clients table — no need for client_tax_ids lookup

    // ── v7 normalized tables: sales_tax_registration + service_comments ──
    const normStxByCsId: Record<string, any[]> = {};
    const normCommentsByCsId: Record<string, any[]> = {};
    if (allCsIds.length > 0) {
      for (let i = 0; i < allCsIds.length; i += BATCH_SIZE) {
        const batch = allCsIds.slice(i, i + BATCH_SIZE);
        // sales_tax_registration
        const { data: stxBatch } = await supabase.from("sales_tax_registration")
          .select("*").in("client_service_id", batch);
        if (stxBatch) {
          for (const stx of stxBatch) {
            if (!normStxByCsId[stx.client_service_id]) normStxByCsId[stx.client_service_id] = [];
            normStxByCsId[stx.client_service_id].push({
              id: stx.id, serviceName: stx.rt_number, taxId: stx.tax_reg_id,
              rt: stx.rt_number, frequency: stx.frequency,
              bankName: stx.bank_name, bankAccount: stx.bank_account_ref,
              bankRouting: stx.bank_routing_ref, notes: stx.notes,
              assignedTo: staffNames[stx.assigned_to || ""] || stx.assigned_to || "",
            });
          }
        }
        // service_comments
        const { data: cmtBatch } = await supabase.from("service_comments")
          .select("*").in("client_service_id", batch);
        if (cmtBatch) {
          for (const cmt of cmtBatch) {
            if (!normCommentsByCsId[cmt.client_service_id]) normCommentsByCsId[cmt.client_service_id] = [];
            normCommentsByCsId[cmt.client_service_id].push({
              id: cmt.id, month: cmt.month, body: cmt.body || cmt.body,
              text: cmt.body, author: cmt.author_label || "",
              createdAt: cmt.created_at,
            });
          }
        }
      }
    }

    const clients = dbClients.map((db: any) => {
      const svcs = svcByClient[db.id] || [];
      const services = svcs.map((cs: any) => {
        const key = CODE_TO_KEY[cs.service?.code || ""] || "financials";
        return {
          csId: cs.id, key, label: SERVICE_META[key]?.label,
          enabled: true, frequency: (() => {
            const f = cs.frequency || "Monthly";
            if (f === "weekly" || f === "Weekly") return "Weekly";
            if (f === "Bi-Weekly" || f === "bi_weekly-A" || f === "bi-weekly-a") return "Bi-Weekly A";
            if (f === "Bi-Weekly B" || f === "bi_weekly-B" || f === "bi-weekly-b") return "Bi-Weekly B";
            if (f === "Bi-weekly" || f === "bi-weekly" || f === "Biweekly" || f === "biweekly") return "Bi-Weekly A";
            if (f === "monthly" || f === "Monthly") return "Monthly";
            if (f === "semi-monthly" || f === "Semi-Monthly") return "Semi-Monthly";
            if (f === "quarterly" || f === "Quarterly") return "Quarterly";
            if (f === "yearly" || f === "Yearly" || f === "annual" || f === "Annual") return "Yearly";
            return f;
          })(),
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
          filingMonth: cs.due_month ? String(cs.due_month) : "",
          filingType: cs.return_type || "",
          payEmails: Array.isArray(cs.pay_emails) ? cs.pay_emails : [],
          comments: lite ? [] : (() => {
            const oldCmts = Array.isArray(cs.comments) ? cs.comments : [];
            const newCmts = normCommentsByCsId[cs.id] || [];
            return [...oldCmts, ...newCmts];
          })(),
          salesTaxLineItems: lite ? [] : (() => {
            const oldStx = Array.isArray(cs.sales_tax_line_items)
              ? cs.sales_tax_line_items.map((item: any) => ({
                  ...item,
                  assignedTo: staffNames[item.assignedTo || ""] || item.assignedTo || "",
                }))
              : [];
            const newStx = (normStxByCsId[cs.id] || []);
            return [...oldStx, ...newStx];
          })(),
          currentStage: (periodByCsId[cs.id]?.[new Date().getMonth()] || "not_started"),
          months: lite ? Array(12).fill("lock") : Array.from({ length: 12 }, (_, i) => {
            const s = periodByCsId[cs.id]?.[i];
            return !s ? "lock" : s === "done" ? "done" : s === "na" ? "na" : s === "in_progress" ? "in_progress" : s === "waiting_client" ? "waiting" : s === "prepared" ? "billed" : s === "delayed" ? "delayed" : "lock";
          }),
          periodCounts: countByCsId[cs.id] || Array(12).fill(0),
          svcNotes: cs.notes || "",
          stateRenewal: cs.state_renewal ?? null,
          renewalState: cs.renewal_state || null,
          renewalDueMonth: cs.renewal_due_month || null,
          renewalDueDay: cs.renewal_due_day || null,
          renewalIdentifiers: cs.renewal_identifiers || null,
          serviceName: cs.service_name || "",
        };
      });
      const seen = new Set(services.map((s: any) => s.key));
      // Merge duplicate services: keep the first occurrence but prefer non-empty values from later ones
      const mergedSvcs: any[] = [];
      const mergedKeys = new Set<string>();
      for (const svc of services) {
        if (mergedKeys.has(svc.key)) {
          // Merge fields from duplicate into the first occurrence
          const existing = mergedSvcs.find((s: any) => s.key === svc.key);
          if (!existing) continue;
          // Merge salesTaxLineItems
          if (svc.salesTaxLineItems?.length) {
            existing.salesTaxLineItems = [...(existing.salesTaxLineItems || []), ...svc.salesTaxLineItems];
          }
          // Prefer non-empty values from the duplicate for other fields
          const copyFields = ["filingState","filingMonth","filingType","frequency","processor",
            "assignedTo","expectedAnnual","financialsMonth","paydate","payrollPassword",
            "eftps","biweeklyCode","payStartDate","payPeriodFrequency","reportingMethod",
            "payrollCategory","qbLicense","reportingNotes","filingState","filingMonth",
            "filingType","currentStage","stateRenewal","renewalState","renewalDueMonth",
            "renewalDueDay","renewalIdentifiers","serviceName"];
          for (const f of copyFields) {
            if (svc[f] && !existing[f]) existing[f] = svc[f];
          }
          if (svc.svcNotes && !existing.svcNotes) existing.svcNotes = svc.svcNotes;
          if (svc.payEmails?.length && !existing.payEmails?.length) existing.payEmails = svc.payEmails;
          if (svc.comments?.length) existing.comments = [...(existing.comments || []), ...svc.comments];
        } else {
          mergedKeys.add(svc.key);
          mergedSvcs.push(svc);
        }
      }
      for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
        if (!mergedKeys.has(key)) mergedSvcs.push({ csId: "", key, label: SERVICE_META[key].label, enabled: false, frequency: "Monthly", processor: "", assignedTo: "", expectedAnnual: 0, financialsMonth: 0, paydate: "", payrollPassword: "", eftps: "", biweeklyCode: "", payStartDate: "", payPeriodFrequency: "", reportingMethod: "", payrollCategory: "", qbLicense: "", reportingNotes: "", svcNotes: "", filingState: "", filingMonth: "", filingType: "", payEmails: [], comments: [], salesTaxLineItems: [], stateRenewal: null, renewalState: null, renewalDueMonth: null, renewalDueDay: null, renewalIdentifiers: null, serviceName: "", currentStage: "not_started", months: Array(12).fill("lock"), periodCounts: Array(12).fill(0) });
      }
      return {
        id: db.id, cid: db.cid || "CID-" + db.id.substring(0, 4),
        clientCode: db.client_code || db.cid || "",
        name: db.name, type: (db.type || "").toLowerCase() === "business" ? "Business" : "Personal",
        group: db.group_owner || "Unassigned",
        groupName: db.group_name || db.group_owner || "", status: db.status || "active",
        city: db.city || "", state: db.state || "TX",
        emails: db.emails ? db.emails.replace(/[{}"]/g,'').split(',').filter(Boolean) : [],
        phones: db.phones ? db.phones.replace(/[{}"]/g,'').split(',').filter(Boolean) : [],
        address: db.address || "",
        assignedStaff: staffNames[svcs[0]?.assigned_to || ""] || svcs[0]?.assigned_to || "Unassigned",
        notes: db.notes || "",
        ein: db.ein || "",
        services: mergedSvcs,
      };
    });

    return NextResponse.json({ clients, stats: { total: totalCount, business: bizCount, personal: persCount } }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
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
    if (group !== undefined) clientUpdates.group_name = group;
    if (address !== undefined) clientUpdates.address = address;
    if (city !== undefined) clientUpdates.city = city;
    if (state !== undefined) clientUpdates.state = state;
    if (zip !== undefined) clientUpdates.zip = zip;
    if (notes !== undefined) clientUpdates.notes = notes;
    if (emails !== undefined) {
      // Store as comma-separated string (GET handler splits by comma)
      const arr = Array.isArray(emails) ? emails : [emails];
      clientUpdates.emails = arr.filter(Boolean).join(", ");
    }
    if (phones !== undefined) {
      const arr = Array.isArray(phones) ? phones : [phones];
      clientUpdates.phones = arr.filter(Boolean).join(", ");
    }
    if (assignedStaff !== undefined) {
      // assigned_staff is derived from first service's assigned_to in GET handler.
      // Update the first service's assigned_to in client_services.
      // We'll set a flag to handle this in the service processing loop.
      clientUpdates._assignedStaff = assignedStaff;
    }
    if (ein !== undefined) clientUpdates.ein = ein;

    if (Object.keys(clientUpdates).length > 0) {
      // Strip _assignedStaff before DB write — handled separately
      const assignedStaffVal = clientUpdates._assignedStaff;
      delete clientUpdates._assignedStaff;
      
      if (Object.keys(clientUpdates).length > 0) {
        const { error: updateErr } = await supabase.from("clients").update(clientUpdates).eq("id", clientId);
        if (updateErr) {
          return NextResponse.json({ error: "DB update failed: " + updateErr.message }, { status: 500 });
        }
      }

      // Handle assignedStaff: update first active service's assigned_to
      if (assignedStaffVal !== undefined) {
        // Find staff ID from name
        let staffId = assignedStaffVal; // Could be a name or ID
        // Update first service for this client
        const { data: firstSvc } = await supabase.from("client_services")
          .select("id").eq("client_id", clientId).limit(1).single();
        if (firstSvc) {
          const { error: svcErr } = await supabase.from("client_services")
            .update({ assigned_to: assignedStaffVal }).eq("id", firstSvc.id);
          if (svcErr) console.error("Failed to update assigned_to:", svcErr.message);
        }
      }
    }

    // Reverse map: frontend key -> service code
    const KEY_TO_CODE: Record<string, string> = {
      financials: "FIN", payroll: "PR", sales_tax: "STX",
      "1099s": "T9", renditions: "REND", tax_returns: "TAX",
    };

    // Build unique codes we need
    const safeServices = Array.isArray(services) ? services : [];
    const codes = [...new Set(safeServices
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

    for (const svc of safeServices) {
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
                expected_annual: svc.expectedAnnual ?? existing.expected_annual ?? null,
                notes: svc.svcNotes ?? existing.notes ?? null,
                filing_state: svc.filingState ?? existing.filing_state ?? null,
                due_month: svc.filingMonth ?? existing.due_month ?? null,
                return_type: svc.filingType ?? existing.return_type ?? null,
                service_name: svc.serviceName ?? existing.service_name ?? null,
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
                expected_annual: svc.expectedAnnual ?? existing.expected_annual ?? null,
                notes: svc.svcNotes ?? existing.notes ?? null,
                filing_state: svc.filingState ?? existing.filing_state ?? null,
                due_month: svc.filingMonth ?? existing.due_month ?? null,
                return_type: svc.filingType ?? existing.return_type ?? null,
                service_name: svc.serviceName ?? existing.service_name ?? null,
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
              expected_annual: svc.expectedAnnual || null,
              notes: svc.svcNotes || null,
              filing_state: svc.filingState || null,
              due_month: svc.filingMonth || null,
              return_type: svc.filingType || null,
              service_name: svc.serviceName || null,
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

    return NextResponse.json({ success: true, results, clientUpdates: { ...clientUpdates, _assignedStaff: undefined }, srKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}


// ── POST /api/clients — create a new client ──
export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { name, type, group, emails, phones, address, city, state, zip, ein, assignedStaff } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const clientId = crypto.randomUUID();
    const clientCode = String(Math.floor(1000 + Math.random() * 90000));

    const clientRecord: Record<string, any> = {
      id: clientId, name, type: type || "Business",
      group_name: group || "", status: "active",
      city: city || "", state: state || "", zip: zip || "",
      address: address || "", ein: ein || "", notes: "",
      client_code: clientCode,
    };

    if (emails !== undefined) {
      const arr = Array.isArray(emails) ? emails : [emails];
      clientRecord.emails = arr.filter(Boolean).join(", ");
    }
    if (phones !== undefined) {
      const arr = Array.isArray(phones) ? phones : [phones];
      clientRecord.phones = arr.filter(Boolean).join(", ");
    }

    const { error: insErr } = await supabase.from("clients").insert(clientRecord);
    if (insErr) return NextResponse.json({ error: "INSERT failed: " + insErr.message }, { status: 500 });

    return NextResponse.json({ success: true, client: { id: clientId, cid: "CID-" + clientCode, clientCode } });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}


// ── PATCH /api/clients — update a client service field (assigned_to, processor, frequency) ──
export async function PATCH(request: Request) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { csId, assignedTo, processor, frequency, salesTaxLineItems, comments, filingState, filingMonth, filingType, serviceName } = body;

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

    if (filingState !== undefined) {
      updates.filing_state = filingState || null;
    }

    if (filingMonth !== undefined) {
      updates.due_month = filingMonth || null;
    }

    if (filingType !== undefined) {
      updates.return_type = filingType || null;

    if (serviceName !== undefined) {
      updates.service_name = serviceName || null;
    }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("client_services")
      .update(updates)
      .eq("id", csId);

    // ── Dual-write to normalized v7 tables ──
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sync comments → service_comments
    if (comments !== undefined) {
      // Delete existing comments for this CS
      await supabase.from("service_comments").delete().eq("client_service_id", csId);
      // Re-insert all comments
      const cmts = Array.isArray(comments) ? comments : [];
      for (const c of cmts) {
        if (c.text || c.body) {
          await supabase.from("service_comments").insert({
            client_service_id: csId,
            month: c.month ?? null,
            body: c.text || c.body || "",
            author_label: c.author || "",
            created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          });
        }
      }
    }

    // Sync salesTaxLineItems → sales_tax_registration
    if (salesTaxLineItems !== undefined) {
      await supabase.from("sales_tax_registration").delete().eq("client_service_id", csId);
      const stxItems = Array.isArray(salesTaxLineItems) ? salesTaxLineItems : [];
      for (const item of stxItems) {
        await supabase.from("sales_tax_registration").insert({
          client_service_id: csId,
          rt_number: item.serviceName || item.rt_number || item.rt || "",
          tax_reg_id: item.taxId || item.tax_reg_id || "",
          frequency: item.frequency || null,
          assigned_to: item.assignedTo || null,
          bank_name: item.bankName || "",
          bank_account_ref: item.bankAccount || "",
          bank_routing_ref: item.bankRouting || "",
          notes: item.notes || "",
        });
      }
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}

// ── DELETE /api/clients?id=... — cascade-delete client + all associated records ──
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("id");
    if (!clientId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Use service_role for cascade deletes (RLS may block anon key)
    const srKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      srKey || anonKey || "",
      { db: { schema: "tap_hub_project" } }
    );

    const results: string[] = [];

    // 1. Delete client_services
    let { error: e1 } = await supabase.from("client_services").delete().eq("client_id", clientId);
    if (e1) return NextResponse.json({ error: "client_services: " + e1.message }, { status: 500 });
    results.push("client_services");

    // 2. Delete credentials
    let { error: e3 } = await supabase.from("credentials").delete().eq("client_id", clientId);
    if (e3) results.push("credentials skipped: " + e3.message);
    else results.push("credentials");

    // 4. Delete work_periods
    let { error: e4 } = await supabase.from("work_periods").delete().eq("client_id", clientId);
    if (e4) results.push("work_periods skipped: " + e4.message);
    else results.push("work_periods");

    // 5. Delete period_counts
    let { error: e5 } = await supabase.from("period_counts").delete().eq("client_id", clientId);
    if (e5) results.push("period_counts skipped: " + e5.message);
    else results.push("period_counts");

    // 6. Delete the client itself
    let { error: e7 } = await supabase.from("clients").delete().eq("id", clientId);
    if (e7) return NextResponse.json({ error: "clients: " + e7.message, cascaded: results }, { status: 500 });
    results.push("clients");

    return NextResponse.json({ success: true, cascaded: results });
  } catch (e: any) {
    return NextResponse.json({ error: "ERR: " + (e?.message || String(e)) }, { status: 500 });
  }
}
