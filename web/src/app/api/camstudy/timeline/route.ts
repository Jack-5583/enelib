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
  segmentEnd: z.string().optional(),
});

function formatDuration(ms: number): string | null {
  const mins = Math.round(ms / 60000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const capturedAt = parsed.data.segmentStart ? new Date(parsed.data.segmentStart) : new Date();
  // A manual end time wins; else a live session ends "now"; else no span.
  const endedAt = parsed.data.segmentEnd
    ? new Date(parsed.data.segmentEnd)
    : parsed.data.camSessionId
      ? new Date()
      : capturedAt;

  // Derive a focus-duration label from a manual start/end span if none was given.
  let durationLabel = parsed.data.durationLabel || null;
  if (!durationLabel && endedAt.getTime() > capturedAt.getTime()) {
    durationLabel = formatDuration(endedAt.getTime() - capturedAt.getTime());
  }

  const entry = await prisma.timelineEntry.create({
    data: {
      ownerId: user.id,
      camSessionId: parsed.data.camSessionId || null,
      subject: parsed.data.subject || null,
      todoTitle: parsed.data.todoTitle || null,
      durationLabel,
      photoUrls: parsed.data.photoUrls,
      capturedAt,
      endedAt,
    },
  });
  return NextResponse.json({ id: entry.id });
}
