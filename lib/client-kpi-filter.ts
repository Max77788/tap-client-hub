export type ClientKpi = "all" | "business" | "personal" | "financials" | "payroll" | "sales_tax" | "1099s" | "renditions" | "annual_reports";

type KpiService = { key?: string; enabled?: boolean; stateRenewal?: boolean };

type KpiClient = {
  type?: string;
  services?: KpiService[];
};

function matchesKpiService(service: KpiService, kpi: Exclude<ClientKpi, "all" | "business" | "personal">): boolean {
  if (service.key !== kpi || !service.enabled) return false;
  return kpi !== "annual_reports" || service.stateRenewal === true;
}

export function clientKpiFilter<T extends KpiClient>(clients: T[], kpi: ClientKpi): T[] {
  if (kpi === "all") return clients;
  if (kpi === "business" || kpi === "personal") {
    return clients.filter((client) => client.type?.toLowerCase() === kpi);
  }
  return clients.filter((client) => client.services?.some((service) => matchesKpiService(service, kpi)));
}
