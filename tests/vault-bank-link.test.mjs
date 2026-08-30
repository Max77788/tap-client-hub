import assert from "node:assert/strict";
import fs from "node:fs";

const vaultPage = fs.readFileSync(new URL("../app/vault/page.tsx", import.meta.url), "utf8");
const credentialsRoute = fs.readFileSync(new URL("../app/api/credentials/route.ts", import.meta.url), "utf8");

assert.match(credentialsRoute, /url:\s+c\.url\s+\|\|\s+c\.link_url\s+\|\|\s+c\.portal_url/);
assert.match(vaultPage, /href=\{bankUrl \|\| undefined\}/);
assert.match(vaultPage, /target=\{bankUrl \? "_blank" : undefined\}/);
assert.match(vaultPage, /NEXT_PUBLIC_TAP_BANK_URL/);
assert.doesNotMatch(vaultPage, /<a href="#" onClick=\{e => \{ e\.preventDefault\(\); \}\}/);

console.log("vault bank link regression checks passed");
