import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { EXAM_TYPE_LABEL } from "@/lib/grades";
import { examPaperDisplayTitle } from "@/lib/examPapers";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const subject = new URL(req.url).searchParams.get("subject");
  if (!subject) return NextResponse.json({ error: "subject가 필요합니다." }, { status: 400 });

  const papers = await prisma.examPaper.findMany({
    where: {
      ownerId: user.id,
      OR: [{ kind: "SUBJECT", subject }, { kind: "FULL", subjects: { some: { subject } } }],
    },
    include: { series: true, subjects: true },
    orderBy: { createdAt: "desc" },
  });

  const existing = await prisma.exam.findMany({
    where: { ownerId: user.id, subject, examPaperId: { in: papers.map((p) => p.id) } },
    select: { examPaperId: true },
  });
  const used = new Set(existing.map((e) => e.examPaperId));

  const candidates = papers
    .filter((p) => !used.has(p.id))
    .map((p) => ({
      id: p.id,
      title: examPaperDisplayTitle(p),
      type: EXAM_TYPE_LABEL[p.type],
      examDate: p.examDate,
      maxScore: p.kind === "SUBJECT" ? p.maxScore : p.subjects.find((s) => s.subject === subject)?.maxScore ?? null,
    }));

  return NextResponse.json(candidates);
}
