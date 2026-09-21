export const OPERATION_TIMEZONE = "America/Sao_Paulo";

const partsFormatter = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let found = partsFormatter.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    partsFormatter.set(timeZone, found);
  }
  return found;
}

/** Milliseconds the zone is ahead of UTC at that exact instant (handles DST if it ever returns). */
export function zoneOffsetMs(instant: Date, timeZone = OPERATION_TIMEZONE) {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(instant).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "-03:00" — used when a value must travel as an explicit offset (WhatsApp links, ICS, logs). */
export function zoneOffsetLabel(instant: Date, timeZone = OPERATION_TIMEZONE) {
  const total = Math.round(zoneOffsetMs(instant, timeZone) / 60000);
  const sign = total < 0 ? "-" : "+";
  const abs = Math.abs(total);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * Turns a wall-clock value typed by the team ("2026-09-22" or "2026-09-22T14:00") into the
 * matching UTC instant for the operation timezone. Values that already carry an offset or a
 * trailing Z are absolute and parsed as-is, so links and payloads produced elsewhere keep working.
 */
export function parseOperationDateTime(value: string, options: { endOfDay?: boolean; timeZone?: string } = {}) {
  const timeZone = options.timeZone || OPERATION_TIMEZONE;
  const raw = value.trim();
  if (!raw) return null;
  const wall = WALL_CLOCK.exec(raw);
  if (!wall) {
    const absolute = new Date(raw);
    return Number.isFinite(absolute.getTime()) ? absolute : null;
  }
  const [, year, month, day, hour, minute, second] = wall;
  const hasTime = hour !== undefined;
  const naive = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    hasTime ? Number(hour) : options.endOfDay ? 23 : 12,
    hasTime ? Number(minute) : options.endOfDay ? 59 : 0,
    hasTime ? Number(second || 0) : options.endOfDay ? 59 : 0,
  );
  // Two passes so the offset is read at the resulting instant, not at the naive one.
  let instant = naive - zoneOffsetMs(new Date(naive), timeZone);
  instant = naive - zoneOffsetMs(new Date(instant), timeZone);
  const result = new Date(instant);
  if (!Number.isFinite(result.getTime())) return null;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  return result;
}

/** "YYYY-MM-DD" as seen in the operation timezone — the value a date input expects. */
export function toDateInput(instant: Date | string | null | undefined, timeZone = OPERATION_TIMEZONE) {
  if (!instant) return "";
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(date);
}

/** "HH:mm" (24h) as seen in the operation timezone. */
export function toTimeInput(instant: Date | string | null | undefined, timeZone = OPERATION_TIMEZONE) {
  if (!instant) return "";
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function todayInput(timeZone = OPERATION_TIMEZONE) {
  return toDateInput(new Date(), timeZone);
}

/** Adds whole days to a "YYYY-MM-DD" value without ever crossing a timezone boundary. */
export function shiftDateInput(value: string, days: number) {
  const base = value && WALL_CLOCK.test(value) ? value : todayInput();
  const [year, month, day] = base.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return moved.toISOString().slice(0, 10);
}

/** "22/09/2026" from a "YYYY-MM-DD" input value. */
export function displayDateInput(value: string) {
  return WALL_CLOCK.test(value) ? value.slice(0, 10).split("-").reverse().join("/") : "";
}

export const formatOperationDate = (instant: Date | string, timeZone = OPERATION_TIMEZONE) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone }).format(instant instanceof Date ? instant : new Date(instant));

export const formatOperationDateTime = (instant: Date | string, timeZone = OPERATION_TIMEZONE) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone }).format(instant instanceof Date ? instant : new Date(instant));

/** 30-minute slots for the time picker, in 24h format. */
export function timeSlots(from = 7, to = 20, stepMinutes = 30) {
  const slots: string[] = [];
  for (let minutes = from * 60; minutes <= to * 60; minutes += stepMinutes)
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  return slots;
}
