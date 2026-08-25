import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/time-entries/route.ts", "utf8");
const page = fs.readFileSync("app/time/page.tsx", "utf8");

assert.match(route, /TAP_ASSOCIATES_CLIENT_ID\s*=\s*["']tap-associates["']/);
assert.match(route, /normalizeClientId\(body\.client_id\)/);
assert.match(route, /clientName: e\.client_id \? .*Tap Associates/);
assert.match(page, /const response = await fetch\("\/api\/time-entries"/);
assert.match(page, /if \(!response\.ok\)/);

console.log("time-entry client ID regression checks passed");