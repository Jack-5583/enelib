// CSAT (수능) date — first Thursday-ish date announced yearly; falls back to
// Nov 19 for the target year the prototype used, then auto-advances once passed.
function csatDateFor(year: number) {
  return new Date(year, 10, 19); // November is month index 10
}

export function getDday(today: Date = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let target = csatDateFor(start.getFullYear());
  if (target < start) target = csatDateFor(start.getFullYear() + 1);
  const dday = Math.max(0, Math.ceil((target.getTime() - start.getTime()) / 86400000));
  return { dday, target };
}

export function formatDdayTargetLabel(target: Date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${target.getFullYear()} 수능 · ${target.getMonth() + 1}월 ${target.getDate()}일(${days[target.getDay()]})`;
}

export function formatTodayLabel(today: Date = new Date()) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;
}
