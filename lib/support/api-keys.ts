// Server-only API-key authentication for the support integration API.
//
// SUPPORT_API_KEYS_JSON is a JSON object mapping a source app key to its
// secret, e.g. {"carry-ops":"<secret>","transact-ops":"<secret>"}. Clients
// authenticate with `Authorization: Bearer <secret>`. The secret maps back to
// the source app key used for per-app data isolation.
//
// No real secrets live in this file (or any tracked file); the value comes
// from the server environment at request time.
import { createHash, timingSafeEqual } from "node:crypto";

export type ApiKeyAuth =
  | { ok: true; appKey: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

const MAX_SECRET_LENGTH = 4096;

/**
 * Constant-time string comparison. Both inputs are hashed to a fixed 32-byte
 * digest first so timingSafeEqual never sees different-length buffers (which
 * would throw) and the comparison does not leak secret length.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}

/** Parses SUPPORT_API_KEYS_JSON into a Map<appKey, secret>, or null if absent/malformed. */
export function loadApiKeys(): Map<string, string> | null {
  const raw = process.env.SUPPORT_API_KEYS_JSON;
  if (!raw || !raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const map = new Map<string, string>();
    for (const [appKey, secret] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof secret === "string" && secret.length > 0 && secret.length <= MAX_SECRET_LENGTH) {
        map.set(appKey, secret);
      }
    }
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

/** Extracts a bearer token from an Authorization header, or null. */
export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  if (!match) return null;
  const token = match[1];
  return token.length > 0 && token.length <= MAX_SECRET_LENGTH ? token : null;
}

/**
 * Authenticates a request and resolves it to a source app key.
 * - 500 when the server has not configured SUPPORT_API_KEYS_JSON (fail closed).
 * - 401 when the header is missing/malformed or the key does not match.
 */
export function authenticateApp(authorizationHeader: string | null): ApiKeyAuth {
  const keys = loadApiKeys();
  if (!keys) {
    return { ok: false, status: 500, error: "Support API keys are not configured on this server." };
  }

  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, error: "Missing or malformed Authorization header." };
  }

  for (const [appKey, secret] of keys) {
    if (constantTimeEqual(token, secret)) {
      return { ok: true, appKey };
    }
  }

  return { ok: false, status: 401, error: "Invalid API key." };
}
