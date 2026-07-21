import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Append timelapse frames to an existing session entry (and extend its span).
const patchSchema = z.object({
  appendPhotoUrls: z.array(z.string()).max(200).optional(),
  endedAt: z.string().optional(),
  durationLabel: z.string().max(40).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const entry = await prisma.timelineEntry.findUnique({ where: { id } });
  if (!entry || entry.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  await prisma.timelineEntry.update({
    where: { id },
    data: {
      ...(parsed.data.appendPhotoUrls?.length ? { photoUrls: { push: parsed.data.appendPhotoUrls } } : {}),
      ...(parsed.data.endedAt ? { endedAt: new Date(parsed.data.endedAt) } : {}),
      ...(parsed.data.durationLabel ? { durationLabel: parsed.data.durationLabel } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

// Delete a study-verification timeline entry (its handwriting memo cascades).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await prisma.timelineEntry.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
