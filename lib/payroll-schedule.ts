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

/** Calculate the next payroll start date from cadence and the configured pay day. */
export function calculatePayrollStartDate(cadence: string, payDay: string, from = new Date()): string | null {
  if (!cadence || !payDay) return null;
  const day = normalizePayDay(payDay);
  const key = cadenceKey(cadence);
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 1);

  const dow = weekdayNumber(day);
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

export function getPayrollStartDate(cadence: string, payDay: string, stored?: string): string | null {
  return stored || calculatePayrollStartDate(cadence, payDay);
}
