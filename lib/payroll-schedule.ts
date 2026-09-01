const WEEKDAY_NUMBERS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

export const PAY_DAY_OPTIONS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "5th/20th", "15th/EOM", "16th/EOM", "25th", "EOM",
];

export function normalizePayDay(value: string): string {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase().replace(/s$/, "");
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return weekdays.includes(key) ? key.charAt(0).toUpperCase() + key.slice(1) : raw;
}

function weekdayNumber(value: string): number | undefined {
  return WEEKDAY_NUMBERS[String(value || "").trim().toLowerCase().replace(/s$/, "")];
}

function cadenceKey(value: string): string {
  return String(value || "").toLowerCase().replace(/[ _-]+/g, "");
}

/**
 * Payroll dates are business dates for the TAP team, not timestamps in the
 * viewer's browser or the server's UTC zone. Keeping the calculation as a
 * noon date-only value avoids DST boundaries while preserving the Chicago
 * calendar day in both browser and server execution.
 */
function chicagoBusinessDate(from: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"), 12, 0, 0, 0);
}

function isEndOfMonthSchedule(payDay: string): boolean {
  return normalizePayDay(payDay)
    .replace(/\s*(?:&|and)\s*/gi, "/")
    .split(/[\\/|,]+/)
    .some(part => part.trim().toLowerCase() === "eom");
}

/** Calculate the current or next payroll start date from cadence and configured pay day. */
export function calculatePayrollStartDate(cadence: string, payDay: string, from = new Date()): string | null {
  if (!cadence || !payDay) return null;
  const day = normalizePayDay(payDay);
  const key = cadenceKey(cadence);
  const d = chicagoBusinessDate(from);

  const dow = weekdayNumber(day);
  if (key === "semimonthly") {
    // Semi-monthly is paydays 1st/15th or 15th/EOM. Its processing period
    // starts on the second payday of the current period, so 15th/EOM at
    // the start of the month resolves to the current month's EOM, not the
    // following month's 15th.
    // Accept all spreadsheet variants: "15th/EOM", "15th & EOM",
    // "15th and EOM", and "1st & 15th".
    const parts = day
      .replace(/\s*(?:&|and)\s*/gi, "/")
      .split(/[\\/|,]+/)
      .map(part => part.trim().toLowerCase())
      .filter(Boolean);
    const targets = parts.map(part => {
      if (part === "eom") return 0;
      const match = part.match(/^(\d+)/);
      return match ? Number(match[1]) : null;
    }).filter((value): value is number => value !== null && value > 0 || value === 0);

    // Choose the next semi-monthly pay date, including the current month's
    // EOM when the 15th has already passed. This makes July 20 + "15th & EOM"
    // resolve to July 31, not August 15.
    for (const monthOffset of [0, 1]) {
      const year = d.getFullYear();
      const month = d.getMonth() + monthOffset;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const candidateDays = targets.map(target => target === 0 ? lastDay : Math.min(target, lastDay));
      candidateDays.sort((a, b) => a - b);
      for (const candidateDay of candidateDays) {
        if (monthOffset > 0 || candidateDay >= d.getDate()) {
          d.setMonth(month, candidateDay);
          return toISODate(d);
        }
      }
    }
    return null;
  }

  if (key === "weekly" || key === "biweeklya" || key === "biweeklyb" || key === "biweekly") {
    if (dow === undefined) return null;
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
    if (key === "biweeklyb") d.setDate(d.getDate() + 7);
    return toISODate(d);
  }

  const parts = day.split("/").map(part => part.trim().toLowerCase());
  for (let attempt = 0; attempt < 62; attempt++) {
    const dom = d.getDate();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const matches = parts.some(part => {
      if (part === "eom") return dom === lastDay;
      const numeric = part.match(/^(\d+)/);
      if (numeric) {
        const n = Number(numeric[1]);
        return dom === Math.min(n, lastDay);
      }
      return weekdayNumber(part) === d.getDay();
    });
    if (matches) return toISODate(d);
    d.setDate(d.getDate() + 1);
  }
  return null;
}

export function formatPayrollStartDate(value: string | null | undefined): string {
  if (!value) return "·";
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[3]}`;
  const short = String(value).match(/^(\d{1,2})\/(\d{1,2})/);
  return short ? `${short[1].padStart(2, "0")}/${short[2].padStart(2, "0")}` : String(value);
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getPayrollStartDate(cadence: string, payDay: string, stored?: string, from = new Date()): string | null {
  // Semi-monthly and EOM schedules are relative to the current business period.
  // Recalculate them rather than rendering an imported/stale future date.
  if (cadenceKey(cadence) === "semimonthly" || isEndOfMonthSchedule(payDay)) {
    return calculatePayrollStartDate(cadence, payDay, from);
  }
  return stored || calculatePayrollStartDate(cadence, payDay, from);
}
