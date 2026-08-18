// ── Worklist "Assigned" filter helpers ──────────────────────────────────────
//
// The worklist "Assigned" dropdown and filter must reflect the *displayed*
// assignment only, never the client-level owner:
//
//   - ordinary services: svc.assignedTo || svc.processor
//   - Tax Returns:       the tax_returns service assignment (assignedTo || processor)
//   - sales tax / state renewals: line-item assignments (which fall back to the
//     service-level value for STX items, exactly like the rendered column)
//
// The client-level `assignedStaff` field is intentionally ignored — it represents
// the account owner and is unrelated to who is assigned the service work.

export type AssignmentLineItem = {
  assignedTo?: string | null;
};

export type AssignmentService = {
  key?: string;
  assignedTo?: string | null;
  processor?: string | null;
  salesTaxLineItems?: AssignmentLineItem[];
  stateRenewalItems?: AssignmentLineItem[];
};

export type AssignmentClient = {
  services?: AssignmentService[];
  // Client-level owner. Present on the model but deliberately excluded from
  // the assignment filter/options below.
  assignedStaff?: string | null;
};

// Whitespace-normalized, lowercased comparison key.
export function normalizeAssignmentName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Exact, case-insensitive equality. Blank names never match, so an unassigned
// row cannot satisfy a non-empty filter (and vice versa).
export function assignmentNamesEqual(a: unknown, b: unknown): boolean {
  const left = normalizeAssignmentName(a);
  const right = normalizeAssignmentName(b);
  return left !== "" && left === right;
}

function findService(client: AssignmentClient, serviceKey: string): AssignmentService | undefined {
  return client.services?.find((s) => s.key === serviceKey);
}

// Service-level displayed assignment: `assignedTo || processor`.
// For Tax Returns pass `"tax_returns"` to read the tax_returns service assignment.
export function serviceAssignment(client: AssignmentClient, serviceKey: string): string {
  const svc = findService(client, serviceKey);
  return svc?.assignedTo || svc?.processor || "";
}

// Every assignment name a worklist row for this client+service can display.
// STX line items fall back to the service-level value (matching the rendered
// column); renewal line items are independent (`assignedTo || "Unassigned"`).
export function displayedAssignments(client: AssignmentClient, serviceKey: string): string[] {
  const svc = findService(client, serviceKey);
  if (!svc) return [];
  const serviceLevel = svc.assignedTo || svc.processor || "";
  const names: string[] = [];
  if (serviceLevel) names.push(serviceLevel);
  for (const item of svc.salesTaxLineItems || []) {
    const value = item.assignedTo || serviceLevel || "";
    if (value) names.push(value);
  }
  for (const item of svc.stateRenewalItems || []) {
    if (item.assignedTo) names.push(item.assignedTo);
  }
  return names;
}

// Distinct, sorted assignment names for the filter dropdown.
export function collectAssignmentOptions(clients: AssignmentClient[], serviceKey: string): string[] {
  const names = new Set<string>();
  for (const client of clients) {
    for (const name of displayedAssignments(client, serviceKey)) names.add(name);
  }
  return Array.from(names).sort();
}

// True when `filter` (a non-empty display name) exactly matches one of the
// displayed assignment names, case-insensitively.
export function matchesAssignmentFilter(
  client: AssignmentClient,
  serviceKey: string,
  filter: string,
): boolean {
  if (!normalizeAssignmentName(filter)) return true;
  return displayedAssignments(client, serviceKey).some((name) => assignmentNamesEqual(name, filter));
}
