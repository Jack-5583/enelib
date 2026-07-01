import { kstDateOnly, formatKstTodayLabel } from "@/lib/kst";

// CSAT (수능) date — first Thursday-ish date announced yearly; falls back to
// Nov 19 for the target year the prototype used, then auto-advances once passed.
function csatDateFor(year: number) {
  return new Date(Date.UTC(year, 10, 19)); // November is month index 10
}

export function getDday(today: Date = new Date()) {
  const start = kstDateOnly(today);
  let target = csatDateFor(start.getUTCFullYear());
  if (target < start) target = csatDateFor(start.getUTCFullYear() + 1);
  const dday = Math.max(0, Math.ceil((target.getTime() - start.getTime()) / 86400000));
  return { dday, target };
}

export function formatDdayTargetLabel(target: Date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${target.getUTCFullYear()} 수능 · ${target.getUTCMonth() + 1}월 ${target.getUTCDate()}일(${days[target.getUTCDay()]})`;
}

export function formatTodayLabel(today: Date = new Date()) {
  return formatKstTodayLabel(today);
}
