import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveStudentId } from "@/lib/access";
import { DEFAULT_SUBJECTS, getSubjectChips, buildSubjectTrend, buildSubjectSummary } from "@/lib/grades";
import { examPaperDisplayTitle, maxScoreForPaperSubject } from "@/lib/examPapers";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const resolved = await resolveStudentId(user, url.searchParams.get("studentId"));
  if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const studentId = resolved.studentId;

  const subject = url.searchParams.get("subject") || DEFAULT_SUBJECTS[0];
  const typeLabel = url.searchParams.get("type") || "전체";

  const subjectChips = await getSubjectChips(studentId);
  const typeOptions = await prisma.examTypeOption.findMany({ where: { ownerId: studentId }, orderBy: { order: "asc" } });
  const all = await prisma.exam.findMany({
    where: { ownerId: studentId, subject },
    include: { examPaper: { include: { series: true } } },
    orderBy: { createdAt: "desc" },
  });
  const allShaped = all.map((e) => ({
    id: e.id,
    type: e.examPaper.type,
    name: examPaperDisplayTitle(e.examPaper),
    date: e.examPaper.examDate,
    grade: e.grade,
    raw: e.raw,
    pct: e.pct,
  }));
  const filtered = typeLabel === "전체" ? allShaped : allShaped.filter((e) => e.type === typeLabel);

  return NextResponse.json({
    subjectChips,
    subject,
    typeLabel,
    typeFilters: ["전체", ...typeOptions.map((t) => t.name)],
    subjSummary: buildSubjectSummary(all.map((e) => ({ type: e.examPaper.type, grade: e.grade }))),
    subjTrend: buildSubjectTrend(
      all
        .filter((e) => e.examPaper.type === "모평" || e.examPaper.type === "학평")
        .map((e) => ({ date: e.examPaper.examDate, grade: e.grade })),
      620,
      160
    ),
    exams: filtered,
  });
}

const createSchema = z.object({
  examPaperId: z.string().min(1),
  subject: z.string().min(1),
  raw: z.number().int().min(0),
  grade: z.number().int().min(1).max(9),
  pct: z.number().int().min(0).max(100).nullable().optional(),
  std: z.number().int().min(0).nullable().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 등록할 수 있습니다." }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const data = parsed.data;

  const paper = await prisma.examPaper.findUnique({ where: { id: data.examPaperId } });
  if (!paper || paper.ownerId !== user.id) {
    return NextResponse.json({ error: "등록된 시험지를 찾을 수 없습니다." }, { status: 404 });
  }
  if (paper.kind === "SUBJECT" && paper.subject !== data.subject) {
    return NextResponse.json({ error: "시험지 과목이 일치하지 않습니다." }, { status: 400 });
  }

  const maxScore = await maxScoreForPaperSubject(paper.id, data.subject);
  if (maxScore == null) {
    return NextResponse.json({ error: "이 시험지에는 해당 과목이 없습니다." }, { status: 400 });
  }
  if (data.raw > maxScore) {
    return NextResponse.json({ error: `원점수는 만점(${maxScore}점)을 넘을 수 없습니다.` }, { status: 400 });
  }

  const existing = await prisma.exam.findUnique({
    where: { examPaperId_subject: { examPaperId: paper.id, subject: data.subject } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 이 시험지로 등록된 성적이 있습니다." }, { status: 409 });
  }

  const exam = await prisma.exam.create({
    data: {
      ownerId: user.id,
      examPaperId: paper.id,
      subject: data.subject,
      raw: data.raw,
      grade: data.grade,
      pct: data.pct ?? null,
      std: data.std ?? null,
      wrong: [],
    },
  });
  return NextResponse.json({ id: exam.id });
}
