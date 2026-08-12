export type ClientKpi = "all" | "business" | "personal" | "financials" | "payroll" | "sales_tax" | "1099s" | "renditions" | "annual_reports";

type KpiClient = {
  type?: string;
  services?: { key?: string; enabled?: boolean }[];
};

export function clientKpiFilter<T extends KpiClient>(clients: T[], kpi: ClientKpi): T[] {
  if (kpi === "all") return clients;
  if (kpi === "business" || kpi === "personal") {
    return clients.filter((client) => client.type?.toLowerCase() === kpi);
  }
  return clients.filter((client) => client.services?.some((service) => service.key === kpi && service.enabled));
}
