// ── TAP Client Hub · Mock Data Module ──

import type { Client, ClientStats, ClientType, MonthStatus, ServiceConfig, ServiceKey, VaultEntry } from "./types";

// ── Staff pool ──
export const STAFF = [
  { id: "s1", name: "Terry Anderson", initials: "TA", role: "Partner" },
  { id: "s2", name: "Lindsay Brooks", initials: "LB", role: "Manager" },
  { id: "s3", name: "Misty Cole", initials: "MC", role: "Staff Accountant" },
  { id: "s4", name: "Jill Dawson", initials: "JD", role: "Staff Accountant" },
  { id: "s5", name: "Aaron Edwards", initials: "AE", role: "Staff Accountant" },
  { id: "s6", name: "Paula Rivers", initials: "PR", role: "Admin" },
] as const;

// ── Month labels ──
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Service labels & pill colors ──
export const SERVICE_META: Record<ServiceKey, { label: string; pillColor: string; pillBg: string }> = {
  financials:  { label: "Financials",  pillColor: "var(--green)",       pillBg: "var(--green-soft)"  },
  payroll:     { label: "Payroll",     pillColor: "var(--blue)",        pillBg: "var(--blue-soft)"   },
  sales_tax:   { label: "Sales Tax",   pillColor: "var(--amber)",       pillBg: "var(--amber-soft)"  },
  "1099s":     { label: "1099s",       pillColor: "#8b6914",            pillBg: "#f5edd6"             },
  renditions:  { label: "Renditions",  pillColor: "#1e5631",            pillBg: "#e3efe6"             },
  tax_returns: { label: "Tax Returns", pillColor: "#5a2d82",            pillBg: "#f0e6f6"             },
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

// ── 14 Demo Clients (matching demo design) ──
export const CLIENTS: any[] = [
  {
    id: "c1",
    cid: "CID-1032",
    name: "303A Properties LLC",
    type: "Business",
    group: "Terry",
    city: "Austin",
    state: "TX",
    email: "contact@303aproperties.com",
    phone: "(512) 555-0101",
    address: "1201 Congress Ave, Austin, TX 78701",
    assignedStaff: "Terry Anderson",
    services: [
      svc("financials", true, "Monthly", "TA",   ["done","done","done","billed","done","done","done","done","paid","done","billed","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","billed","done","done","done","done","paid","done","na"]),
      svc("sales_tax",  true, "Monthly", "LB",   ["done","done","done","done","done","paid","done","done","done","paid","done","na"]),
      svc("1099s",      false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
      svc("renditions", true, "Annually", "LB",  ["na","na","lock","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
      svc("tax_returns",true, "Annually", "TA",  ["lock","done","paid","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c2",
    cid: "CID-1045",
    name: "Aaron Edwards PLLC",
    type: "Business",
    group: "Lindsay",
    city: "Dallas",
    state: "TX",
    email: "aaron@edwardspllc.com",
    phone: "(214) 555-0202",
    address: "2001 Ross Ave, Dallas, TX 75201",
    assignedStaff: "Lindsay Brooks",
    services: [
      svc("financials", true, "Monthly", "LB",   ["done","done","done","done","done","billed","done","done","paid","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","billed","done","done","done","done","paid","done","done","na","na"]),
      svc("sales_tax",  false,"Monthly", "LB",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("1099s",      true, "Annually", "AE",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
      svc("renditions", false,"Annually", "LB",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "LB",  ["lock","lock","done","paid","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c3",
    cid: "CID-1078",
    name: "Bluebonnet Enterprises Inc.",
    type: "Business",
    group: "Misty",
    city: "San Antonio",
    state: "TX",
    email: "admin@bluebonnetent.com",
    phone: "(210) 555-0303",
    address: "300 Alamo Plaza, San Antonio, TX 78205",
    assignedStaff: "Misty Cole",
    services: [
      svc("financials", true, "Monthly", "MC",   ["done","done","done","billed","done","done","done","paid","done","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","done","done","billed","done","paid","done","na","na"]),
      svc("sales_tax",  true, "Monthly", "MC",   ["done","done","billed","done","done","paid","done","done","done","paid","na","na"]),
      svc("1099s",      true, "Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","done","na"]),
      svc("renditions", false,"Annually", "MC",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "TA",  ["lock","done","paid","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c4",
    cid: "CID-1102",
    name: "Brazos River Partners",
    type: "Business",
    group: "Terry",
    city: "Houston",
    state: "TX",
    email: "info@brazosriver.com",
    phone: "(713) 555-0404",
    address: "800 Capitol St, Houston, TX 77002",
    assignedStaff: "Terry Anderson",
    services: [
      svc("financials", true, "Monthly", "TA",   ["done","done","done","done","billed","done","done","paid","done","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","billed","done","done","done","done","paid","done","done","done","na","na"]),
      svc("sales_tax",  true, "Monthly", "LB",   ["done","done","done","done","paid","done","done","done","paid","done","na","na"]),
      svc("1099s",      false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("renditions", true, "Annually", "TA",  ["na","na","lock","done","paid","lock","lock","lock","lock","lock","lock","na"]),
      svc("tax_returns",true, "Annually", "TA",  ["lock","lock","lock","done","paid","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c5",
    cid: "CID-1118",
    name: "Cindy's Creations LLC",
    type: "Business",
    group: "Jill",
    city: "Fort Worth",
    state: "TX",
    email: "cindy@creationsllc.com",
    phone: "(817) 555-0505",
    address: "500 Main St, Fort Worth, TX 76102",
    assignedStaff: "Jill Dawson",
    services: [
      svc("financials", true, "Quarterly", "JD", ["done","na","na","done","na","na","billed","na","na","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","done","billed","done","done","paid","done","na","na"]),
      svc("sales_tax",  true, "Quarterly", "JD", ["done","na","na","done","na","na","done","na","na","paid","na","na"]),
      svc("1099s",      true, "Annually", "AE",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","done","na"]),
      svc("renditions", false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "LB",  ["lock","done","paid","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c6",
    cid: "CID-1130",
    name: "David Morrison",
    type: "Personal",
    group: "Lindsay",
    city: "Plano",
    state: "TX",
    email: "david.morrison@gmail.com",
    phone: "(972) 555-0606",
    address: "1401 Preston Rd, Plano, TX 75093",
    assignedStaff: "Lindsay Brooks",
    services: [
      svc("financials", false,"Monthly", "LB",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("payroll",    false,"Monthly", "MC",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("sales_tax",  false,"Monthly", "LB",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("1099s",      false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("renditions", false,"Annually", "LB",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "LB",  ["lock","lock","done","paid","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c7",
    cid: "CID-1142",
    name: "El Paso Mercantile LP",
    type: "Business",
    group: "Misty",
    city: "El Paso",
    state: "TX",
    email: "office@epmercantile.com",
    phone: "(915) 555-0707",
    address: "221 N Kansas St, El Paso, TX 79901",
    assignedStaff: "Misty Cole",
    services: [
      svc("financials", true, "Monthly", "MC",   ["done","done","done","done","done","billed","done","paid","done","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","billed","done","done","paid","done","done","done","na","na"]),
      svc("sales_tax",  true, "Monthly", "MC",   ["done","done","billed","done","done","paid","done","done","paid","done","na","na"]),
      svc("1099s",      true, "Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","done","na"]),
      svc("renditions", true, "Annually", "MC",  ["na","na","lock","done","paid","lock","lock","lock","lock","lock","lock","na"]),
      svc("tax_returns",true, "Annually", "MC",  ["lock","done","paid","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c8",
    cid: "CID-1156",
    name: "Frost & Gardner CPAs",
    type: "Business",
    group: "Terry",
    city: "Lubbock",
    state: "TX",
    email: "info@frostgardner.com",
    phone: "(806) 555-0808",
    address: "1500 Broadway, Lubbock, TX 79401",
    assignedStaff: "Terry Anderson",
    services: [
      svc("financials", true, "Monthly", "TA",   ["done","done","done","done","done","billed","done","done","paid","done","na","na"]),
      svc("payroll",    false,"Monthly", "MC",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("sales_tax",  false,"Monthly", "LB",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("1099s",      false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("renditions", false,"Annually", "TA",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "TA",  ["lock","lock","done","paid","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c9",
    cid: "CID-1170",
    name: "Greenway Energy Services",
    type: "Business",
    group: "Lindsay",
    city: "Midland",
    state: "TX",
    email: "billing@greenwayenergy.com",
    phone: "(432) 555-0909",
    address: "310 W Wall St, Midland, TX 79701",
    assignedStaff: "Lindsay Brooks",
    services: [
      svc("financials", true, "Monthly", "LB",   ["done","done","billed","done","done","done","paid","done","done","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","done","billed","done","paid","done","done","na","na"]),
      svc("sales_tax",  true, "Monthly", "LB",   ["done","billed","done","done","paid","done","done","done","paid","done","na","na"]),
      svc("1099s",      true, "Annually", "AE",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","done","na"]),
      svc("renditions", true, "Annually", "LB",  ["na","na","lock","lock","done","paid","lock","lock","lock","lock","lock","na"]),
      svc("tax_returns",true, "Annually", "LB",  ["lock","done","paid","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c10",
    cid: "CID-1184",
    name: "Hill Country Ranches LLC",
    type: "Business",
    group: "Jill",
    city: "Fredericksburg",
    state: "TX",
    email: "ranch@hillcountry.com",
    phone: "(830) 555-1010",
    address: "100 Main St, Fredericksburg, TX 78624",
    assignedStaff: "Jill Dawson",
    services: [
      svc("financials", true, "Quarterly", "JD", ["done","na","na","done","na","na","billed","na","na","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","billed","done","paid","done","done","done","na","na"]),
      svc("sales_tax",  false,"Monthly", "LB",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("1099s",      false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("renditions", false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "JD",  ["lock","lock","done","paid","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c11",
    cid: "CID-1198",
    name: "Isabel Torres CPA",
    type: "Personal",
    group: "Misty",
    city: "McAllen",
    state: "TX",
    email: "isabel@torrescpa.com",
    phone: "(956) 555-1111",
    address: "500 S Broadway, McAllen, TX 78501",
    assignedStaff: "Misty Cole",
    services: [
      svc("financials", false,"Monthly", "MC",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("payroll",    false,"Monthly", "MC",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("sales_tax",  false,"Monthly", "MC",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("1099s",      false,"Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("renditions", false,"Annually", "MC",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "MC",  ["lock","lock","done","paid","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c12",
    cid: "CID-1212",
    name: "Juniper Capital Group",
    type: "Business",
    group: "Terry",
    city: "Amarillo",
    state: "TX",
    email: "info@junipercapital.com",
    phone: "(806) 555-1212",
    address: "600 S Tyler St, Amarillo, TX 79101",
    assignedStaff: "Terry Anderson",
    services: [
      svc("financials", true, "Monthly", "TA",   ["done","done","done","done","done","done","billed","done","paid","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","done","billed","done","paid","done","done","na","na"]),
      svc("sales_tax",  true, "Monthly", "LB",   ["billed","done","done","done","paid","done","done","done","paid","done","na","na"]),
      svc("1099s",      true, "Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","done","na"]),
      svc("renditions", true, "Annually", "TA",  ["na","na","lock","lock","done","paid","lock","lock","lock","lock","lock","na"]),
      svc("tax_returns",true, "Annually", "TA",  ["lock","lock","done","paid","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c13",
    cid: "CID-1226",
    name: "Katy Professional Park",
    type: "Business",
    group: "Lindsay",
    city: "Katy",
    state: "TX",
    email: "management@katypropark.com",
    phone: "(281) 555-1313",
    address: "24020 Westheimer Pkwy, Katy, TX 77494",
    assignedStaff: "Lindsay Brooks",
    services: [
      svc("financials", true, "Monthly", "LB",   ["done","done","done","done","billed","done","paid","done","done","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","billed","done","done","done","paid","done","done","done","done","na","na"]),
      svc("sales_tax",  false,"Monthly", "LB",   ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("1099s",      true, "Annually", "AE",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","done","na"]),
      svc("renditions", true, "Annually", "LB",  ["na","na","lock","done","paid","lock","lock","lock","lock","lock","lock","na"]),
      svc("tax_returns",true, "Annually", "LB",  ["lock","done","paid","lock","lock","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
  {
    id: "c14",
    cid: "CID-1240",
    name: "Longhorn Logistics Inc.",
    type: "Business",
    group: "Misty",
    city: "Waco",
    state: "TX",
    email: "dispatch@longhornlogistics.com",
    phone: "(254) 555-1414",
    address: "425 Austin Ave, Waco, TX 76701",
    assignedStaff: "Misty Cole",
    services: [
      svc("financials", true, "Monthly", "MC",   ["done","done","done","billed","done","done","done","done","paid","done","na","na"]),
      svc("payroll",    true, "Monthly", "MC",   ["done","done","done","done","done","billed","done","paid","done","done","na","na"]),
      svc("sales_tax",  true, "Monthly", "MC",   ["done","done","done","done","billed","done","paid","done","paid","done","na","na"]),
      svc("1099s",      true, "Annually", "JD",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","done","done","na"]),
      svc("renditions", false,"Annually", "MC",  ["lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock","lock"]),
      svc("tax_returns",true, "Annually", "MC",  ["lock","lock","lock","done","paid","lock","lock","lock","lock","lock","lock","na"]),
    ],
  },
];

// ── Password Vault Entries ──
export const VAULT_ENTRIES: VaultEntry[] = [
  {
    id: "v1",
    clientId: "c1",
    site: "IRS E-Services",
    username: "tap-admin",
    password: "P@ssw0rd!2024",
    notes: "EFIN: 123456. Used for transcript pulls and POA uploads.",
  },
  {
    id: "v2",
    clientId: "c1",
    site: "QuickBooks Online",
    username: "303a.bookkeeper@gmail.com",
    password: "Qb!Secure789",
    notes: "View-only access. Login as accountant user.",
  },
  {
    id: "v3",
    clientId: "c1",
    site: "TAP Bank",
    username: "",
    password: "",
    notes: "Business checking — routing + account on file in TAP Bank portal.",
  },
  {
    id: "v4",
    clientId: "c4",
    site: "IRS E-Services",
    username: "tap-brazos",
    password: "T@xPr0!2024",
    notes: "Transcript requests for entity-level filings.",
  },
  {
    id: "v5",
    clientId: "c4",
    site: "QuickBooks Online",
    username: "brazos@tap-associates.com",
    password: "Riv3rP@rtn3rs",
    notes: "Accountant access.",
  },
  {
    id: "v6",
    clientId: "c4",
    site: "TAP Bank",
    username: "",
    password: "",
    notes: "Operating account. See TAP Bank for full details.",
  },
  {
    id: "v7",
    clientId: "c9",
    site: "IRS E-Services",
    username: "tap-greenway",
    password: "Gr33nEn3rgy!",
    notes: "Transcript access for payroll tax verification.",
  },
  {
    id: "v8",
    clientId: "c9",
    site: "Texas Comptroller",
    username: "greenway-ftp",
    password: "TxComp2024!",
    notes: "Webfile login for sales tax filing.",
  },
  {
    id: "v9",
    clientId: "c12",
    site: "QuickBooks Online",
    username: "juniper@tap-associates.com",
    password: "JuniperC@p1tal",
    notes: "Full accountant access.",
  },
  {
    id: "v10",
    clientId: "c12",
    site: "TAP Bank",
    username: "",
    password: "",
    notes: "Capital reserve account. Details in TAP Bank.",
  },
  {
    id: "v11",
    clientId: "c2",
    site: "IRS E-Services",
    username: "tap-aaron",
    password: "PL!C2024Tax",
    notes: "Transcripts for PLLC return.",
  },
  {
    id: "v12",
    clientId: "c14",
    site: "QuickBooks Online",
    username: "longhorn@tap-associates.com",
    password: "L0ngH0rnL0g!",
    notes: "View-only access.",
  },
];

// ── Helper: get entries grouped by client name ──
export function getVaultEntriesByClient(): Map<string, VaultEntry[]> {
  const map = new Map<string, VaultEntry[]>();
  for (const entry of VAULT_ENTRIES) {
    const client = CLIENTS.find((c) => c.id === entry.clientId);
    const key = client ? client.name : "Unassigned";
    const existing = map.get(key) || [];
    existing.push(entry);
    map.set(key, existing);
  }
  return map;
}

// ── Query helpers ──

export function filterClients(
  clients: Client[],
  opts: {
    search?: string;
    type?: ClientType | "All";
    group?: string;
    staff?: string;
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

  return result;
}

export function getClientById(id: string): Client | undefined {
  return CLIENTS.find((c) => c.id === id);
}

export function getStats(clients: Client[]): ClientStats {
  const currentMonth = new Date().getMonth(); // 0-indexed

  let monthlyFinancials = 0;
  let behindThisMonth = 0;

  for (const client of clients) {
    // Financials: check if financials service exists and is active
    const fin = client.services.find((s) => s.key === "financials");
    if (fin?.enabled) {
      // Count clients that have financials processing in the current month
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
    business: clients.filter((c) => c.type === "Business").length,
    personal: clients.filter((c) => c.type === "Personal").length,
    monthlyFinancials,
    behindThisMonth,
  };
}

export function getGroups(clients: any[]): string[] {
  return [...Array.from(new Set(clients.map((c: any) => c.group)))].sort();
}

/** Get unique staff names from clients */
export function getStaffOptions(clients: any[]): string[] {
  return [...Array.from(new Set(clients.map((c: any) => c.assignedStaff)))].sort();
}
