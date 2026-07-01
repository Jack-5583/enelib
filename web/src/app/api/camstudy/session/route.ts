import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { kstMidnightInstant } from "@/lib/kst";

const schema = z.object({ intervalMinutes: z.number().int().min(1).max(120).default(10) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const session = await prisma.camSession.create({
    data: { ownerId: user.id, intervalMinutes: parsed.data.intervalMinutes },
  });
  return NextResponse.json({ id: session.id, startedAt: session.startedAt });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const start = kstMidnightInstant();
  const sessions = await prisma.camSession.findMany({
    where: { ownerId: user.id, startedAt: { gte: start } },
  });
  const totalSeconds = sessions.reduce((s, c) => s + c.totalSeconds, 0);
  return NextResponse.json({ sessionsToday: sessions.length, totalSeconds });
}
