import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { kstMidnightInstant, addDaysToInstant, formatKstHm } from "@/lib/kst";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const dateParam = new URL(req.url).searchParams.get("date");
  const start = kstMidnightInstant(dateParam ? new Date(dateParam) : new Date());
  const end = addDaysToInstant(start, 1);

  const entries = await prisma.timelineEntry.findMany({
    where: { ownerId: user.id, capturedAt: { gte: start, lt: end } },
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
      photoUrls: e.photoUrls,
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
  photoUrls: z.array(z.string()).default([]),
  segmentStart: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  // Auto-captures (from a live session) always end "now"; manual multi-photo
  // uploads have no real duration, so they just end when they start.
  const capturedAt = parsed.data.segmentStart ? new Date(parsed.data.segmentStart) : new Date();
  const endedAt = parsed.data.camSessionId ? new Date() : capturedAt;

  const entry = await prisma.timelineEntry.create({
    data: {
      ownerId: user.id,
      camSessionId: parsed.data.camSessionId || null,
      subject: parsed.data.subject || null,
      todoTitle: parsed.data.todoTitle || null,
      durationLabel: parsed.data.durationLabel || null,
      photoUrls: parsed.data.photoUrls,
      capturedAt,
      endedAt,
    },
  });
  return NextResponse.json({ id: entry.id });
}
