import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { weekRange } from "@/lib/stats";
import {
  kstDateOnly,
  addDaysToDateOnly,
  kstWeekdayLabel,
  formatKstMonthDay,
  formatKstMonthDayKorean,
  formatKstTodayLabel,
} from "@/lib/kst";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const range = new URL(req.url).searchParams.get("range") || "today";
  const now = new Date();

  if (range === "week") {
    const { start, end } = weekRange(now).dateOnly;
    const todos = await prisma.todo.findMany({
      where: { ownerId: user.id, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });
    const today = kstDateOnly(now);
    const buckets: { date: Date; day: string; done: number; total: number; today: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDaysToDateOnly(start, i);
      buckets.push({ date: d, day: kstWeekdayLabel(d), done: 0, total: 0, today: today.getTime() === d.getTime() });
    }
    for (const t of todos) {
      const idx = Math.round((t.date.getTime() - start.getTime()) / 86400000);
      if (buckets[idx]) {
        buckets[idx].total += 1;
        if (t.done) buckets[idx].done += 1;
      }
    }
    return NextResponse.json({
      weekLabel: `${formatKstMonthDayKorean(start)} – ${formatKstMonthDayKorean(addDaysToDateOnly(start, 6))}`,
      days: buckets.map((b) => ({
        day: b.day,
        date: formatKstMonthDay(b.date),
        done: b.done,
        total: b.total,
        today: b.today,
      })),
    });
  }

  const dateParam = new URL(req.url).searchParams.get("date");
  const target = dateParam ? kstDateOnly(new Date(dateParam)) : kstDateOnly(now);
  const todos = await prisma.todo.findMany({
    where: { ownerId: user.id, date: target },
    include: { book: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    todayLabel: formatKstTodayLabel(target),
    isToday: target.getTime() === kstDateOnly(now).getTime(),
    todos: todos.map((t) => ({
      id: t.id,
      subject: t.subject,
      title: t.title,
      done: t.done,
      memo: t.memo,
      photoUrl: t.photoUrl,
      materialLabel: t.materialLabel || t.book?.title || null,
    })),
  });
}

const createSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(1),
  date: z.string().optional(),
  bookId: z.string().optional(),
  materialLabel: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  // A "YYYY-MM-DD" value from a <input type="date"> parses as UTC midnight
  // already, which is exactly what a @db.Date column expects — no shifting
  // needed. Only the "no date given" default needs to resolve to KST today.
  const date = parsed.data.date ? new Date(parsed.data.date) : kstDateOnly(new Date());
  const todo = await prisma.todo.create({
    data: {
      ownerId: user.id,
      subject: parsed.data.subject,
      title: parsed.data.title,
      date,
      bookId: parsed.data.bookId || null,
      materialLabel: parsed.data.materialLabel || null,
    },
  });
  return NextResponse.json({ id: todo.id });
}
