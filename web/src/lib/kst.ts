/**
 * Korea Standard Time (UTC+9, no DST) helpers.
 *
 * Server processes (Vercel functions, this sandbox, etc.) default to UTC,
 * so `new Date().getFullYear()/getDate()/getDay()` reflect the UTC calendar
 * day, not Korea's. Since this product's "today"/"this week"/dday all mean
 * the Korean calendar day, every calendar-day calculation must go through
 * these helpers instead of the plain local-time Date getters.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Wall-clock KST fields for the given instant (defaults to now). */
export function kstParts(instant: Date = new Date()) {
  const shifted = new Date(instant.getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-indexed
    date: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(), // 0=Sun..6=Sat, per KST wall clock
  };
}

/**
 * A Date whose UTC-read calendar fields equal today's (or `instant`'s) KST
 * calendar date, at 00:00. Use this for anything stored in a Prisma
 * `@db.Date` column (e.g. Todo.date) or compared against one — Prisma
 * reads such columns by their UTC date parts, so this is the value that
 * round-trips correctly as "this KST calendar day".
 */
export function kstDateOnly(instant: Date = new Date()): Date {
  const { year, month, date } = kstParts(instant);
  return new Date(Date.UTC(year, month, date));
}

/**
 * The real absolute instant corresponding to 00:00 KST on the same
 * calendar day as `instant`. Use this (not `kstDateOnly`) for range-
 * filtering real timestamp columns (e.g. CamSession.startedAt,
 * TimelineEntry.capturedAt) by KST calendar day.
 */
export function kstMidnightInstant(instant: Date = new Date()): Date {
  const { year, month, date } = kstParts(instant);
  return new Date(Date.UTC(year, month, date) - KST_OFFSET_MS);
}

/** Adds `days` to a KST-calendar-date value produced by `kstDateOnly`. */
export function addDaysToDateOnly(dateOnly: Date, days: number): Date {
  const d = new Date(dateOnly);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Adds `days` to a KST midnight instant produced by `kstMidnightInstant`. */
export function addDaysToInstant(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 86400000);
}

const WEEKDAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function kstWeekdayLabel(instant: Date = new Date()): string {
  return WEEKDAY_LABELS_KO[kstParts(instant).weekday];
}

export function formatKstTodayLabel(instant: Date = new Date()): string {
  const { year, month, date } = kstParts(instant);
  return `${year}년 ${month + 1}월 ${date}일 (${kstWeekdayLabel(instant)})`;
}

export function formatKstMonthDay(instant: Date): string {
  const { month, date } = kstParts(instant);
  return `${month + 1}/${date}`;
}

export function formatKstMonthDayKorean(instant: Date): string {
  const { month, date } = kstParts(instant);
  return `${month + 1}월 ${date}일`;
}

export function formatKstHm(instant: Date): string {
  const { hours, minutes } = kstParts(instant);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Whole KST calendar days since the Unix epoch — safe to use as a stable
 * "day index" (e.g. for date-seeded rotation) since it only changes at KST
 * midnight, not UTC midnight. */
export function kstEpochDay(instant: Date = new Date()): number {
  return Math.floor(kstDateOnly(instant).getTime() / 86400000);
}
