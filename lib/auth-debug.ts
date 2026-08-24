import { randomUUID } from "node:crypto";

export function authRequestId(request?: Request) {
  return request?.headers.get("x-request-id") || randomUUID();
}

export function authError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message.slice(0, 240) };
  return { name: "UnknownError", message: String(error).slice(0, 240) };
}

export function authContext(requestId: string) {
  return {
    requestId,
    host: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "missing",
    schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "tap_hub_project",
    nodeEnv: process.env.NODE_ENV || "unknown",
  };
}
