// Source-contract regression tests for the shared support system.
// Run with: node tests/support-shared-system.test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const migration = read("migrations/20260831_shared_support_system.sql");
const legacyRoute = read("app/api/send-email/route.ts");
const postTickets = read("app/api/support/v1/tickets/route.ts");
const getTicket = read("app/api/support/v1/tickets/[id]/route.ts");
const postMessage = read("app/api/support/v1/tickets/[id]/messages/route.ts");

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed += 1;
}
function rejects(pattern, text, label) {
  assert.ok(!pattern.test(text), label);
  passed += 1;
}

// ---------------------------------------------------------------------------
// 1. Migration contract
// ---------------------------------------------------------------------------
{
  const m = migration;

  // support_apps registry + seed
  ok(/create table if not exists tap_hub_project\.support_apps/.test(m), "migration creates support_apps registry");
  ok(m.includes("'tap-hub'"), "migration seeds tap-hub app");
  ok(m.includes("'carry-ops'"), "migration seeds carry-ops app");
  ok(m.includes("'transact-ops'"), "migration seeds transact-ops app");
  ok(/on conflict \(key\) do update/.test(m), "migration seeds via idempotent upsert");

  // support_tickets expansion
  ok(/add column if not exists source_app_key/.test(m), "migration adds source_app_key");
  ok(/source_app_key text not null default 'tap-hub'/.test(m), "source_app_key defaults to tap-hub");
  ok(/add column if not exists external_reference/.test(m), "migration adds external_reference");
  ok(/add column if not exists reporter_user_id/.test(m), "migration adds reporter_user_id");
  ok(/add column if not exists category/.test(m), "migration adds category");
  ok(/add column if not exists client_context/.test(m), "migration adds client_context");
  ok(/add column if not exists metadata/.test(m), "migration adds metadata");
  ok(/add column if not exists last_activity_at/.test(m), "migration adds last_activity_at");
  ok(/add column if not exists first_response_at/.test(m), "migration adds first_response_at");
  ok(/add column if not exists closed_at/.test(m), "migration adds closed_at");

  // external id
  ok(/create sequence if not exists tap_hub_project\.support_tickets_external_id_seq/.test(m), "migration creates external id sequence");
  ok(m.includes("'AIF-'"), "external id uses AIF- prefix");
  ok(/create unique index if not exists support_tickets_external_id_key/.test(m), "migration adds unique external id index");
  ok(/where external_id is null/.test(m), "external id backfill is one-time (only null rows)");
  ok(/alter column external_id set not null/.test(m), "external id becomes not null");

  // messages
  ok(/create table if not exists tap_hub_project\.support_ticket_messages/.test(m), "migration creates support_ticket_messages");
  ok(/author_type in \('reporter', 'agent', 'system'\)/.test(m), "messages author_type constrained to reporter/agent/system");
  ok(/visibility in \('public', 'internal'\)/.test(m), "messages visibility constrained to public/internal");
  ok(/length\(trim\(body\)\) > 0/.test(m), "messages reject blank bodies");

  // events
  ok(/create table if not exists tap_hub_project\.support_ticket_events/.test(m), "migration creates support_ticket_events");
  ok(/from_status text/.test(m) && /to_status text/.test(m), "events track from/to status");

  // attachments (metadata only)
  ok(/create table if not exists tap_hub_project\.support_ticket_attachments/.test(m), "migration creates support_ticket_attachments");
  ok(/metadata jsonb not null default '\{\}'::jsonb/.test(m), "attachment table is metadata-only (no storage)");

  // indexes
  ok(/support_tickets_app_status_activity_idx/.test(m) && /source_app_key, status, last_activity_at/.test(m), "migration adds app+status+activity index");
  ok(/support_ticket_messages_ticket_time_idx/.test(m) && /ticket_id, created_at/.test(m), "migration adds message time index");
  ok(/support_ticket_events_ticket_time_idx/.test(m) && /ticket_id, created_at/.test(m), "migration adds event time index");

  // triggers (idempotent + schema-qualified)
  ok(/create or replace function tap_hub_project\.support_tickets_maintain\(\)/.test(m), "ticket maintenance trigger function is schema-qualified");
  ok(/before insert or update on tap_hub_project\.support_tickets/.test(m), "ticket maintenance trigger fires on insert/update");
  ok(/drop trigger if exists support_tickets_maintain_trigger/.test(m), "ticket trigger creation is idempotent");
  ok(/create or replace function tap_hub_project\.support_ticket_messages_notify\(\)/.test(m), "message trigger function is schema-qualified");
  ok(/after insert on tap_hub_project\.support_ticket_messages/.test(m), "message trigger fires after insert");
  ok(/drop trigger if exists support_ticket_messages_notify_trigger/.test(m), "message trigger creation is idempotent");

  // RLS + grants
  ok(/enable row level security/.test(m), "RLS enabled");
  ok(/grant usage on schema tap_hub_project to anon, authenticated, service_role/.test(m), "schema usage granted to anon/authenticated/service_role");
  ok(/grant select on tap_hub_project\.support_apps to anon, authenticated, service_role/.test(m), "support_apps readable by anon/authenticated/service_role");
  ok(/grant select, insert, update, delete on tap_hub_project\.support_tickets to service_role/.test(m), "service_role has full support_tickets access");
  ok(/grant select, insert, update, delete on tap_hub_project\.support_ticket_messages to service_role/.test(m), "service_role has full messages access");
  ok(/grant select, insert, update, delete on tap_hub_project\.support_ticket_events to service_role/.test(m), "service_role has full events access");
  ok(/grant select, insert, update, delete on tap_hub_project\.support_ticket_attachments to service_role/.test(m), "service_role has full attachments access");
  ok(/grant usage, select on sequence tap_hub_project\.support_tickets_external_id_seq to service_role/.test(m), "service_role can use external id sequence");

  // schema reload
  ok(/notify pgrst, 'reload schema'/.test(m), "migration reloads PostgREST schema");
}

// ---------------------------------------------------------------------------
// 2. Legacy TAP route integration
// ---------------------------------------------------------------------------
{
  const r = legacyRoute;

  ok(/import \{ createTicket \} from "@\/lib\/support\/create-ticket"/.test(r), "legacy route imports the shared createTicket");
  ok(/sourceAppKey: "tap-hub"/.test(r), "legacy route sets sourceAppKey=tap-hub");
  ok(/title: payload\.summary/.test(r), "legacy route maps summary -> title");
  ok(/description: payload\.whatHappened/.test(r), "legacy route maps whatHappened -> description");
  ok(/name: payload\.reporterName/.test(r), "legacy route maps reporterName -> reporter.name");
  ok(/resolveAccessIdentity\(\)/.test(r), "legacy route still requires a signed-in identity");
  ok(/status: 401/.test(r), "legacy route still returns 401 when unauthenticated");
  ok(/status: 400/.test(r), "legacy route still returns 400 on missing fields");
  ok(/status: 201/.test(r), "legacy route still returns 201 on success");
  ok(/ticket: \{ id: ticket\.id, number: ticketNumber, status: ticket\.status, createdAt: ticket\.createdAt \}, emailSent/.test(r), "legacy route preserves response contract (id/number/status/createdAt/emailSent)");
  ok(/emailSent/.test(r) && /RESEND_FROM/.test(r) && /SUPPORT_RECIPIENTS/.test(r), "legacy route retains email notification behavior");
  rejects(/\.from\("support_tickets"\)/.test(r) ? /\.from\("support_tickets"\)/ : /noop/, r, "legacy route no longer inserts into support_tickets directly");
}

// ---------------------------------------------------------------------------
// 3. Integration endpoints: presence + safe query constraints
// ---------------------------------------------------------------------------
{
  // POST /tickets
  ok(/import \{ authenticateApp \} from "@\/lib\/support\/api-keys"/.test(postTickets), "POST tickets authenticates via API key");
  ok(/import \{ createTicket \} from "@\/lib\/support\/create-ticket"/.test(postTickets), "POST tickets uses shared createTicket");
  ok(/sourceAppKey: auth\.appKey/.test(postTickets), "POST tickets derives source app from the API key");
  rejects(/body\.sourceAppKey/.test(postTickets) ? /body\.sourceAppKey/ : /noop/, postTickets, "POST tickets does not trust sourceAppKey from the body");
  ok(/status: 201/.test(postTickets), "POST tickets returns 201");
  ok(/number: result\.ticket\.externalId/.test(postTickets), "POST tickets returns the firm-wide external id as number");

  // GET /tickets/[id]
  ok(/import \{ authenticateApp \} from "@\/lib\/support\/api-keys"/.test(getTicket), "GET ticket authenticates via API key");
  ok(/\.eq\("source_app_key", auth\.appKey\)/.test(getTicket), "GET ticket scopes lookup to the authenticated app");
  ok(/\.eq\("visibility", "public"\)/.test(getTicket), "GET ticket returns only public messages");
  ok(/const \{ id \} = await params/.test(getTicket), "GET ticket awaits Next.js 16 async params");
  ok(/maybeSingle\(\)/.test(getTicket), "GET ticket uses maybeSingle");
  rejects(/reporter_profile_id/.test(getTicket) ? /reporter_profile_id/ : /noop/, getTicket, "GET ticket never exposes reporter_profile_id");
  rejects(/assigned_to/.test(getTicket) ? /assigned_to/ : /noop/, getTicket, "GET ticket never exposes assigned_to");
  ok(/UUID_RE\.test\(id\)/.test(getTicket), "GET ticket branches id lookup safely (uuid vs external_id)");

  // POST /tickets/[id]/messages
  ok(/author_type: "reporter"/.test(postMessage), "POST message always author_type=reporter");
  ok(/visibility: "public"/.test(postMessage), "POST message always public visibility");
  ok(/\.eq\("source_app_key", auth\.appKey\)/.test(postMessage), "POST message scopes to the authenticated app");
  ok(/from\("support_ticket_events"\)/.test(postMessage), "POST message writes an audit event");
  ok(/const \{ id \} = await params/.test(postMessage), "POST message awaits Next.js 16 async params");

  // Safe query constraints: no dynamic OR building / string interpolation into filters.
  for (const [name, src] of Object.entries({ postTickets, getTicket, postMessage })) {
    rejects(/\.or\(/, src, `${name} avoids dynamic .or() query building`);
    rejects(/\.eq\(`/, src, `${name} avoids template-string interpolation into .eq()`);
    rejects(/\.ilike\(/, src, `${name} avoids wildcard/ilike filters`);
  }
}

console.log(`support-shared-system.test.mjs: ${passed} assertions passed`);
