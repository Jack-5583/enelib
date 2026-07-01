import "server-only";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-start week range containing `d`. */
export function weekRange(d: Date) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function fmtHours(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export async function computeDashboardStats(userId: string, now: Date = new Date()) {
  const today = startOfDay(now);
  const { start, end } = weekRange(now);

  const [weekTodos, todayTodos, camSessionsAll, camSessionsWeek] = await Promise.all([
    prisma.todo.findMany({ where: { ownerId: userId, date: { gte: start, lt: end } } }),
    prisma.todo.findMany({
      where: { ownerId: userId, date: today },
      include: { book: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.camSession.findMany({ where: { ownerId: userId } }),
    prisma.camSession.findMany({ where: { ownerId: userId, startedAt: { gte: start, lt: end } } }),
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

  // Streak: consecutive days (today backwards) with a done todo or cam session.
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const [doneTodo, camThatDay] = await Promise.all([
      prisma.todo.findFirst({ where: { ownerId: userId, done: true, date: dayStart } }),
      prisma.camSession.findFirst({
        where: { ownerId: userId, startedAt: { gte: dayStart, lt: dayEnd }, totalSeconds: { gt: 0 } },
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
      materialLabel: t.materialLabel || t.book?.title || null,
    })),
    doneCount: todayTodos.filter((t) => t.done).length,
    totalCount: todayTodos.length,
  };
}
