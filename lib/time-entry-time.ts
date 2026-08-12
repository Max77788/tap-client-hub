export type TimeEditField = "start" | "end";

type TimeRange = {
  startedAt: string;
  endedAt: string;
};

function localDatePart(iso: string): string {
  const date = new Date(iso);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function localTimePart(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Combines a user-selected calendar date with a local wall-clock time. */
export function combineDateAndTime(date: string, sourceIso: string): string {
  return new Date(`${date}T${localTimePart(sourceIso)}:00`).toISOString();
}

export function deriveEndAt(startedAt: string, seconds: number): string {
  return new Date(new Date(startedAt).getTime() + Math.max(0, seconds) * 1000).toISOString();
}

/**
 * Updates one clock input and derives a valid time range. An end earlier than
 * the start is interpreted as an overnight entry, preserving the user's input.
 */
export function applyTimeEdit(range: TimeRange, field: TimeEditField, value: string) {
  const date = localDatePart(range.startedAt);
  const startTime = field === "start" ? value : localTimePart(range.startedAt);
  const endTime = field === "end" ? value : localTimePart(range.endedAt);
  const startedAt = new Date(`${date}T${startTime}:00`);
  let endedAt = new Date(`${date}T${endTime}:00`);
  if (endedAt.getTime() <= startedAt.getTime()) endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);

  return {
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    seconds: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
  };
}
