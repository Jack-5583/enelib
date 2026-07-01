import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id },
    include: { student: true },
    orderBy: { linkedAt: "desc" },
  });
  return NextResponse.json(
    links.map((l) => ({
      studentId: l.studentId,
      name: l.student.name,
      schoolLabel: l.student.schoolLabel,
      linkedAt: l.linkedAt,
    }))
  );
}

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const code = parsed.data.code.trim().toUpperCase();
  const authCode = await prisma.studentAuthCode.findUnique({ where: { code } });
  if (!authCode || authCode.usedAt || authCode.expiresAt < new Date()) {
    return NextResponse.json({ error: "코드가 올바르지 않거나 만료되었습니다." }, { status: 400 });
  }

  const existing = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId: authCode.studentId } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 연동된 학생입니다." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.parentStudentLink.create({ data: { parentId: user.id, studentId: authCode.studentId } }),
    prisma.studentAuthCode.update({
      where: { id: authCode.id },
      data: { usedAt: new Date(), usedByParentId: user.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
