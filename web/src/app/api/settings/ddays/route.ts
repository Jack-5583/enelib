import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { daysUntil } from "@/lib/dday";
import { formatKstMonthDayKorean } from "@/lib/kst";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ddays = await prisma.dday.findMany({ where: { ownerId: user.id }, orderBy: { targetDate: "asc" } });
  return NextResponse.json(
    ddays.map((d) => ({
      id: d.id,
      label: d.label,
      targetLabel: formatKstMonthDayKorean(d.targetDate),
      dday: daysUntil(d.targetDate),
    }))
  );
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(20),
  targetDate: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  // A "YYYY-MM-DD" value parses as UTC midnight already, matching what the @db.Date column expects.
  const dday = await prisma.dday.create({
    data: { ownerId: user.id, label: parsed.data.label.trim(), targetDate: new Date(parsed.data.targetDate) },
  });
  return NextResponse.json({ id: dday.id });
}
