// Server-only support domain module.
//
// IMPORTANT: this module runs only on the server (Supabase service role +
// server env vars). Never import it from a client component or route it
// through the browser.
import { createAdminClient } from "@/lib/supabase/admin";

export type TicketPriority = "normal" | "urgent";

export type CreateTicketInput = {
  /** Stable key of the source app (must exist and be active in support_apps). */
  sourceAppKey: string;
  /** Ticket subject line / brief summary (required). */
  title: string;
  /** Full description of the problem (required). */
  description: string;
  reporter: {
    name: string;
    email?: string | null;
    /** Opaque, app-specific user id for the reporting user (non-TAP). */
    userId?: string | null;
  };
  /** Opaque reference the calling app can use to correlate the ticket. */
  externalReference?: string | null;
  /** Free-text priority; normalized to the supported "normal"/"urgent" values. */
  priority?: string | null;
  category?: string | null;
  /** Arbitrary JSON object stored on the ticket (size-limited). */
  clientContext?: unknown;
  metadata?: unknown;
  /** TAP Hub profile id (TAP-originated tickets only). External apps must not set this. */
  tapProfileId?: string | null;
  /** Legacy TAP support-form columns, preserved for backward compatibility. */
  tapContext?: {
    accountFirm?: string | null;
    appArea?: string | null;
    expectedResult?: string | null;
    reproductionSteps?: string | null;
    screenshotConfirmed?: boolean | null;
  };
};

export type CreatedTicket = {
  id: string;
  /** Legacy TAP Hub number, e.g. "TAP-000042". */
  number: string;
  /** Firm-wide external id, e.g. "AIF-000042" (unique across all apps). */
  externalId: string;
  status: string;
  createdAt: string;
};

export type CreateTicketResult =
  | { ok: true; ticket: CreatedTicket }
  | { ok: false; status: 400 | 403 | 404 | 500; error: string };

// Untrusted input limits. Strings are clamped; required strings must remain
// non-empty after trimming. JSON objects are size-capped.
const LIMITS = {
  sourceAppKey: 64,
  title: 500,
  description: 20_000,
  reporterName: 200,
  reporterEmail: 320,
  reporterUserId: 200,
  externalReference: 500,
  category: 200,
  priority: 32,
  accountFirm: 200,
  appArea: 200,
  expectedResult: 10_000,
  reproductionSteps: 20_000,
} as const;

const MAX_JSON_BYTES = 20_000;

type NormalizedInput = {
  sourceAppKey: string;
  title: string;
  description: string;
  reporterName: string;
  reporterEmail: string | null;
  reporterUserId: string | null;
  externalReference: string | null;
  priority: TicketPriority;
  category: string | null;
  clientContext: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  tapProfileId: string | null;
  tapContext: {
    accountFirm: string | null;
    appArea: string | null;
    expectedResult: string | null;
    reproductionSteps: string | null;
    screenshotConfirmed: boolean;
  } | null;
};

function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function optionalText(
  value: unknown,
  max: number,
  field: string,
  errors: string[],
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors.push(`${field} exceeds ${max} characters`);
    return null;
  }
  return trimmed.length > 0 ? trimmed : null;
}

function optionalJsonObject(
  value: unknown,
  field: string,
  errors: string[],
): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${field} must be a JSON object`);
    return null;
  }
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_JSON_BYTES) {
    errors.push(`${field} is too large`);
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizePriority(value: string | null | undefined): TicketPriority {
  if (typeof value !== "string") return "normal";
  const v = value.trim().toLowerCase();
  return v === "urgent" || v === "high" || v === "critical" ? "urgent" : "normal";
}

export function formatTapNumber(ticketNumber: number | string | null | undefined): string {
  if (ticketNumber === null || ticketNumber === undefined) return "TAP-000000";
  return `TAP-${String(ticketNumber).padStart(6, "0")}`;
}

function parseInput(input: CreateTicketInput): { ok: true; value: NormalizedInput } | { ok: false; error: string } {
  const errors: string[] = [];

  const sourceAppKey = clampText(input?.sourceAppKey, LIMITS.sourceAppKey);
  const title = clampText(input?.title, LIMITS.title);
  const description = clampText(input?.description, LIMITS.description);
  const reporterName = clampText(input?.reporter?.name, LIMITS.reporterName);

  const missing: string[] = [];
  if (!sourceAppKey) missing.push("sourceAppKey");
  if (!title) missing.push("title");
  if (!description) missing.push("description");
  if (!reporterName) missing.push("reporter.name");
  if (missing.length > 0) {
    return { ok: false, error: `Missing or invalid required fields: ${missing.join(", ")}.` };
  }

  const reporterEmail = optionalText(input.reporter?.email, LIMITS.reporterEmail, "reporter.email", errors);
  const reporterUserId = optionalText(input.reporter?.userId, LIMITS.reporterUserId, "reporter.userId", errors);
  const externalReference = optionalText(input.externalReference, LIMITS.externalReference, "externalReference", errors);
  const category = optionalText(input.category, LIMITS.category, "category", errors);
  const tapProfileId = optionalText(input.tapProfileId, 200, "tapProfileId", errors);

  const clientContext = optionalJsonObject(input.clientContext, "clientContext", errors);
  const metadata = optionalJsonObject(input.metadata, "metadata", errors);

  let tapContext: NormalizedInput["tapContext"] = null;
  if (input.tapContext !== undefined && input.tapContext !== null) {
    const tc = input.tapContext as Record<string, unknown>;
    const accountFirm = optionalText(tc.accountFirm, LIMITS.accountFirm, "tapContext.accountFirm", errors);
    const appArea = optionalText(tc.appArea, LIMITS.appArea, "tapContext.appArea", errors);
    const expectedResult = optionalText(tc.expectedResult, LIMITS.expectedResult, "tapContext.expectedResult", errors);
    const reproductionSteps = optionalText(tc.reproductionSteps, LIMITS.reproductionSteps, "tapContext.reproductionSteps", errors);
    const screenshotConfirmed = tc.screenshotConfirmed === true;
    tapContext = { accountFirm, appArea, expectedResult, reproductionSteps, screenshotConfirmed };
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join(" ") };
  }

  return {
    ok: true,
    value: {
      sourceAppKey,
      title,
      description,
      reporterName,
      reporterEmail,
      reporterUserId,
      externalReference,
      priority: normalizePriority(input.priority),
      category,
      clientContext,
      metadata,
      tapProfileId,
      tapContext,
    },
  };
}

/**
 * Creates a support ticket plus its reporter-visible initial message and a
 * creation event. Validates the source app against support_apps (rejects
 * unknown/inactive apps) and enforces untrusted string/JSON limits.
 *
 * TRANSACTIONALITY LIMITATION: supabase-js has no multi-statement transaction
 * API. We therefore insert the ticket first (system of record) and then the
 * initial message and creation event; if either of the latter steps fails we
 * delete the ticket again and return an error, so a failed request never
 * reports success and never leaves a partially-created ticket behind. This is
 * a compensating cleanup, not a true rollback — a hard crash between the
 * ticket insert and the cleanup could leave an orphan ticket without a
 * message/event, which is benign and easy to reconcile.
 */
export async function createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
  const parsed = parseInput(input);
  if (parsed.ok === false) {
    return { ok: false, status: 400, error: parsed.error };
  }
  const v = parsed.value;

  const admin = createAdminClient();

  // Validate the source app is registered and active.
  const { data: app, error: appError } = await admin
    .from("support_apps")
    .select("key, active")
    .eq("key", v.sourceAppKey)
    .maybeSingle();

  if (appError) {
    console.error("[support] support_apps lookup failed:", appError.message);
    return { ok: false, status: 500, error: "Unable to verify the source application." };
  }
  if (!app) {
    return { ok: false, status: 404, error: `Unknown source application: ${v.sourceAppKey}.` };
  }
  if (app.active !== true) {
    return { ok: false, status: 403, error: `Source application is inactive: ${v.sourceAppKey}.` };
  }

  const ticketInsert = {
    source_app_key: v.sourceAppKey,
    external_reference: v.externalReference,
    reporter_user_id: v.reporterUserId,
    reporter_profile_id: v.tapProfileId,
    reporter_name: v.reporterName,
    reporter_email: v.reporterEmail,
    category: v.category,
    client_context: v.clientContext ?? {},
    metadata: v.metadata ?? {},
    summary: v.title,
    priority: v.priority,
    what_happened: v.description,
    ...(v.tapContext
      ? {
          account_firm: v.tapContext.accountFirm,
          app_area: v.tapContext.appArea,
          expected_result: v.tapContext.expectedResult,
          reproduction_steps: v.tapContext.reproductionSteps,
          screenshot_confirmed: v.tapContext.screenshotConfirmed,
        }
      : {}),
  };

  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .insert(ticketInsert)
    .select("id, ticket_number, external_id, status, created_at")
    .single();

  if (ticketError || !ticket) {
    console.error("[support] support_tickets insert failed:", ticketError?.message);
    return { ok: false, status: 500, error: "Unable to create the support ticket." };
  }

  try {
    const { error: messageError } = await admin.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_type: "reporter",
      author_name: v.reporterName,
      author_user_id: v.reporterUserId,
      body: v.description,
      visibility: "public",
    });
    if (messageError) throw messageError;

    const { error: eventError } = await admin.from("support_ticket_events").insert({
      ticket_id: ticket.id,
      event_type: "ticket.created",
      actor_type: "reporter",
      actor_name: v.reporterName,
      actor_user_id: v.reporterUserId,
      to_status: ticket.status,
      metadata: { source_app_key: v.sourceAppKey },
    });
    if (eventError) throw eventError;
  } catch (error) {
    console.error("[support] post-creation steps failed; removing ticket:", (error as Error).message);
    await admin.from("support_tickets").delete().eq("id", ticket.id);
    return { ok: false, status: 500, error: "Unable to finalize the support ticket." };
  }

  return {
    ok: true,
    ticket: {
      id: ticket.id,
      number: formatTapNumber(ticket.ticket_number),
      externalId: ticket.external_id,
      status: ticket.status,
      createdAt: ticket.created_at,
    },
  };
}
