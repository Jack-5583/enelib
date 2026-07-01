import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const schema = z.object({ dataUrl: z.string().min(1), penColor: z.string().default("#e0362f") });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const entry = await prisma.timelineEntry.findUnique({ where: { id } });
  if (!entry || entry.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  await prisma.timelineMemo.upsert({
    where: { timelineEntryId: id },
    create: { timelineEntryId: id, dataUrl: parsed.data.dataUrl, penColor: parsed.data.penColor },
    update: { dataUrl: parsed.data.dataUrl, penColor: parsed.data.penColor },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const entry = await prisma.timelineEntry.findUnique({ where: { id } });
  if (!entry || entry.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.timelineMemo.deleteMany({ where: { timelineEntryId: id } });
  return NextResponse.json({ ok: true });
}
