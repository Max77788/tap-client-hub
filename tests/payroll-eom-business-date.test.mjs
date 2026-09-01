import assert from "node:assert/strict";

const { calculatePayrollStartDate, getPayrollStartDate } = await import(
  new URL("../lib/payroll-schedule.ts", import.meta.url).href,
);

const augustChicagoEom = new Date("2026-09-01T03:30:00Z"); // Aug 31, 10:30 PM in Chicago
assert.equal(
  calculatePayrollStartDate("Monthly", "EOM", augustChicagoEom),
  "2026-08-31",
  "the current Chicago EOM must remain eligible at the end of Aug 31",
);
assert.equal(
  getPayrollStartDate("Monthly", "EOM", "2026-09-30", augustChicagoEom),
  "2026-08-31",
  "a stale stored future EOM must not override the current business-period EOM",
);

const septemberChicago = new Date("2026-09-01T12:00:00Z");
assert.equal(
  calculatePayrollStartDate("Monthly", "EOM", septemberChicago),
  "2026-09-30",
  "after the Chicago business date enters September, EOM should advance to Sep 30",
);

console.log("payroll EOM business-date regression checks passed");
