// ── TAP Client Hub · TypeScript Types (Schema v2) ──

export type ClientType = "Business" | "Personal";
export type ServiceTracking = "stage" | "count";
export type WorkStage = "not_started" | "in_progress" | "waiting_client" | "prepared" | "done" | "na";
export type MonthStatus = "done" | "billed" | "paid" | "na" | "lock";
export type ServiceCode = "FIN" | "PR" | "STX" | "T9" | "REND" | "TAX" | "RENEWAL";
export type ServiceKey = "financials" | "payroll" | "sales_tax" | "1099s" | "renditions" | "tax_returns";

export interface ServiceConfig {
  code: ServiceCode;
  name: string;
  key?: ServiceKey;        // mock data uses key instead of code
  label?: string;           // mock data display label
  tracking: ServiceTracking;
  active: boolean;
  enabled?: boolean;        // mock data uses enabled
  frequency?: string;       // monthly, quarterly, yearly
  processor?: string;       // ADP, Toast, QuickBooks, ...
  software?: string;
  expectedAnnual?: number;  // 1099s annual target
  months?: any[];           // mock data month tracking
}

export interface ClientService {
  id: string;
  clientId: string;
  service: ServiceConfig;
  assignedTo?: string;     // staff name or ID
  active: boolean;
  enabled?: boolean;       // alias for active, used by mock data
  frequency?: string;
  // Mock-data flat fields (inline service shape)
  key?: ServiceKey;
  label?: string;
  processor?: string;
  expectedAnnual?: number;
  months?: any[];
}

export interface Client {
  id: string;
  cid: string;            // display ID e.g. "CID-1032"
  name: string;
  type: ClientType;
  entityType?: string;    // Single-member LLC, S-Corp, ...
  group?: string;         // e.g. "Terry", "Lindsay"
  status: string;
  city: string;
  state: string;
  zip?: string;
  address: string;
  email?: string;
  phone?: string;
  services: ClientService[];
  assignedStaff?: string;
}

export interface Profile {
  id: string;
  fullName: string;
  role: "admin" | "manager" | "staff" | "offshore";
  location?: string;
  reportingManager?: string;  // name
  modules: string[];
  inviteStatus: "invited" | "active" | "disabled";
  active: boolean;
}

export interface WorkPeriod {
  id: string;
  clientServiceId: string;
  period: string;          // "YYYY-MM"
  stage: WorkStage;
  doneBy?: string;
  doneAt?: string;
}

export interface PeriodCount {
  clientServiceId: string;
  period: string;          // "YYYY-MM"
  processed: number;
  expected: number;
}

export interface TimeEntry {
  id: string;
  who: string;             // profile ID
  clientId?: string;
  clientServiceId?: string;
  task?: string;
  startedAt?: string;
  seconds: number;
  note?: string;
  edited: boolean;
  editedBy?: string;
  editedAt?: string;
}

export interface Credential {
  id: string;
  clientId?: string;
  groupLabel?: string;     // "Firm-wide" when clientId is null
  portal: string;
  username?: string;
  vaultRef?: string;       // pointer to password manager
  isBank: boolean;
  linkUrl?: string;        // for bank link-outs
  notes?: string;
}

export interface ClientStats {
  total: number;
  business: number;
  personal: number;
  monthlyFinancials: number;
  behindThisMonth: number;
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: string;
}

// Mock data types
export interface VaultEntry {
  id: string;
  site: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  clientId?: string;
  isBank?: boolean;
  groupLabel?: string;
}
