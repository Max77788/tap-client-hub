import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameFromFullName } from "@/lib/profile-identity";
import { authContext, authError, authRequestId } from "@/lib/auth-debug";

export const runtime = "nodejs";

type Profile = { full_name: string | null; email: string | null; active: boolean | null };

export async function POST(request: Request) {
  const requestId = authRequestId(request);
  const context = authContext(requestId);
  const startedAt = Date.now();
  const body = await request.json().catch((error) => {
    console.warn("[auth.resolve-login] invalid JSON", { ...context, error: authError(error) });
    return null;
  });
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const identifierType = identifier.includes("@") ? "email" : "username";
  console.info("[auth.resolve-login] start", { ...context, identifierType, identifierLength: identifier.length });
  if (!identifier || identifier.length > 254) {
    console.warn("[auth.resolve-login] invalid identifier", { ...context, identifierType, identifierLength: identifier.length });
    return NextResponse.json({ error: "Enter your username or email address.", requestId }, { status: 400, headers: { "x-auth-request-id": requestId } });
  }

  try {
    const admin = createAdminClient();
    const { data: profiles, error } = await admin.from("profiles").select("full_name,email,active").eq("active", true);
    if (error) {
      console.error("[auth.resolve-login] profiles query failed", { ...context, error: authError(error), elapsedMs: Date.now() - startedAt });
      return NextResponse.json({ error: "Unable to sign in right now.", requestId }, { status: 500, headers: { "x-auth-request-id": requestId } });
    }

    const normalized = identifier.toLowerCase();
    const matches = ((profiles ?? []) as Profile[]).filter((profile) =>
      profile.email?.trim().toLowerCase() === normalized || usernameFromFullName(profile.full_name) === normalized,
    );
    console.info("[auth.resolve-login] complete", { ...context, identifierType, profileCount: profiles?.length || 0, matchCount: matches.length, elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ email: matches.length === 1 ? matches[0].email : identifier, requestId }, { headers: { "x-auth-request-id": requestId } });
  } catch (error) {
    console.error("[auth.resolve-login] unhandled failure", { ...context, error: authError(error), elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Unable to sign in right now.", requestId }, { status: 500, headers: { "x-auth-request-id": requestId } });
  }
}
