import { clientKpiFilter } from "./client-kpi-filter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const clients: any[] = [
  { id: "business-fin", type: "business", services: [{ key: "financials", enabled: true }] },
  { id: "personal-pr", type: "personal", services: [{ key: "payroll", enabled: true }] },
  { id: "business-stx", type: "business", services: [{ key: "sales_tax", enabled: true }] },
  { id: "annual-renewal", type: "business", services: [{ key: "annual_reports", enabled: true, stateRenewal: true }] },
  { id: "annual-not-renewal", type: "business", services: [{ key: "annual_reports", enabled: true, stateRenewal: false }] },
  { id: "inactive-fin", type: "business", services: [{ key: "financials", enabled: false }] },
];

assert(clientKpiFilter(clients, "business").map(c => c.id).join(",") === "business-fin,business-stx,annual-renewal,annual-not-renewal,inactive-fin", "business KPI filters client type");
assert(clientKpiFilter(clients, "annual_reports").map(c => c.id).join(",") === "annual-renewal", "annual reports KPI matches the KPI count definition");
assert(clientKpiFilter(clients, "personal").map(c => c.id).join(",") === "personal-pr", "personal KPI filters client type");
assert(clientKpiFilter(clients, "financials").map(c => c.id).join(",") === "business-fin", "service KPI only includes enabled service clients");
assert(clientKpiFilter(clients, "all").length === clients.length, "total KPI leaves every client visible");
console.log("client-kpi-filter-regression=PASS");
