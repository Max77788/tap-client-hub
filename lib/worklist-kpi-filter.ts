export type WorklistKpi =
  | "all"
  | "in_progress"
  | "waiting"
  | "delayed"
  | "done"
  | "not_started"
  | "processed"
  | "remaining"
  | "current_month"
  | "runs"
  | "max_runs"
  | "incomplete"
  | "month_runs";

type Options = {
  serviceKey: string;
  variant?: "default" | "payroll" | "t9" | "tax_returns";
  currentMonth: number;
  stages: Record<string, string[]>;
  periodCounts: Record<string, number[]>;
};

function enabledService(client: any, serviceKey: string) {
  return client.services?.find((service: any) => service.key === serviceKey && service.enabled);
}

function activeMonths(service: any): Set<number> {
  const frequency = String(service?.frequency || "Monthly").toLowerCase();
  if (frequency.includes("quarter")) return new Set([0, 3, 6, 9]);
  if (frequency.includes("annual") || frequency.includes("year")) {
    const month = Number(service?.financialsMonth);
    return new Set([Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : 11]);
  }
  return new Set(Array.from({ length: 12 }, (_, index) => index));
}

function hasStage(client: any, serviceKey: string, stage: string, stages: Record<string, string[]>) {
  const service = enabledService(client, serviceKey);
  if (!service) return false;
  const months = activeMonths(service);
  const values = stages[`${client.id}:${serviceKey}`] || [];
  return Array.from(months).some((month) => (values[month] || "") === stage);
}

export function filterWorklistKpi(clients: any[], kpi: WorklistKpi, options: Options): any[] {
  if (kpi === "all") return clients;
  const { serviceKey, variant, currentMonth, stages, periodCounts } = options;

  return clients.filter((client) => {
    const service = enabledService(client, serviceKey);
    if (!service) return false;
    const counts = periodCounts[`${client.id}:${serviceKey}`] || [];

    if (variant === "t9") {
      const expected = Number(service.expectedAnnual || 0);
      const processed = counts.reduce((sum, count) => sum + Number(count || 0), 0);
      if (kpi === "processed") return processed > 0;
      if (kpi === "remaining") return expected - processed > 0;
      if (kpi === "current_month") return Number(counts[currentMonth] || 0) > 0;
      return false;
    }

    if (variant === "payroll") {
      const runs = counts.reduce((sum, count) => sum + Number(count || 0), 0);
      const maxPerMonth = service.frequency === "Weekly" ? 4 : service.frequency?.includes("Bi-Weekly") ? 2 : service.frequency === "Semi-Monthly" ? 2 : 1;
      const maxRuns = maxPerMonth * 12;
      if (kpi === "runs") return runs > 0;
      if (kpi === "max_runs") return maxRuns > runs;
      if (kpi === "incomplete") return runs < maxRuns;
      if (kpi === "month_runs") return Number(counts[currentMonth] || 0) > 0;
      return false;
    }

    if (kpi === "in_progress") return hasStage(client, serviceKey, "ip", stages);
    if (kpi === "waiting") return hasStage(client, serviceKey, "wc", stages);
    if (kpi === "delayed") return hasStage(client, serviceKey, "dl", stages);
    if (kpi === "done" || kpi === "processed") return hasStage(client, serviceKey, "dn", stages);
    if (kpi === "not_started") {
      const months = activeMonths(service);
      const values = stages[`${client.id}:${serviceKey}`] || [];
      return months.has(currentMonth) && (values[currentMonth] || "") === "";
    }
    return false;
  });
}
