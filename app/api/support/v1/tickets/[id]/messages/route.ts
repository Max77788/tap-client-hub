import { NextRequest, NextResponse } from "next/server";
import { authenticateApp } from "@/lib/support/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 20000;
const MAX_METADATA_BYTES = 20000;

// POST /api/support/v1/tickets/[id]/messages — append a public reporter
// message to a ticket owned by the authenticated source app.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApp(req.headers.get("authorization"));
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 });
  }

  const requestBody = await req.json().catch(() => null);
  if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const body = requestBody as Record<string, unknown>;
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!messageBody) {
    return NextResponse.json({ error: "body is required and must not be blank." }, { status: 400 });
  }
  if (messageBody.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `body must be at most ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }

  let metadata: Record<string, unknown> | null = null;
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
      return NextResponse.json({ error: "metadata must be a JSON object." }, { status: 400 });
    }
    if (JSON.stringify(body.metadata).length > MAX_METADATA_BYTES) {
      return NextResponse.json({ error: "metadata is too large." }, { status: 400 });
    }
    metadata = body.metadata as Record<string, unknown>;
  }

  const admin = createAdminClient();

  // App isolation: only the ticket's own source app may append messages.
  let ticketQuery = admin
    .from("support_tickets")
    .select("id, reporter_name, reporter_user_id")
    .eq("source_app_key", auth.appKey);
  ticketQuery = UUID_RE.test(id) ? ticketQuery.eq("id", id) : ticketQuery.eq("external_id", id);

  const { data: ticket, error: ticketError } = await ticketQuery.maybeSingle();
  if (ticketError) {
    console.error("Support ticket lookup failed:", ticketError);
    return NextResponse.json({ error: "Unable to find the ticket." }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const { data: message, error: messageError } = await admin
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_type: "reporter",
      author_name: ticket.reporter_name,
      author_user_id: ticket.reporter_user_id,
      body: messageBody,
      visibility: "public",
      metadata: metadata ?? {},
    })
    .select("id, author_type, author_name, body, visibility, created_at")
    .single();

  if (messageError || !message) {
    console.error("Support ticket message insert failed:", messageError);
    return NextResponse.json({ error: "Unable to add the message." }, { status: 500 });
  }

  // Audit event. The message above is the system of record; the event is a
  // best-effort audit trail, so a failure here is logged rather than failing
  // the request.
  const { error: eventError } = await admin.from("support_ticket_events").insert({
    ticket_id: ticket.id,
    event_type: "message.reporter",
    actor_type: "reporter",
    actor_name: ticket.reporter_name,
    actor_user_id: ticket.reporter_user_id,
    metadata: { source_app_key: auth.appKey },
  });
  if (eventError) {
    console.error("Support ticket event insert failed:", eventError);
  }

  return NextResponse.json(
    {
      message: {
        id: message.id,
        authorType: message.author_type,
        authorName: message.author_name,
        body: message.body,
        visibility: message.visibility,
        createdAt: message.created_at,
      },
    },
    { status: 201 },
  );
}
