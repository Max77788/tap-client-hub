import {
  normalizeAssignmentName,
  assignmentNamesEqual,
  serviceAssignment,
  collectAssignmentOptions,
  matchesAssignmentFilter,
  type AssignmentClient,
} from "./worklist-assignment-filter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ── Exact case-insensitive equality (no substring leakage) ──
assert(normalizeAssignmentName("  Patil, Tushar ") === "patil, tushar", "normalize trims and lowercases");
assert(assignmentNamesEqual("Patil", "patil"), "case-insensitive equality");
assert(!assignmentNamesEqual("Patil", "Patil, Tushar"), "exact match only: substring does not leak");
assert(!assignmentNamesEqual("Tushar", "Patil, Tushar"), "last-name substring does not leak");
assert(!assignmentNamesEqual("", ""), "blank names never match");

// ── Processor fallback when assignedTo is empty ──
const processorFallback: AssignmentClient = {
  services: [{ key: "financials", assignedTo: null, processor: "Bob" }],
};
assert(serviceAssignment(processorFallback, "financials") === "Bob", "processor is used when assignedTo is empty");
assert(matchesAssignmentFilter(processorFallback, "financials", "Bob"), "filter matches the processor fallback");
assert(!matchesAssignmentFilter(processorFallback, "financials", "Alice"), "filter does not match a missing assignedTo");

// ── Client-level owner mismatch: assignedStaff must be ignored ──
const ownerMismatch: AssignmentClient = {
  assignedStaff: "Alice (Owner)",
  services: [{ key: "financials", assignedTo: "Bob", processor: null }],
};
assert(serviceAssignment(ownerMismatch, "financials") === "Bob", "service-level assignment wins over client-level owner");
assert(collectAssignmentOptions([ownerMismatch], "financials").includes("Bob"), "options include the service-level name");
assert(!collectAssignmentOptions([ownerMismatch], "financials").includes("Alice (Owner)"), "options exclude the client-level owner");
assert(matchesAssignmentFilter(ownerMismatch, "financials", "Bob"), "filter matches the service-level name");
assert(!matchesAssignmentFilter(ownerMismatch, "financials", "Alice (Owner)"), "filter ignores the client-level owner");

// ── Tax Returns must use the tax_returns service assignment ──
const taxClient: AssignmentClient = {
  assignedStaff: "Someone Else",
  services: [
    { key: "financials", assignedTo: "Bob", processor: null },
    { key: "tax_returns", assignedTo: "Alice", processor: null },
  ],
};
assert(serviceAssignment(taxClient, "tax_returns") === "Alice", "tax returns uses the tax_returns service assignment");
assert(matchesAssignmentFilter(taxClient, "tax_returns", "Alice"), "tax returns filter matches the tax_returns assignment");
assert(!matchesAssignmentFilter(taxClient, "tax_returns", "Bob"), "tax returns filter does not leak the financials assignment");

// ── Sales tax / state renewal line items are preserved ──
const stxClient: AssignmentClient = {
  services: [{
    key: "sales_tax",
    assignedTo: "Team",
    processor: null,
    salesTaxLineItems: [{ assignedTo: "Carol" }],
    stateRenewalItems: [],
  }],
};
assert(matchesAssignmentFilter(stxClient, "sales_tax", "Carol"), "STX line-item assignment is filterable");
assert(matchesAssignmentFilter(stxClient, "sales_tax", "Team"), "STX service-level assignment is filterable");
const renewalClient: AssignmentClient = {
  services: [{
    key: "annual_reports",
    assignedTo: "Team",
    processor: null,
    stateRenewalItems: [{ assignedTo: "Dana" }],
  }],
};
assert(matchesAssignmentFilter(renewalClient, "annual_reports", "Dana"), "renewal line-item assignment is filterable");
assert(matchesAssignmentFilter(renewalClient, "annual_reports", "Team"), "renewal service-level assignment is still filterable");

console.log("worklist-assignment-filter-regression=PASS");
