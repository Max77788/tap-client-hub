import { NextRequest, NextResponse } from "next/server";
import { authenticateApp } from "@/lib/support/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/support/v1/tickets/[id] — fetch a single ticket (plus its public
// messages) for the authenticated source app. `id` may be the ticket UUID
// returned at creation, or the firm-wide external id (e.g. "AIF-000042").
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateApp(req.headers.get("authorization"));
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 });
  }

  const admin = createAdminClient();

  // App isolation: scope the lookup to the authenticated source app so a
  // ticket owned by another app is indistinguishable from a missing one (404).
  let ticketQuery = admin
    .from("support_tickets")
    .select(
      "id, external_id, source_app_key, status, priority, category, summary, what_happened, external_reference, reporter_name, reporter_email, client_context, created_at, updated_at, last_activity_at, first_response_at, closed_at",
    )
    .eq("source_app_key", auth.appKey);
  ticketQuery = UUID_RE.test(id) ? ticketQuery.eq("id", id) : ticketQuery.eq("external_id", id);

  const { data: ticket, error } = await ticketQuery.maybeSingle();
  if (error) {
    console.error("Support ticket fetch failed:", error);
    return NextResponse.json({ error: "Unable to fetch the ticket." }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  // Only public messages are ever returned to external apps. Internal
  // (agent/system) messages are never included.
  const { data: messages, error: messagesError } = await admin
    .from("support_ticket_messages")
    .select("id, author_type, author_name, body, visibility, created_at")
    .eq("ticket_id", ticket.id)
    .eq("visibility", "public")
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Support ticket messages fetch failed:", messagesError);
    return NextResponse.json({ error: "Unable to fetch ticket messages." }, { status: 500 });
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      number: ticket.external_id,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      title: ticket.summary,
      description: ticket.what_happened,
      externalReference: ticket.external_reference,
      reporterName: ticket.reporter_name,
      reporterEmail: ticket.reporter_email,
      clientContext: ticket.client_context,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      lastActivityAt: ticket.last_activity_at,
      firstResponseAt: ticket.first_response_at,
      closedAt: ticket.closed_at,
    },
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      authorType: message.author_type,
      authorName: message.author_name,
      body: message.body,
      visibility: message.visibility,
      createdAt: message.created_at,
    })),
  });
}
