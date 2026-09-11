import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "lib/supabase/admin.ts"), "utf8");

assert.match(
  source,
  /export function createTicketsAdminClient\(\)\s*\{[\s\S]*?process\.env\.TICKETS_SUPABASE_URL![\s\S]*?process\.env\.TICKETS_SUPABASE_SERVICE_ROLE_KEY!/,
  "Ticket routes must use the dedicated tickets Supabase connection.",
);
assert.doesNotMatch(
  /export function createTicketsAdminClient\(\)[\s\S]*?\}/.exec(source)?.[0] ?? "",
  /return createAdminClient\(\)/,
  "Ticket routes must not fall back to TAP Hub's primary database.",
);

console.log("dedicated ticket database client regression checks passed");
