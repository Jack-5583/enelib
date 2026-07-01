import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { weekRange } from "@/lib/stats";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const range = new URL(req.url).searchParams.get("range") || "today";
  const now = new Date();

  if (range === "week") {
    const { start, end } = weekRange(now);
    const todos = await prisma.todo.findMany({
      where: { ownerId: user.id, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const buckets: { date: Date; day: string; done: number; total: number; today: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets.push({ date: d, day: days[d.getDay()], done: 0, total: 0, today: startOfDay(now).getTime() === d.getTime() });
    }
    for (const t of todos) {
      const idx = Math.round((t.date.getTime() - start.getTime()) / 86400000);
      if (buckets[idx]) {
        buckets[idx].total += 1;
        if (t.done) buckets[idx].done += 1;
      }
    }
    return NextResponse.json({
      weekLabel: `${start.getMonth() + 1}월 ${start.getDate()}일 – ${new Date(start.getTime() + 6 * 86400000).getMonth() + 1}월 ${new Date(start.getTime() + 6 * 86400000).getDate()}일`,
      days: buckets.map((b) => ({
        day: b.day,
        date: `${b.date.getMonth() + 1}/${b.date.getDate()}`,
        done: b.done,
        total: b.total,
        today: b.today,
      })),
    });
  }

  const today = startOfDay(now);
  const todos = await prisma.todo.findMany({
    where: { ownerId: user.id, date: today },
    include: { book: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    todayLabel: `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${["일", "월", "화", "수", "목", "금", "토"][today.getDay()]})`,
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

  const date = parsed.data.date ? startOfDay(new Date(parsed.data.date)) : startOfDay(new Date());
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
