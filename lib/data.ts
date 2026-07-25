// ── TAP Client Hub · Mock Data Module ──

import type { Client, ClientStats, ClientType, MonthStatus, ServiceConfig, ServiceKey, VaultEntry } from "./types";

// ── Staff pool ──
export const STAFF = [
  { id: "s1", name: "Patil, Tushar", initials: "TP", role: "Owner/Admin" },
  { id: "s2", name: "Esparza, Lizette", initials: "LE", role: "Manager" },
  { id: "s3", name: "Noguera,Janeth", initials: "JN", role: "Staff" },
  { id: "s4", name: "Patil,Sam", initials: "SP", role: "Offshore/India" },
  { id: "s5", name: "Kulkarni,Shilpa", initials: "SK", role: "Staff" },
  { id: "s6", name: "Edwards,Bonnie", initials: "BE", role: "Staff" },
  { id: "s7", name: "Patil,Amruta", initials: "AP", role: "Offshore/India" },
  { id: "s8", name: "Ortega,Alvaro", initials: "AO", role: "Staff" },
  { id: "s9", name: "Panchasara,Sanket", initials: "SP2", role: "Offshore/India" },
] as const;

// ── Month labels ──
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Service labels & pill colors ──
export const SERVICE_META: Record<ServiceKey, { label: string; pillColor: string; pillBg: string }> = {
  financials:  { label: "Financials",  pillColor: "#1d5734",            pillBg: "var(--green-soft)"  },
  payroll:     { label: "Payroll",     pillColor: "#214b6e",            pillBg: "var(--blue-soft)"   },
  sales_tax:   { label: "Sales Tax",   pillColor: "#8a560f",            pillBg: "var(--amber-soft)"  },
  "1099s":     { label: "1099s",       pillColor: "#7a5436",            pillBg: "#f0e8e2"             },
  renditions:     { label: "Renditions",     pillColor: "#3a5a44",            pillBg: "#e7eee8"             },
  annual_reports: { label: "Annual Reports", pillColor: "#4a4a80",            pillBg: "#e7eaf0"             },
  tax_returns: { label: "Tax Returns", pillColor: "#5a4a80",            pillBg: "#ece7f3"             },
};

// ── Helper: generate a 12-month tracking array ──
function makeMonths(pattern: MonthStatus[]): MonthStatus[] {
  const currentMonth = new Date().getMonth(); // 0-11
  if (pattern.length === 12) {
    // For the current year, lock future months so they show as "not yet"
    return pattern.map((status, i) => (i > currentMonth ? "lock" : status));
  }
  // repeat pattern to fill 12
  const result: MonthStatus[] = [];
  for (let i = 0; i < 12; i++) {
    const status = pattern[i % pattern.length];
    result.push(i > currentMonth ? "lock" : status);
  }
  return result;
}

function svc(
  key: ServiceKey,
  enabled: boolean,
  frequency: ServiceConfig["frequency"],
  processor: string,
  monthPattern: MonthStatus[],
): any {
  return {
    key,
    label: SERVICE_META[key].label,
    enabled,
    frequency,
    processor,
    months: enabled ? makeMonths(monthPattern) : Array(12).fill("lock"),
  };
}

// ── 50 real clients from TAP Associates Google Sheets ──
export const CLIENTS: any[] = [
  {
    id: "c1",
    cid: "CID-1000",
    name: "ASC Anesthesia Associates Inc",
    type: "Business",
    group: "Unassigned",
    city: "Saratoga",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Shilpa",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Bi-Weekly A", "Shilpa", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c2",
    cid: "CID-1001",
    name: "Aaron Edwards PLLC (dba Katy Dental Studio)",
    type: "Business",
    group: "Unassigned",
    city: "Katy",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c3",
    cid: "CID-1002",
    name: "Acclaimed Trading Inc",
    type: "Business",
    group: "RPBS/Outside Shareholders",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c4",
    cid: "CID-1003",
    name: "American Book Buy.Com Inc (MI)",
    type: "Business",
    group: "RPBS/Outside Shareholders",
    city: "Detroit",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c5",
    cid: "CID-1004",
    name: "Back to Naturel LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c6",
    cid: "CID-1005",
    name: "Barclay Operations LLC",
    type: "Business",
    group: "Malik",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c7",
    cid: "CID-1006",
    name: "Bdantowitz LLC",
    type: "Business",
    group: "Unassigned",
    city: "Brighton",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c8",
    cid: "CID-1007",
    name: "Benry Utility Services LLC",
    type: "Business",
    group: "Unassigned",
    city: "Cypress",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Lizette",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Weekly", "Lizette", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c9",
    cid: "CID-1008",
    name: "Bianca Asan Borja MD PLLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c10",
    cid: "CID-1009",
    name: "C&H Transportation & Bus Rentals LLC",
    type: "Business",
    group: "Ron",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c11",
    cid: "CID-1010",
    name: "Carlin Barnes MD PA",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Semi-Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c12",
    cid: "CID-1011",
    name: "Chimique International Inc",
    type: "Business",
    group: "Unassigned",
    city: "Round Rock",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c13",
    cid: "CID-1012",
    name: "Clark, Duncan & Morris Inc",
    type: "Business",
    group: "Peter M",
    city: "Sugar Land",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c14",
    cid: "CID-1013",
    name: "D\'Souza Inc (Wallisville Dry Clean Super Center)",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Lizette",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "weekly", "Lizette", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c15",
    cid: "CID-1014",
    name: "DMW Food Services LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c16",
    cid: "CID-1015",
    name: "Devyani Management LLC",
    type: "Business",
    group: "Shonali",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "LB",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", false, "Monthly", "Sam", Array(12).fill("lock")),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c17",
    cid: "CID-1016",
    name: "Diastar Inc",
    type: "Business",
    group: "Shefali",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Yearly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c18",
    cid: "CID-1017",
    name: "Drift Dynamics LLC",
    type: "Business",
    group: "Assem & Saood",
    city: "Missouri City",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c19",
    cid: "CID-1018",
    name: "Dunn\'s Valve Testers Inc",
    type: "Business",
    group: "Micah Simmons",
    city: "Spring",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c20",
    cid: "CID-1019",
    name: "ERE Industrial LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c21",
    cid: "CID-1020",
    name: "FF&E Solutions LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c22",
    cid: "CID-1021",
    name: "GV Steel LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c23",
    cid: "CID-1022",
    name: "Galaxy Interests Inc",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c24",
    cid: "CID-1023",
    name: "Galloper Chauffeured Services LLC",
    type: "Business",
    group: "Ghaz Hamdani",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c25",
    cid: "CID-1024",
    name: "Gastro Concepts LP",
    type: "Business",
    group: "Shammi",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c26",
    cid: "CID-1025",
    name: "Global Dealership Services LLC",
    type: "Business",
    group: "Moe Elmorabit",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c27",
    cid: "CID-1026",
    name: "Global Omni LLC",
    type: "Business",
    group: "Manish Maheshwari",
    city: "Fulshear",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c28",
    cid: "CID-1027",
    name: "Grindmasters Inc",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c29",
    cid: "CID-1028",
    name: "Gulf Shores Auto Traders LLC",
    type: "Business",
    group: "Unassigned",
    city: "Rosenberg",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c30",
    cid: "CID-1029",
    name: "H & P Wealth Management LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Semi-Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c31",
    cid: "CID-1030",
    name: "Hadimba Travel Inc",
    type: "Business",
    group: "Unassigned",
    city: "Cypress",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", true, "Monthly", "MC", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c32",
    cid: "CID-1031",
    name: "Hot and Buttered LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c33",
    cid: "CID-1032",
    name: "India House Inc",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Semi-Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c34",
    cid: "CID-1033",
    name: "Iqbal M Mirza MD Professional Corporation",
    type: "Business",
    group: "Unassigned",
    city: "Saratoga",
    state: "CA",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c35",
    cid: "CID-1034",
    name: "JAP Construction Company LLC",
    type: "Business",
    group: "Unassigned",
    city: "Sugar Land",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c36",
    cid: "CID-1035",
    name: "Jai Ganesh Hospitality Inc",
    type: "Business",
    group: "Unassigned",
    city: "Canaan",
    state: "ME",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c37",
    cid: "CID-1036",
    name: "Jhan Foods LLC (dba Khaugully Indian Kitchen)",
    type: "Business",
    group: "Unassigned",
    city: "Spring",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Semi-Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c38",
    cid: "CID-1037",
    name: "KB Kitchen & Bath Remodeling LLC",
    type: "Business",
    group: "Sam Samara Group",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c39",
    cid: "CID-1038",
    name: "LDH 2020 LLC (dba Diamond Food Mart)",
    type: "Business",
    group: "Unassigned",
    city: "Beaumont",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c40",
    cid: "CID-1039",
    name: "Lonestar Steel & Tubing Inc",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c41",
    cid: "CID-1040",
    name: "Marace Realty Co LLC",
    type: "Business",
    group: "Josh Davis",
    city: "Pearland",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "LB",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", false, "Monthly", "Sam", Array(12).fill("lock")),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c42",
    cid: "CID-1041",
    name: "Max Box Rentals LLC",
    type: "Business",
    group: "Josh Davis",
    city: "Pearland",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Sam",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c43",
    cid: "CID-1042",
    name: "Mohan Lal Enterprises Inc",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c44",
    cid: "CID-1043",
    name: "NIC Group Inc",
    type: "Business",
    group: "Unassigned",
    city: "Spring",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Yearly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c45",
    cid: "CID-1044",
    name: "Pramukh Drashti PA (dba Vision Source Richmond)",
    type: "Business",
    group: "Unassigned",
    city: "Richmond",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c46",
    cid: "CID-1045",
    name: "Pristine Energy LLC (dba San Marcos Apartment)",
    type: "Business",
    group: "Shonali",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "LB",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", false, "Monthly", "Janeth", Array(12).fill("lock")),
          svc("sales_tax", false, "Monthly", "Sam", Array(12).fill("lock")),
          svc("renditions", true, "Annually", "LB", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("1099s", true, "Annually", "JD", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c47",
    cid: "CID-1046",
    name: "Revived Wellness 2 LLC",
    type: "Business",
    group: "Unassigned",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Monthly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c48",
    cid: "CID-1047",
    name: "Sarriya LLC",
    type: "Business",
    group: "Unassigned",
    city: "Sugar Land",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Semi-Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c49",
    cid: "CID-1048",
    name: "The Cedar Tree Mediterranean Grill & Café LLC",
    type: "Business",
    group: "Kafil M",
    city: "Lago Vista",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Bi-Weekly A", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
  {
    id: "c50",
    cid: "CID-1049",
    name: "Valvitalia USA Inc",
    type: "Business",
    group: "Leslie Bernal",
    city: "Houston",
    state: "TX",
    email: "",
    phone: "",
    address: "",
    assignedStaff: "Janeth",
    services: [
          svc("financials", false, "Monthly", "MC", Array(12).fill("lock")),
          svc("payroll", true, "Semi-Monthly", "Janeth", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("sales_tax", true, "Quarterly", "Sam", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
          svc("renditions", false, "Annually", "LB", Array(12).fill("lock")),
          svc("1099s", false, "Annually", "JD", Array(12).fill("lock")),
          svc("tax_returns", true, "Annually", "TA", ["done", "done", "done", "done", "done", "billed", "lock", "lock", "lock", "lock", "lock", "lock"]),
    ],
  },
];


// ── Password Vault Entries (initial seed data) ──
const DEFAULT_VAULT_ENTRIES: VaultEntry[] = [
  {
    id: "v1",
    clientId: "c1",
    site: "IRS E-Services",
    email: "tap-admin",
    password: "P@ssw0rd!2024",
    notes: "EFIN: 123456. Used for transcript pulls and POA uploads.",
  },
  {
    id: "v2",
    clientId: "c1",
    site: "QuickBooks Online",
    email: "303a.bookkeeper@gmail.com",
    password: "Qb!Secure789",
    notes: "View-only access. Login as accountant user.",
  },
  {
    id: "v3",
    clientId: "c1",
    site: "TAP Bank",
    email: "",
    password: "",
    notes: "Business checking — routing + account on file in TAP Bank portal.",
    isBank: true,
  },
  {
    id: "v4",
    clientId: "c4",
    site: "IRS E-Services",
    email: "tap-brazos",
    password: "T@xPr0!2024",
    notes: "Transcript requests for entity-level filings.",
  },
  {
    id: "v5",
    clientId: "c4",
    site: "QuickBooks Online",
    email: "brazos@tap-associates.com",
    password: "Riv3rP@rtn3rs",
    notes: "Accountant access.",
  },
  {
    id: "v6",
    clientId: "c4",
    site: "TAP Bank",
    email: "",
    password: "",
    notes: "Operating account. See TAP Bank for full details.",
    isBank: true,
  },
  {
    id: "v7",
    clientId: "c9",
    site: "IRS E-Services",
    email: "tap-greenway",
    password: "Gr33nEn3rgy!",
    notes: "Transcript access for payroll tax verification.",
  },
  {
    id: "v8",
    clientId: "c9",
    site: "Texas Comptroller",
    email: "greenway-ftp",
    password: "TxComp2024!",
    notes: "Webfile login for sales tax filing.",
  },
  {
    id: "v9",
    clientId: "c12",
    site: "QuickBooks Online",
    email: "juniper@tap-associates.com",
    password: "JuniperC@p1tal",
    notes: "Full accountant access.",
  },
  {
    id: "v10",
    clientId: "c12",
    site: "TAP Bank",
    email: "",
    password: "",
    notes: "Capital reserve account. Details in TAP Bank.",
    isBank: true,
  },
  {
    id: "v11",
    clientId: "c2",
    site: "IRS E-Services",
    email: "tap-aaron",
    password: "PL!C2024Tax",
    notes: "Transcripts for PLLC return.",
  },
  {
    id: "v12",
    clientId: "c14",
    site: "QuickBooks Online",
    email: "longhorn@tap-associates.com",
    password: "L0ngH0rnL0g!",
    notes: "View-only access.",
  },
];

// Keep VAULT_ENTRIES as mutable export for backward compat
export let VAULT_ENTRIES: VaultEntry[] = [...DEFAULT_VAULT_ENTRIES];

// ── localStorage persistence ──
const VAULT_STORAGE_KEY = "tap_vault";

export function loadVault(): VaultEntry[] {
  if (typeof window === "undefined") return [...DEFAULT_VAULT_ENTRIES];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      VAULT_ENTRIES = [...DEFAULT_VAULT_ENTRIES];
      return [...VAULT_ENTRIES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      VAULT_ENTRIES = parsed;
      return [...parsed];
    }
  } catch {
    // corrupted data, fall back to defaults
  }
  VAULT_ENTRIES = [...DEFAULT_VAULT_ENTRIES];
  return [...VAULT_ENTRIES];
}

export function saveVault(entries: VaultEntry[]): void {
  VAULT_ENTRIES = [...entries];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // storage full or unavailable
    }
  }
}

export function addVaultEntry(entry: Omit<VaultEntry, "id">): VaultEntry {
  const newEntry: VaultEntry = {
    ...entry,
    id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  };
  saveVault([...loadVault(), newEntry]);
  return newEntry;
}

export function updateVaultEntry(id: string, updates: Partial<Omit<VaultEntry, "id">>): VaultEntry | null {
  const entries = loadVault();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated = { ...entries[idx], ...updates };
  entries[idx] = updated;
  saveVault(entries);
  return updated;
}

export function deleteVaultEntry(id: string): boolean {
  const entries = loadVault();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  entries.splice(idx, 1);
  saveVault(entries);
  return true;
}

/** Delete all vault entries for a given clientId (used by client cascade delete) */
export function deleteVaultEntriesByClient(clientId: string): number {
  const entries = loadVault();
  const before = entries.length;
  const filtered = entries.filter((e) => e.clientId !== clientId);
  saveVault(filtered);
  return before - filtered.length;
}

// ── Helper: get entries grouped by client name ──
export function getVaultEntriesByClient(): Map<string, VaultEntry[]> {
  const entries = loadVault();
  const map = new Map<string, VaultEntry[]>();
  for (const entry of entries) {
    const client = entry.clientId ? CLIENTS.find((c) => c.id === entry.clientId) : undefined;
    const key = client ? client.name : "Unassigned";
    const existing = map.get(key) || [];
    existing.push(entry);
    map.set(key, existing);
  }
  return map;
}

// ── Query helpers ──

function normalizeSearchValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalizeSearchValue).join(" ");
  return value == null ? "" : String(value).toLowerCase();
}

export function matchesClientSearch(client: Client, search: string): boolean {
  const query = normalizeSearchValue(search);
  if (!query) return true;

  const phoneQuery = query.replace(/\D/g, "");
  if (phoneQuery.length >= 7 && client.phones) {
    for (const phone of client.phones) {
      if (phone.replace(/\D/g, "").includes(phoneQuery)) return true;
    }
  }

  return normalizeSearchValue([
    client.name,
    client.cid,
    client.group,
    client.groupName,
    client.contact,
    client.address,
    client.city,
    client.state,
    client.zip,
  ]).includes(query);
}

export function filterClients(
  clients: Client[],
  opts: {
    search?: string;
    type?: ClientType | "All";
    group?: string;
    staff?: string;
    status?: string;
  } = {},
): Client[] {
  let result = [...clients];

  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cid.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    );
  }

  if (opts.type && opts.type !== "All") {
    result = result.filter((c) => c.type === opts.type);
  }

  if (opts.group) {
    result = result.filter((c) => c.group === opts.group);
  }

  if (opts.staff) {
    result = result.filter((c) => c.assignedStaff === opts.staff);
  }

  if (opts.status === "active") {
    result = result.filter((c) => c.active !== false);
  }

  if (opts.status === "inactive") {
    result = result.filter((c) => c.active === false);
  }

  return result;
}

export function getClientById(id: string): Client | undefined {
  return CLIENTS.find((c) => c.id === id);
}

export function getStats(clients: Client[]): ClientStats {
  const currentMonth = new Date().getMonth(); // 0-indexed

  let monthlyFinancials = 0;
  let behindThisMonth = 0;
  let financialsCount = 0;
  let payrollCount = 0;
  let salesTaxCount = 0;
  let t9Count = 0;
  let renditionsCount = 0;
  let taxReturnsCount = 0;
  let annualReportsCount = 0;

  for (const client of clients) {
    for (const svc of client.services) {
      if (!svc.enabled) continue;
      if (svc.key === "financials") financialsCount++;
      if (svc.key === "payroll") payrollCount++;
      if (svc.key === "sales_tax") salesTaxCount++;
      if (svc.key === "1099s") t9Count++;
      if (svc.key === "renditions") renditionsCount++;
      if (svc.key === "annual_reports") { if ((svc as any).stateRenewal) annualReportsCount++; }
      if (svc.key === "tax_returns") taxReturnsCount++;
    }

    // Financials: check if financials service exists and is active
    const fin = client.services.find((s) => s.key === "financials");
    if (fin?.enabled) {
      const status = fin.months[currentMonth];
      if (status && status !== "na" && status !== "lock") {
        monthlyFinancials++;
      }
    }

    // Behind: any service that's not done/paid/na/lock in current month
    let behind = false;
    for (const svc of client.services) {
      if (!svc.enabled) continue;
      const s = svc.months[currentMonth];
      if (s && s !== "done" && s !== "paid" && s !== "na" && s !== "lock") {
        behind = true;
        break;
      }
    }
    if (behind) behindThisMonth++;
  }

  return {
    total: clients.length,
    business: clients.filter((c) => (c.type || "").toLowerCase() === "business").length,
    personal: clients.filter((c) => (c.type || "").toLowerCase() === "personal").length,
    monthlyFinancials,
    behindThisMonth,
    financialsCount,
    payrollCount,
    salesTaxCount,
    t9Count,
    renditionsCount,
    taxReturnsCount,
    annualReportsCount,
  };
}

export function getGroups(clients: any[]): string[] {
  return [...Array.from(new Set(clients.map((c: any) => c.group)))].sort();
}

/** Get unique staff names from clients */
export function getStaffOptions(clients: any[]): string[] {
  return [...Array.from(new Set(clients.map((c: any) => c.assignedStaff)))].sort();
}
