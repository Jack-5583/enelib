import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { sumPoints, type OmrConfig } from "@/lib/omr";

const questionSchema = z.object({
  no: z.number().int().min(1),
  type: z.enum(["choice", "short"]),
  answer: z.string().max(8),
  points: z.number().int().min(0).max(100),
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().min(1).max(30).optional(),
  config: z.array(questionSchema).min(1).max(120).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sheet = await prisma.omrSheet.findUnique({ where: { id } });
  if (!sheet || sheet.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: sheet.id,
    title: sheet.title,
    subject: sheet.subject,
    examPaperId: sheet.examPaperId,
    config: sheet.config,
    maxScore: sheet.maxScore,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const existing = await prisma.omrSheet.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title != null) data.title = parsed.data.title;
  if (parsed.data.subject != null) data.subject = parsed.data.subject;
  if (parsed.data.config != null) {
    data.config = parsed.data.config as never;
    data.maxScore = sumPoints(parsed.data.config as OmrConfig);
  }
  await prisma.omrSheet.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await prisma.omrSheet.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
