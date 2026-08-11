import { NextRequest, NextResponse } from "next/server";
import { resolveAccessIdentity } from "@/lib/access-server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPPORT_RECIPIENTS = ["support@aifusioniqlabs.com"];
const RESEND_FROM = "TAP Hub <notifications@email.mom-ai-agency.site>";

type SupportRequest = {
  reporterName: string;
  accountFirm: string;
  appArea: string;
  summary: string;
  urgent: boolean;
  whatHappened: string;
  expectedResult: string;
  reproductionSteps: string;
  screenshotConfirmed: boolean;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function toHtml(value: string, fallback = "Not provided") {
  return escapeHtml(value || fallback).replace(/\r?\n/g, "<br />");
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatTicketNumber(ticketNumber: number) {
  return `TAP-${String(ticketNumber).padStart(6, "0")}`;
}

export async function POST(req: NextRequest) {
  const requestBody = await req.json().catch(() => null);
  if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const body = requestBody as Record<string, unknown>;
  const payload: SupportRequest = {
    reporterName: readText(body.reporterName),
    accountFirm: readText(body.accountFirm),
    appArea: readText(body.appArea),
    summary: readText(body.summary),
    urgent: body.urgent === true,
    whatHappened: readText(body.whatHappened),
    expectedResult: readText(body.expectedResult),
    reproductionSteps: readText(body.reproductionSteps),
    screenshotConfirmed: body.screenshotConfirmed === true,
  };

  const missingFields = [
    !payload.reporterName && "reporter name",
    !payload.summary && "brief summary",
    !payload.whatHappened && "what happened",
  ].filter(Boolean);
  if (missingFields.length > 0) {
    return NextResponse.json({ error: `Please provide: ${missingFields.join(", ")}.` }, { status: 400 });
  }

  const identity = await resolveAccessIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .insert({
      reporter_profile_id: identity.id.startsWith("demo-") ? null : identity.id,
      reporter_name: payload.reporterName,
      reporter_email: identity.email || null,
      account_firm: payload.accountFirm || null,
      app_area: payload.appArea || null,
      summary: payload.summary,
      priority: payload.urgent ? "urgent" : "normal",
      what_happened: payload.whatHappened,
      expected_result: payload.expectedResult || null,
      reproduction_steps: payload.reproductionSteps || null,
      screenshot_confirmed: payload.screenshotConfirmed,
    })
    .select("id, ticket_number, status, created_at")
    .single();

  if (ticketError || !ticket) {
    console.error("Support ticket database insert failed:", ticketError);
    return NextResponse.json({ error: "Unable to create the support ticket. Please try again." }, { status: 500 });
  }

  const priority = payload.urgent ? "URGENT" : "Normal";
  const ticketNumber = formatTicketNumber(ticket.ticket_number);
  const subject = `${payload.urgent ? "[URGENT] " : ""}${ticketNumber}: ${payload.summary}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #172033;">
      <h1 style="margin-bottom: 8px;">${priority} TAP Hub support ticket</h1>
      <p style="margin-top: 0; color: #526071;">Ticket <strong>${ticketNumber}</strong> was saved in TAP Hub.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><th align="left">Ticket</th><td>${ticketNumber}</td></tr>
        <tr><th align="left">Reporter</th><td>${toHtml(payload.reporterName)}</td></tr>
        <tr><th align="left">Account / firm</th><td>${toHtml(payload.accountFirm)}</td></tr>
        <tr><th align="left">App area</th><td>${toHtml(payload.appArea)}</td></tr>
        <tr><th align="left">Priority</th><td>${priority}</td></tr>
        <tr><th align="left">Screenshot sent separately</th><td>${payload.screenshotConfirmed ? "Yes" : "No"}</td></tr>
      </table>
      <h2>Summary</h2><p>${toHtml(payload.summary)}</p>
      <h2>What happened</h2><p>${toHtml(payload.whatHappened)}</p>
      <h2>Expected result</h2><p>${toHtml(payload.expectedResult)}</p>
      <h2>Steps to reproduce</h2><p>${toHtml(payload.reproductionSteps)}</p>
    </div>
  `;

  const resendKey = process.env.RESEND_API_KEY;
  let emailSent = false;
  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: RESEND_FROM, to: SUPPORT_RECIPIENTS, subject, html }),
      });
      if (!response.ok) console.error("Resend support email failed:", response.status, await response.text());
      else emailSent = true;
    } catch (error) {
      console.error("Resend support email request failed:", error);
    }
  } else {
    console.error("RESEND_API_KEY is not configured. Ticket was saved without an email notification.");
  }

  return NextResponse.json({ ticket: { id: ticket.id, number: ticketNumber, status: ticket.status, createdAt: ticket.created_at }, emailSent }, { status: 201 });
}
