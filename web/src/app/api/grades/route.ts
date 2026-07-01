import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveStudentId } from "@/lib/access";
import {
  DEFAULT_SUBJECTS,
  EXAM_TYPE_LABEL,
  EXAM_TYPE_FROM_LABEL,
  getSubjectChips,
  buildSubjectTrend,
  buildSubjectSummary,
} from "@/lib/grades";

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
  const all = await prisma.exam.findMany({
    where: { ownerId: studentId, subject },
    orderBy: { date: "desc" },
  });

  const filtered = typeLabel === "전체" ? all : all.filter((e) => EXAM_TYPE_LABEL[e.type] === typeLabel);

  return NextResponse.json({
    subjectChips,
    subject,
    typeLabel,
    subjSummary: buildSubjectSummary(all.map((e) => ({ type: e.type, grade: e.grade }))),
    subjTrend: buildSubjectTrend(
      all.filter((e) => e.type === "MOCK" || e.type === "HAKPYUNG").map((e) => ({ date: e.date, grade: e.grade })),
      620,
      160
    ),
    exams: filtered.map((e) => ({
      id: e.id,
      type: EXAM_TYPE_LABEL[e.type],
      name: e.name,
      date: e.date,
      grade: e.grade,
      raw: e.raw,
      pct: e.pct,
    })),
  });
}

const createSchema = z.object({
  subject: z.string().min(1),
  type: z.enum(["모평", "학평", "내신", "사설", "수능"]),
  name: z.string().min(1),
  date: z.string().min(1),
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

  const exam = await prisma.exam.create({
    data: {
      ownerId: user.id,
      subject: parsed.data.subject,
      type: EXAM_TYPE_FROM_LABEL[parsed.data.type] as never,
      name: parsed.data.name,
      date: parsed.data.date,
      raw: parsed.data.raw,
      grade: parsed.data.grade,
      pct: parsed.data.pct ?? null,
      std: parsed.data.std ?? null,
      wrong: [],
    },
  });
  return NextResponse.json({ id: exam.id });
}
