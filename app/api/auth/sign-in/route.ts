import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authContext, authError, authRequestId } from "@/lib/auth-debug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = authRequestId(request);
  const context = authContext(requestId);
  const startedAt = Date.now();
  const response = NextResponse.json({ requestId });

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch (error) {
    console.warn("[auth.sign-in] invalid JSON", { ...context, error: authError(error) });
    return NextResponse.json({ error: "Invalid request", requestId }, { status: 400, headers: { "x-auth-request-id": requestId } });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  console.info("[auth.sign-in] start", {
    ...context,
    emailDomain: email.includes("@") ? email.split("@").pop() : "missing",
    emailLength: email.length,
    passwordProvided: password.length > 0,
  });

  if (!email || !password) {
    console.warn("[auth.sign-in] missing credentials", { ...context, elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Invalid email or password", requestId }, { status: 401, headers: { "x-auth-request-id": requestId } });
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        db: { schema: "tap_hub_project" },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      console.warn("[auth.sign-in] Supabase rejected credentials", {
        ...context,
        error: error ? { name: error.name, message: error.message.slice(0, 240), status: error.status } : { name: "MissingSession", message: "No session returned" },
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: error?.message || "Unable to establish a session", requestId }, { status: 401, headers: { "x-auth-request-id": requestId } });
    }

    console.info("[auth.sign-in] success", { ...context, userIdPresent: Boolean(data.user?.id), elapsedMs: Date.now() - startedAt });
    response.headers.set("x-auth-request-id", requestId);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error("[auth.sign-in] unhandled failure", { ...context, error: authError(error), elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Unable to sign in right now.", requestId }, { status: 500, headers: { "x-auth-request-id": requestId } });
  }
}
