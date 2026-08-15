import { NextResponse } from "next/server";
import { resolveAccessIdentity } from "@/lib/access-server";

const TEMP_PASSWORD = process.env.TAP_TEMP_PASSWORD || "TapHub2024!";

export async function POST(request: Request) {
  const identity = await resolveAccessIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const response = NextResponse.json({ mustChangePassword: password === TEMP_PASSWORD });
  if (password === TEMP_PASSWORD) {
    response.cookies.set("tap_force_password", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 86400 });
  }
  return response;
}