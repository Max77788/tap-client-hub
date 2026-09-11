import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "lib/supabase/admin.ts"), "utf8");

assert.match(
  source,
  /export function createTicketsAdminClient\(\)\s*\{\s*return createAdminClient\(\);\s*\}/s,
  "Support ticket storage must use TAP Hub's active primary Supabase client, not a stale dedicated-database environment variable.",
);
assert.doesNotMatch(
  source,
  /process\.env\.TICKETS_SUPABASE_URL/,
  "The support ticket client must not use the retired ticket database URL.",
);

console.log("support ticket client regression checks passed");
