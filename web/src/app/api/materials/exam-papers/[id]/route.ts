import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { EXAM_TYPE_FROM_LABEL } from "@/lib/grades";

const patchSchema = z.object({
  type: z.enum(["모평", "학평", "내신", "사설", "수능"]).optional(),
  examDate: z.string().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  maxScore: z.number().int().min(1).max(999).optional(),
  subjects: z.array(z.object({ subject: z.string().min(1), maxScore: z.number().int().min(1).max(999) })).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const paper = await prisma.examPaper.findUnique({ where: { id } });
  if (!paper || paper.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const data = parsed.data;

  await prisma.examPaper.update({
    where: { id },
    data: {
      type: data.type ? (EXAM_TYPE_FROM_LABEL[data.type] as never) : undefined,
      examDate: data.examDate,
      // A series-linked paper's display title is derived from the series name; ignore direct edits.
      title: data.title && !paper.seriesId ? data.title : undefined,
      maxScore: paper.kind === "SUBJECT" ? data.maxScore : undefined,
    },
  });

  if (paper.kind === "FULL" && data.subjects) {
    for (const s of data.subjects) {
      await prisma.examPaperSubject.updateMany({
        where: { examPaperId: id, subject: s.subject },
        data: { maxScore: s.maxScore },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const paper = await prisma.examPaper.findUnique({ where: { id } });
  if (!paper || paper.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.examPaper.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
