import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const api = read("app/api/support/inbox/route.ts");
const page = read("app/support/inbox/page.tsx");
const layout = read("app/layout.tsx");

assert.match(api, /resolveAccessIdentity\(\)/, "inbox requires a resolved TAP Hub identity");
assert.match(api, /\["owner", "admin"\]\.includes\(identity\.role\)/, "inbox API limits cross-app data to owner/admin");
assert.match(api, /\.from\("support_apps"\)/, "inbox reads the registered app list");
assert.match(api, /\.from\("support_tickets"\)/, "inbox queries shared tickets");
assert.match(api, /\.eq\("source_app_key", app\)/, "inbox filters tickets by source app");
assert.match(api, /VALID_STATUSES\.has\(status\)/, "inbox validates status instead of accepting arbitrary filters");
assert.doesNotMatch(api, /reporter_profile_id|assigned_to|metadata/, "inbox payload does not expose profile or arbitrary metadata");
assert.match(page, /All applications/, "dashboard exposes an all-apps filter");
assert.match(page, /setApp\(event\.target\.value\)/, "dashboard updates the application filter");
assert.match(page, /appNames\.get\(ticket\.appKey\)/, "dashboard renders the app name for every ticket");
assert.match(page, /Urgent unresolved/, "dashboard surfaces the unresolved urgent count");
assert.match(layout, /href: "\/support\/inbox"/, "dashboard is reachable from TAP Hub navigation");
assert.match(layout, /role: "admin"/, "dashboard navigation is restricted to admins/owners");

console.log("support-inbox-dashboard.test.mjs: 13 assertions passed");
