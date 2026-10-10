export const PLATFORM_TIME_ZONE = "America/Sao_Paulo";

type DateLike = Date | string | number;

function asDate(value: DateLike) {
  return value instanceof Date ? value : new Date(value);
}

function valid(value: DateLike) {
  const date = asDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: DateLike) {
  const date = valid(value);
  if (!date) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PLATFORM_TIME_ZONE,
    dateStyle: "short",
  }).format(date);
}

export function formatLongDate(value: DateLike) {
  const date = valid(value);
  if (!date) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PLATFORM_TIME_ZONE,
    dateStyle: "long",
  }).format(date);
}

export function formatTime(value: DateLike) {
  const date = valid(value);
  if (!date) return "Hora inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PLATFORM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(value: DateLike) {
  const date = valid(value);
  if (!date) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PLATFORM_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatLongDateTime(value: DateLike) {
  const date = valid(value);
  if (!date) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PLATFORM_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function dayStamp(value: DateLike) {
  const date = valid(value);
  if (!date) return Number.NaN;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day));
}

export function calendarDayOffset(value: DateLike, now: DateLike = new Date()) {
  const target = dayStamp(value);
  const current = dayStamp(now);
  if (!Number.isFinite(target) || !Number.isFinite(current)) return 0;
  return Math.round((target - current) / 86_400_000);
}

export type ActionTiming = {
  bucket: "overdue" | "today" | "upcoming";
  dayOffset: number;
  label: string;
};

export function actionTiming(value: DateLike, now: DateLike = new Date()): ActionTiming {
  const dayOffset = calendarDayOffset(value, now);
  if (dayOffset < 0) {
    const days = Math.abs(dayOffset);
    return {
      bucket: "overdue",
      dayOffset,
      label: `Atrasada há ${days} ${days === 1 ? "dia" : "dias"}`,
    };
  }
  if (dayOffset === 0) return { bucket: "today", dayOffset, label: "Hoje" };
  if (dayOffset === 1) return { bucket: "upcoming", dayOffset, label: "Amanhã" };
  return { bucket: "upcoming", dayOffset, label: `Em ${dayOffset} dias` };
}
