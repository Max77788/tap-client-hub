import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ── Behavioral regression for the worklist "Assigned" filter ────────────────
// The filter logic lives in a pure TS helper. Node 22's built-in type stripping
// can load it directly when the specifier carries the `.ts` extension, so this
// test exercises the real code (no reimplementation).
const helper = await import(
  new URL("../lib/worklist-assignment-filter.ts", import.meta.url).href
);

const {
  normalizeAssignmentName,
  assignmentNamesEqual,
  serviceAssignment,
  collectAssignmentOptions,
  matchesAssignmentFilter,
} = helper;

// ── 1. Exact, case-insensitive matching — no substring leakage ──
assert.equal(normalizeAssignmentName("  Patil, Tushar  "), "patil, tushar");
assert.equal(assignmentNamesEqual("Patil", "patil"), true);
assert.equal(assignmentNamesEqual("Patil", "Patil, Tushar"), false, "substring must not match a longer name");
assert.equal(assignmentNamesEqual("Tushar", "Patil, Tushar"), false, "last-name substring must not match");
assert.equal(assignmentNamesEqual("", ""), false, "blank names never match");

// ── 2. Processor falls back only when assignedTo is empty ──
const processorFallback = {
  services: [{ key: "financials", assignedTo: null, processor: "Bob" }],
};
assert.equal(serviceAssignment(processorFallback, "financials"), "Bob");
assert.equal(matchesAssignmentFilter(processorFallback, "financials", "Bob"), true);
assert.equal(matchesAssignmentFilter(processorFallback, "financials", "Alice"), false);

// assignedTo set → processor must NOT independently match the displayed value
const assignedToWins = {
  services: [{ key: "payroll", assignedTo: "Patil, Tushar", processor: "ADP" }],
};
assert.equal(serviceAssignment(assignedToWins, "payroll"), "Patil, Tushar");
assert.equal(matchesAssignmentFilter(assignedToWins, "payroll", "Patil, Tushar"), true);
assert.equal(matchesAssignmentFilter(assignedToWins, "payroll", "ADP"), false, "processor is not the displayed assignee when assignedTo is set");

// ── 3. Client-level owner (assignedStaff) must not contaminate the filter ──
const ownerMismatch = {
  assignedStaff: "Alice (Owner)",
  services: [{ key: "financials", assignedTo: "Bob", processor: null }],
};
assert.equal(serviceAssignment(ownerMismatch, "financials"), "Bob");
assert.equal(collectAssignmentOptions([ownerMismatch], "financials").includes("Bob"), true);
assert.equal(collectAssignmentOptions([ownerMismatch], "financials").includes("Alice (Owner)"), false);
assert.equal(matchesAssignmentFilter(ownerMismatch, "financials", "Bob"), true);
assert.equal(matchesAssignmentFilter(ownerMismatch, "financials", "Alice (Owner)"), false);

// ── 4. Tax Returns uses only the tax_returns service assignment ──
const taxClient = {
  assignedStaff: "Someone Else",
  services: [
    { key: "financials", assignedTo: "Bob", processor: null },
    { key: "tax_returns", assignedTo: "Alice", processor: null },
  ],
};
assert.equal(serviceAssignment(taxClient, "tax_returns"), "Alice");
assert.equal(matchesAssignmentFilter(taxClient, "tax_returns", "Alice"), true);
assert.equal(matchesAssignmentFilter(taxClient, "tax_returns", "Bob"), false, "financials assignment must not leak into tax returns");

// ── 5. STX / state-renewal line items are preserved ──
const stxClient = {
  services: [{
    key: "sales_tax",
    assignedTo: "Team",
    processor: null,
    salesTaxLineItems: [{ assignedTo: "Carol" }],
    stateRenewalItems: [],
  }],
};
assert.equal(matchesAssignmentFilter(stxClient, "sales_tax", "Carol"), true);
assert.equal(matchesAssignmentFilter(stxClient, "sales_tax", "Team"), true);
const renewalClient = {
  services: [{
    key: "annual_reports",
    assignedTo: "Team",
    processor: null,
    stateRenewalItems: [{ assignedTo: "Dana" }],
  }],
};
assert.equal(matchesAssignmentFilter(renewalClient, "annual_reports", "Dana"), true);
assert.equal(matchesAssignmentFilter(renewalClient, "annual_reports", "Team"), true);

// ── 6. The component is wired to the helper (no inline substring / owner fallback) ──
const table = readFileSync(
  fileURLToPath(new URL("../components/worklist-table.tsx", import.meta.url)),
  "utf8",
);
assert.match(table, /from "@\/lib\/worklist-assignment-filter"/, "worklist must import the pure filter helper");
assert.match(table, /matchesAssignmentFilter\(c, serviceKey, assignedFilter\)/, "filter must delegate to the helper");
assert.match(table, /\["All", \.\.\.collectAssignmentOptions\(serviceClients, serviceKey\)\]/, "options must delegate to the helper");
assert.doesNotMatch(table, /assignedFilter\.toLowerCase\(\)/, "substring `.toLowerCase().includes()` filtering must be removed");
assert.doesNotMatch(table, /assignedStaff\s*\|\|\s*""\)\.toLowerCase\(\)\.includes\(filter\)/, "client-level assignedStaff fallback must be removed");

console.log("worklist-assignment-filter regression checks passed");
