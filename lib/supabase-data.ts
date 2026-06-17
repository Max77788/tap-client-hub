// TAP Client Hub — Supabase Data Layer (Schema v2)
// Direct queries for client-side use. Replace mock data.ts.

import { createClient } from "@/lib/supabase/client";

export interface PayrollClient {
  id: string;
  name: string;
  type: string;
  group_owner: string;
  frequency: string;
  processor: string;
  assigned_to: string;
  periods: PayrollPeriod[];
}

export interface PayrollPeriod {
  period: string;       // "2026-06"
  label: string;        // "Jun"
  processed: number;
  expected: number;
}

export interface T9Client {
  id: string;
  name: string;
  type: string;
  group_owner: string;
  assigned_to: string;
  expected_annual: number;
  periods: T9Period[];
}

export interface T9Period {
  period: string;
  label: string;
  processed: number;
}

export interface CountSummary {
  totalClients: number;
  totalProcessed: number;
  totalExpected: number;
}

export async function fetchPayrollData(year: number): Promise<{ clients: PayrollClient[]; summary: CountSummary }> {
  const supabase = createClient();
  const yearPrefix = String(year);

  const { data, error } = await supabase
    .from("client_services")
    .select(`
      id,
      frequency,
      processor,
      assigned_to,
      client:clients!inner(id, name, type, group_owner),
      service:services!inner(code),
      period_counts(period, processed, expected)
    `)
    .eq("active", true)
    .eq("service.code", "PR")
    .filter("period_counts.period", "like", `${yearPrefix}-%`)
    .order("period", { referencedTable: "period_counts", ascending: true });

  if (error || !data) {
    console.error("Payroll fetch error:", error);
    return { clients: [], summary: { totalClients: 0, totalProcessed: 0, totalExpected: 0 } };
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const clients: PayrollClient[] = data.map((row: any) => {
    const counts = row.period_counts || [];
    // Ensure all 12 months exist
    const periods: PayrollPeriod[] = MONTHS.map((label, i) => {
      const m = `${yearPrefix}-${String(i + 1).padStart(2, "0")}`;
      const existing = counts.find((c: any) => c.period === m);
      return {
        period: m,
        label,
        processed: existing?.processed ?? 0,
        expected: existing?.expected ?? 1,
      };
    });

    return {
      id: row.id,
      name: row.client?.name ?? "",
      type: row.client?.type ?? "",
      group_owner: row.client?.group_owner ?? "",
      frequency: row.frequency ?? "monthly",
      processor: row.processor ?? "",
      assigned_to: row.assigned_to ?? "",
      periods,
    };
  });

  const totalProcessed = clients.reduce((sum, c) => sum + c.periods.reduce((s, p) => s + p.processed, 0), 0);
  const totalExpected = clients.reduce((sum, c) => sum + c.periods.reduce((s, p) => s + (p.expected || 0), 0), 0);

  return {
    clients,
    summary: { totalClients: clients.length, totalProcessed, totalExpected },
  };
}

export async function fetchT9Data(year: number): Promise<{ clients: T9Client[]; summary: CountSummary }> {
  const supabase = createClient();
  const yearPrefix = String(year);

  const { data, error } = await supabase
    .from("client_services")
    .select(`
      id,
      expected_annual,
      assigned_to,
      client:clients!inner(id, name, type, group_owner),
      service:services!inner(code),
      period_counts(period, processed)
    `)
    .eq("active", true)
    .eq("service.code", "T9")
    .filter("period_counts.period", "like", `${yearPrefix}-%`)
    .order("period", { referencedTable: "period_counts", ascending: true });

  if (error || !data) {
    console.error("1099s fetch error:", error);
    return { clients: [], summary: { totalClients: 0, totalProcessed: 0, totalExpected: 0 } };
  }

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const clients: T9Client[] = data.map((row: any) => {
    const counts = row.period_counts || [];
    const periods: T9Period[] = MONTHS.map((label, i) => {
      const m = `${yearPrefix}-${String(i + 1).padStart(2, "0")}`;
      const existing = counts.find((c: any) => c.period === m);
      return { period: m, label, processed: existing?.processed ?? 0 };
    });

    return {
      id: row.id,
      name: row.client?.name ?? "",
      type: row.client?.type ?? "",
      group_owner: row.client?.group_owner ?? "",
      assigned_to: row.assigned_to ?? "",
      expected_annual: row.expected_annual ?? 0,
      periods,
    };
  });

  const totalProcessed = clients.reduce((sum, c) => sum + c.periods.reduce((s, p) => s + p.processed, 0), 0);
  const totalExpected = clients.reduce((sum, c) => sum + c.expected_annual, 0);

  return { clients, summary: { totalClients: clients.length, totalProcessed, totalExpected } };
}
