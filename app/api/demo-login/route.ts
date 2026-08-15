import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDemoSession } from "@/lib/demo-session";

// Temporary onboarding credential. Keep this server-side and remove the
// fallback after every active user has selected a personal password.
const TEMP_PASSWORD = process.env.TAP_TEMP_PASSWORD || "TapHub2024!";

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
  if (password !== TEMP_PASSWORD) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("full_name,email,active")
    .ilike("email", email)
    .eq("active", true)
    .maybeSingle();
  if (error || !profile?.email) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const name = profile.full_name || email;
  const response = NextResponse.json({ ok: true, name, email, mustChangePassword: true });
  response.cookies.set("tap_demo_session", createDemoSession(email, name), COOKIE_OPTIONS);
  response.cookies.set("tap_demo_user", name, COOKIE_OPTIONS);
  response.cookies.set("tap_demo_email", email, COOKIE_OPTIONS);
  response.cookies.set("tap_force_password", "1", COOKIE_OPTIONS);
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
