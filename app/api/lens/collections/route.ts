/* Supabase's untyped custom-schema result is narrowed at each response boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAccessIdentity } from "@/lib/access-server";

export const dynamic = "force-dynamic";

type InvoiceInput = {
  client_id?: string | null;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  amount?: number;
};

function canUseCollections(role?: string) {
  return role === "owner" || role === "admin" || role === "manager";
}

async function requireCollectionsAccess() {
  const identity = await resolveAccessIdentity();
  if (!identity) return { identity: null, response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (!canUseCollections(identity.role)) return { identity, response: NextResponse.json({ error: "Collections is limited to Owner, Admin, and Manager roles." }, { status: 403 }) };
  return { identity, response: null };
}

const demoInvoices = [
  { id: "demo-1", client_name: "LDH 2020 LLC (dba Diamond Food Mart)", invoice_number: "10482", due_date: "2026-07-05", amount: 1224, amount_paid: 0, balance: 1224, status: "open", days_past_due: 30, current_rung: 3, latest_action: "sent", latest_rung: 3 },
  { id: "demo-2", client_name: "Valvitalia USA Inc", invoice_number: "10504", due_date: "2026-07-23", amount: 857, amount_paid: 0, balance: 857, status: "open", days_past_due: 12, current_rung: 1, latest_action: "sent", latest_rung: 1 },
  { id: "demo-3", client_name: "Sarriya LLC", invoice_number: "10319", due_date: "2026-06-18", amount: 1836, amount_paid: 0, balance: 1836, status: "open", days_past_due: 47, current_rung: 5, latest_action: "escalated", latest_rung: 4 },
];

export async function GET() {
  const access = await requireCollectionsAccess();
  if (access.response) return access.response;
  const supabase = createAdminClient();
  const [invoicesResult, ladderResult, settingsResult, clientsResult] = await Promise.all([
    supabase.from("lens_invoices").select("id, client_id, invoice_number, invoice_date, due_date, amount, amount_paid, balance, status, source, clients(name)").in("status", ["open", "partial", "hold"]).order("due_date", { ascending: true }),
    supabase.from("lens_collection_ladder").select("*").order("rung"),
    supabase.from("lens_collection_settings").select("key,value"),
    supabase.from("clients").select("id,name").eq("status", "active").order("name").limit(1000),
  ]);

  if (invoicesResult.error?.code === "42P01" || ladderResult.error?.code === "42P01") {
    return NextResponse.json({
      mode: "setup_required",
      invoices: demoInvoices,
      ladder: [],
      settings: {},
      clients: clientsResult.data || [],
      migration: "migrations/20260804_tap_lens_collections.sql",
    });
  }
  if (invoicesResult.error) return NextResponse.json({ error: invoicesResult.error.message }, { status: 500 });

  const invoiceIds = (invoicesResult.data || []).map((invoice: any) => invoice.id);
  const { data: activities, error: activitiesError } = invoiceIds.length
    ? await supabase.from("lens_collection_activity").select("invoice_id,action,rung,created_at").in("invoice_id", invoiceIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (activitiesError) return NextResponse.json({ error: activitiesError.message }, { status: 500 });

  const latestActivity = new Map<string, any>();
  for (const activity of activities || []) if (!latestActivity.has(activity.invoice_id)) latestActivity.set(activity.invoice_id, activity);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const invoices = (invoicesResult.data || []).map((invoice: any) => {
    const due = new Date(`${invoice.due_date}T00:00:00`);
    const days = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
    const currentRung = [...(ladderResult.data || [])].filter((r: any) => r.active && r.trigger_days <= days).at(-1)?.rung || 0;
    const activity = latestActivity.get(invoice.id);
    return { ...invoice, client_name: invoice.clients?.name || "Unassigned client", days_past_due: days, current_rung: currentRung, latest_action: activity?.action || null, latest_rung: activity?.rung || null };
  });
  const settings = Object.fromEntries((settingsResult.data || []).map((row: any) => [row.key, row.value]));
  return NextResponse.json({ mode: "live", invoices, ladder: ladderResult.data || [], settings, clients: clientsResult.data || [] });
}

export async function POST(request: Request) {
  const access = await requireCollectionsAccess();
  if (access.response) return access.response;
  const payload = await request.json() as { action?: string; invoice?: InvoiceInput; invoiceId?: string; rung?: number; settings?: Record<string, unknown>; ladder?: Array<Record<string, unknown>> };
  const supabase = createAdminClient();
  if (payload.action === "create_invoice") {
    const input = payload.invoice || {};
    if (!input.client_id || !input.invoice_number?.trim() || !input.due_date || !Number.isFinite(Number(input.amount)) || Number(input.amount) < 0) return NextResponse.json({ error: "Client, invoice number, due date, and a valid amount are required." }, { status: 400 });
    const { error } = await supabase.from("lens_invoices").insert({ client_id: input.client_id, invoice_number: input.invoice_number.trim(), invoice_date: input.invoice_date || null, due_date: input.due_date, amount: Number(input.amount) });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (payload.action === "log_action") {
    if (!payload.invoiceId || !payload.rung || ![1,2,3,4,5].includes(payload.rung)) return NextResponse.json({ error: "Invoice and valid ladder rung are required." }, { status: 400 });
    const action = payload.rung >= 4 ? "approved" : "sent";
    const { error } = await supabase.from("lens_collection_activity").insert({ invoice_id: payload.invoiceId, rung: payload.rung, action, channel: "email", actor: access.identity?.id || null, detail: { source: "tap_lens_v1" } });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (payload.action === "save_ladder") {
    if (!Array.isArray(payload.ladder)) return NextResponse.json({ error: "A ladder is required." }, { status: 400 });
    const { error } = await supabase.from("lens_collection_ladder").upsert(payload.ladder.map((r: any) => ({ rung: r.rung, label: r.label, trigger_days: Number(r.trigger_days), auto_send: Boolean(r.auto_send), channel: r.channel || "email", subject: r.subject || null, body: r.body || null, active: r.active !== false, updated_at: new Date().toISOString() })), { onConflict: "rung" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
