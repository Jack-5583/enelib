import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { kstMidnightInstant, formatKstHm } from "@/lib/kst";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const start = kstMidnightInstant();
  const entries = await prisma.timelineEntry.findMany({
    where: { ownerId: user.id, capturedAt: { gte: start } },
    include: { memo: true },
    orderBy: { capturedAt: "asc" },
  });

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      time: formatKstHm(e.capturedAt),
      end: e.endedAt ? formatKstHm(e.endedAt) : formatKstHm(e.capturedAt),
      dur: e.durationLabel,
      subject: e.subject,
      title: e.todoTitle,
      photoUrl: e.photoUrl,
      hasMemo: !!e.memo,
      memoUrl: e.memo?.dataUrl || null,
    }))
  );
}

const schema = z.object({
  camSessionId: z.string().optional(),
  subject: z.string().optional(),
  todoTitle: z.string().optional(),
  durationLabel: z.string().optional(),
  photoUrl: z.string().optional(),
  segmentStart: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const entry = await prisma.timelineEntry.create({
    data: {
      ownerId: user.id,
      camSessionId: parsed.data.camSessionId || null,
      subject: parsed.data.subject || null,
      todoTitle: parsed.data.todoTitle || null,
      durationLabel: parsed.data.durationLabel || null,
      photoUrl: parsed.data.photoUrl || null,
      capturedAt: parsed.data.segmentStart ? new Date(parsed.data.segmentStart) : new Date(),
      endedAt: new Date(),
    },
  });
  return NextResponse.json({ id: entry.id });
}
