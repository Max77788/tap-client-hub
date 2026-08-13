import { filterWorklistKpi } from "./worklist-kpi-filter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const clients = [
  { id: "done", services: [{ key: "financials", enabled: true, frequency: "Monthly" }] },
  { id: "ip", services: [{ key: "financials", enabled: true, frequency: "Monthly" }] },
];
const stages = { "done:financials": ["dn"], "ip:financials": ["ip"] };
const options = { serviceKey: "financials", currentMonth: 0, stages, periodCounts: {} };
assert(filterWorklistKpi(clients, "done", options)[0]?.id === "done", "done KPI filters stage");
assert(filterWorklistKpi(clients, "in_progress", options)[0]?.id === "ip", "in progress KPI filters stage");

const payrollClients = [{ id: "payroll", services: [{ key: "payroll", enabled: true, frequency: "Monthly" }] }];
const payrollOptions = { serviceKey: "payroll", variant: "payroll" as const, currentMonth: 0, stages: {}, periodCounts: { "payroll:payroll": [1] } };
assert(filterWorklistKpi(payrollClients, "runs", payrollOptions).length === 1, "runs KPI filters payroll");
assert(filterWorklistKpi(payrollClients, "month_runs", payrollOptions).length === 1, "month KPI filters payroll");
console.log("worklist-kpi-filter-regression=PASS");
