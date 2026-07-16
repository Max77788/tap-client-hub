import { createHmac, timingSafeEqual } from "node:crypto";

export interface DemoSessionPayload {
  email: string;
  name: string;
  exp: number;
}

function sessionSecret(): string {
  const secret = process.env.DEMO_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("DEMO_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY is required");
  return secret;
}

function signature(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createDemoSession(email: string, name: string): string {
  const payload = Buffer.from(JSON.stringify({
    email: email.trim().toLowerCase(),
    name: name.trim(),
    exp: Math.floor(Date.now() / 1000) + 86400,
  } satisfies DemoSessionPayload)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyDemoSession(token: string | undefined): DemoSessionPayload | null {
  if (!token) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;

  try {
    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DemoSessionPayload;
    if (!parsed.email || !parsed.name || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return { email: parsed.email.trim().toLowerCase(), name: parsed.name.trim(), exp: parsed.exp };
  } catch {
    return null;
  }
}
