import { NextRequest, NextResponse } from "next/server";
import { authenticateApp } from "@/lib/support/api-keys";
import { createTicket } from "@/lib/support/create-ticket";

export const runtime = "nodejs";

// POST /api/support/v1/tickets — create a support ticket on behalf of an
// external FusionIQ app. The source app is determined by the Bearer API key;
// the request body must NOT attempt to override it.
export async function POST(req: NextRequest) {
  const auth = authenticateApp(req.headers.get("authorization"));
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const requestBody = await req.json().catch(() => null);
  if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const body = requestBody as Record<string, unknown>;
  const result = await createTicket({
    sourceAppKey: auth.appKey,
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    reporter: {
      name: typeof body.reporterName === "string" ? body.reporterName : "",
      email: typeof body.reporterEmail === "string" ? body.reporterEmail : null,
      userId: typeof body.reporterUserId === "string" ? body.reporterUserId : null,
    },
    externalReference: typeof body.externalReference === "string" ? body.externalReference : null,
    priority: typeof body.priority === "string" ? body.priority : null,
    category: typeof body.category === "string" ? body.category : null,
    clientContext: body.clientContext,
    metadata: body.metadata,
  });

  if (result.ok === false) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      ticket: {
        id: result.ticket.id,
        number: result.ticket.externalId,
        status: result.ticket.status,
        createdAt: result.ticket.createdAt,
      },
    },
    { status: 201 },
  );
}
