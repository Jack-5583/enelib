import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { examPaperDisplayTitle } from "@/lib/examPapers";

async function canRead(userId: string, role: "STUDENT" | "PARENT", ownerId: string) {
  if (userId === ownerId) return true;
  if (role !== "PARENT") return false;
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: userId, studentId: ownerId } },
  });
  return !!link;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const exam = await prisma.exam.findUnique({ where: { id }, include: { examPaper: { include: { series: true } } } });
  if (!exam || !(await canRead(user.id, user.role, exam.ownerId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: exam.id,
    subject: exam.subject,
    type: exam.examPaper.type,
    name: examPaperDisplayTitle(exam.examPaper),
    date: exam.examPaper.examDate,
    grade: exam.grade,
    raw: exam.raw,
    pct: exam.pct,
    std: exam.std,
    wrong: exam.wrong,
    memo: exam.memo,
  });
}

const patchSchema = z.object({
  memo: z.string().nullable().optional(),
  wrong: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  await prisma.exam.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
