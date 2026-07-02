import "server-only";
import { prisma } from "@/lib/prisma";
import { kstDateOnly, kstMidnightInstant, kstParts, addDaysToDateOnly, addDaysToInstant } from "@/lib/kst";
import { examPaperDisplayTitle } from "@/lib/examPapers";

/** Monday-start KST week containing `d`, as two representations:
 * - `dateOnly`: for filtering `@db.Date` columns (e.g. Todo.date)
 * - `instant`: for filtering real timestamp columns (e.g. CamSession.startedAt)
 */
export function weekRange(d: Date) {
  const { weekday } = kstParts(d); // 0=Sun..6=Sat
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;

  const startDateOnly = addDaysToDateOnly(kstDateOnly(d), diffToMonday);
  const endDateOnly = addDaysToDateOnly(startDateOnly, 7);

  const startInstant = addDaysToInstant(kstMidnightInstant(d), diffToMonday);
  const endInstant = addDaysToInstant(startInstant, 7);

  return {
    dateOnly: { start: startDateOnly, end: endDateOnly },
    instant: { start: startInstant, end: endInstant },
  };
}

export function fmtHours(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export async function computeDashboardStats(userId: string, now: Date = new Date()) {
  const today = kstDateOnly(now);
  const { dateOnly: weekDates, instant: weekInstants } = weekRange(now);

  const [weekTodos, todayTodos, camSessionsAll, camSessionsWeek] = await Promise.all([
    prisma.todo.findMany({ where: { ownerId: userId, date: { gte: weekDates.start, lt: weekDates.end } } }),
    prisma.todo.findMany({
      where: { ownerId: userId, date: today },
      include: { book: true, examPaper: { include: { series: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.camSession.findMany({ where: { ownerId: userId } }),
    prisma.camSession.findMany({
      where: { ownerId: userId, startedAt: { gte: weekInstants.start, lt: weekInstants.end } },
    }),
  ]);

  const weekTotal = weekTodos.length;
  const weekDone = weekTodos.filter((t) => t.done).length;
  const weekPct = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0;

  const bySubject = new Map<string, { done: number; total: number }>();
  for (const t of weekTodos) {
    const cur = bySubject.get(t.subject) || { done: 0, total: 0 };
    cur.total += 1;
    if (t.done) cur.done += 1;
    bySubject.set(t.subject, cur);
  }
  const weekBars = [...bySubject.entries()].map(([name, v]) => ({
    name,
    pct: v.total ? Math.round((v.done / v.total) * 100) : 0,
    label: `${v.done}/${v.total}`,
  }));

  const cumSeconds = camSessionsAll.reduce((s, c) => s + c.totalSeconds, 0);
  const weekSeconds = camSessionsWeek.reduce((s, c) => s + c.totalSeconds, 0);

  // Streak: consecutive KST days (today backwards) with a done todo or cam session.
  let streak = 0;
  const todayInstant = kstMidnightInstant(now);
  for (let i = 0; i < 365; i++) {
    const dayDateOnly = addDaysToDateOnly(today, -i);
    const dayInstantStart = addDaysToInstant(todayInstant, -i);
    const dayInstantEnd = addDaysToInstant(dayInstantStart, 1);
    const [doneTodo, camThatDay] = await Promise.all([
      prisma.todo.findFirst({ where: { ownerId: userId, done: true, date: dayDateOnly } }),
      prisma.camSession.findFirst({
        where: { ownerId: userId, startedAt: { gte: dayInstantStart, lt: dayInstantEnd }, totalSeconds: { gt: 0 } },
      }),
    ]);
    if (doneTodo || camThatDay) streak += 1;
    else break;
  }

  return {
    weekPct,
    weekDone,
    weekTotal,
    weekBars,
    cumHours: fmtHours(cumSeconds),
    weekHours: fmtHours(weekSeconds),
    avgDay: fmtHours(Math.round(weekSeconds / 7)),
    streakDays: `${streak}일`,
    todosDaily: todayTodos.map((t) => ({
      id: t.id,
      subject: t.subject,
      title: t.title,
      done: t.done,
      materialLabel: t.materialLabel || t.book?.title || (t.examPaper ? examPaperDisplayTitle(t.examPaper) : null),
    })),
    doneCount: todayTodos.filter((t) => t.done).length,
    totalCount: todayTodos.length,
  };
}
