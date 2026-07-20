import { NextRequest, NextResponse } from "next/server";
import { createDemoSession } from "@/lib/demo-session";

const DEMO_USERS: Record<string, { password: string; name: string }> = {
  "tushar@tapallc.com": { password: "TapHub2024!", name: "Tushar Patil" },
  "lizette@tapallc.com": { password: "TapHub2024!", name: "Lizette Esparza" },
  "mmatronin@gmail.com": { password: "MaxHub2025!", name: "Max Matronin" },
  "ben@aifusioniqlabs.com": { password: "TapHub2024!", name: "Ben" },
  "staff@tapallc.com": { password: "TapHub2024!", name: "Staff Test" },
  "janeth@tapallc.com": { password: "TapHub2024!", name: "Janeth Noguera" },
  "alvaro@tapallc.com": { password: "TapHub2024!", name: "Alvaro Ortega" },
  "bonnie@tapallc.com": { password: "TapHub2024!", name: "Bonnie Edwards" },
  "shilpa@tapallc.com": { password: "TapHub2024!", name: "Shilpa Kulkarni" },
  "sam@tapallc.com": { password: "TapHub2024!", name: "Sam Patil" },
  "amruta@tapallc.com": { password: "TapHub2024!", name: "Amruta Patil" },
  "sanket@tapallc.com": { password: "TapHub2024!", name: "Sanket Panchasara" },
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 86400,
};

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const demo = DEMO_USERS[email];
  if (!demo || password !== demo.password) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, name: demo.name, email });
  response.cookies.set("tap_demo_session", createDemoSession(email, demo.name), COOKIE_OPTIONS);
  response.cookies.set("tap_demo_user", demo.name, COOKIE_OPTIONS);
  response.cookies.set("tap_demo_email", email, COOKIE_OPTIONS);
  response.cookies.delete("tap_demo_role");
  response.cookies.delete("tap_modules");
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("tap_demo_session");
  response.cookies.delete("tap_demo_user");
  response.cookies.delete("tap_demo_email");
  response.cookies.delete("tap_demo_role");
  response.cookies.delete("tap_modules");
  return response;
}
