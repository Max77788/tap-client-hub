import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const route = read("app/api/send-email/route.ts");
const supportPage = read("app/support/page.tsx");

assert.match(route, /const SUPPORT_RECIPIENTS = \[[\s\S]*mmatronin@gmail\.com[\s\S]*singh\.benny@gmail\.com[\s\S]*ben@aifusioniqlabs\.com[\s\S]*\]/);
assert.match(route, /from:\s*RESEND_FROM/);
assert.match(route, /to:\s*SUPPORT_RECIPIENTS/);
assert.doesNotMatch(route, /const\s*\{[^}]*\b(?:to|from)\b[^}]*\}\s*=\s*await req\.json\(\)/);
assert.match(route, /Authorization:\s*`Bearer \$\{resendKey\}`/);
assert.match(route, /function escapeHtml\(value: string\)/);
assert.match(route, /function toHtml\([\s\S]{0,150}escapeHtml\(/);
assert.match(route, /toHtml\(payload\.summary\)/);
assert.match(route, /toHtml\(payload\.whatHappened\)/);
assert.match(route, /reporterName[\s\S]{0,500}summary[\s\S]{0,500}whatHappened/);
assert.match(route, /status:\s*400/);
assert.match(route, /status:\s*502/);

assert.match(supportPage, /fetch\(["']\/api\/send-email["'],\s*\{[\s\S]{0,500}method:\s*["']POST["']/);
assert.match(supportPage, /headers:\s*\{\s*["']Content-Type["']:\s*["']application\/json["']/);
assert.match(supportPage, /body:\s*JSON\.stringify\(\{[\s\S]{0,600}reporterName[\s\S]{0,600}summary[\s\S]{0,600}whatHappened/);
assert.doesNotMatch(supportPage, /window\.location\.href\s*=/);
assert.match(supportPage, /sending/);
assert.match(supportPage, /ticket was sent to the support team/i);
assert.match(supportPage, /mmatronin@gmail\.com[\s\S]{0,200}singh\.benny@gmail\.com[\s\S]{0,200}ben@aifusioniqlabs\.com/);

console.log("support Resend delivery regression checks passed");
