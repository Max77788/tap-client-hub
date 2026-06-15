// ── TAP Client Hub · TypeScript Types ──

export type ClientType = "Business" | "Personal";

export type ServiceKey =
  | "financials"
  | "payroll"
  | "sales_tax"
  | "1099s"
  | "renditions"
  | "tax_returns";

export interface ServiceConfig {
  key: ServiceKey;
  label: string;
  enabled: boolean;
  frequency: "Monthly" | "Quarterly" | "Annually" | "N/A";
  processor: string; // staff initials or name
  /** Per-month tracking status */
  months: MonthStatus[];
}

export type MonthStatus = "done" | "billed" | "paid" | "na" | "lock";

export interface Client {
  id: string;
  cid: string; // e.g. "CID-1032"
  name: string;
  type: ClientType;
  group: string; // e.g. "Terry", "Lindsay", "Misty", "Jill"
  city: string;
  state: string;
  email: string;
  phone: string;
  address: string;
  services: ServiceConfig[];
  assignedStaff: string; // primary staff member
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: string;
}

export interface VaultEntry {
  id: string;
  clientId: string;
  site: string;
  username: string;
  password: string;
  notes: string;
}

/** Lightweight work period for calendar/timeline views */
export interface WorkPeriod {
  clientId: string;
  service: ServiceKey;
  month: number; // 0-11
  status: MonthStatus;
  dueDate?: string;
  completedDate?: string;
}

/** Stats computed from the client list */
export interface ClientStats {
  total: number;
  business: number;
  personal: number;
  monthlyFinancials: number;
  behindThisMonth: number;
}
