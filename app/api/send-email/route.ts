import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, from } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "to, subject, and html are required" },
        { status: 400 },
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email not configured — add RESEND_API_KEY" },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Tap Hub <notifications@email.mom-ai-agency.site>",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend error: ${err}`);
    }

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
