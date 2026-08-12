import {
  applyTimeEdit,
  combineDateAndTime,
  deriveEndAt,
} from "./time-entry-time";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const start = "2026-08-12T11:05:00.000Z";
const end = "2026-08-12T11:10:00.000Z";

const startChanged = applyTimeEdit({ startedAt: start, endedAt: end }, "start", "10:45");
assert(startChanged.startedAt === "2026-08-12T10:45:00.000Z", "start edit preserves the selected date and sets the new start time");
assert(startChanged.endedAt === end, "start edit preserves the entered end time");
assert(startChanged.seconds === 25 * 60, "start edit recalculates duration from start and end");

const endChanged = applyTimeEdit({ startedAt: start, endedAt: end }, "end", "11:20");
assert(endChanged.startedAt === start, "end edit preserves start time");
assert(endChanged.endedAt === "2026-08-12T11:20:00.000Z", "end edit sets the new end time");
assert(endChanged.seconds === 15 * 60, "end edit recalculates duration from start and end");

const dateChangedStart = combineDateAndTime("2026-08-13", start);
const dateChangedEnd = combineDateAndTime("2026-08-13", end);
assert(dateChangedStart === "2026-08-13T11:05:00.000Z", "date edit keeps the existing start clock time");
assert(dateChangedEnd === "2026-08-13T11:10:00.000Z", "date edit keeps the existing end clock time");
assert(deriveEndAt(start, 5 * 60) === end, "stored seconds derive the displayed end time");

console.log("time-entry-time-regression=PASS");
