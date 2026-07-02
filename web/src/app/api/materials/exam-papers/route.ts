import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { EXAM_TYPE_FROM_LABEL } from "@/lib/grades";
import { examPaperListItemDTO } from "@/lib/examPapers";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() || "";

  const papers = await prisma.examPaper.findMany({
    where: { ownerId: user.id },
    include: { series: true, subjects: true },
    orderBy: { createdAt: "desc" },
  });

  const filtered = papers.filter((p) => {
    if (!q) return true;
    const haystack = [p.title, p.subject, p.series?.name].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });

  return NextResponse.json(filtered.map(examPaperListItemDTO));
}

const subjectPayload = z.object({
  kind: z.literal("SUBJECT"),
  subject: z.string().min(1),
  type: z.enum(["모평", "학평", "내신", "사설", "수능"]),
  examDate: z.string().min(1),
  maxScore: z.number().int().min(1).max(999),
  mode: z.enum(["standalone", "series"]),
  title: z.string().trim().optional(),
  seriesId: z.string().optional(),
  newSeriesName: z.string().trim().optional(),
  round: z.number().int().min(1).max(99).optional(),
});

const fullPayload = z.object({
  kind: z.literal("FULL"),
  title: z.string().min(1),
  type: z.enum(["모평", "학평", "내신", "사설", "수능"]),
  examDate: z.string().min(1),
  subjects: z.array(z.object({ subject: z.string().min(1), maxScore: z.number().int().min(1).max(999) })).min(1),
});

const createSchema = z.discriminatedUnion("kind", [subjectPayload, fullPayload]);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const data = parsed.data;
  const type = EXAM_TYPE_FROM_LABEL[data.type] as never;

  if (data.kind === "FULL") {
    const paper = await prisma.examPaper.create({
      data: {
        ownerId: user.id,
        kind: "FULL",
        title: data.title.trim(),
        type,
        examDate: data.examDate,
        subjects: { create: data.subjects.map((s) => ({ subject: s.subject, maxScore: s.maxScore })) },
      },
    });
    return NextResponse.json({ id: paper.id });
  }

  // SUBJECT kind
  let seriesId: string | null = null;
  let title = data.title?.trim() || "";

  if (data.mode === "series") {
    if (!data.round) {
      return NextResponse.json({ error: "회차를 입력해 주세요." }, { status: 400 });
    }
    let series = data.seriesId
      ? await prisma.examSeries.findUnique({ where: { id: data.seriesId } })
      : null;
    if (series && series.ownerId !== user.id) {
      return NextResponse.json({ error: "잘못된 시리즈입니다." }, { status: 403 });
    }
    if (!series) {
      const name = data.newSeriesName?.trim();
      if (!name) return NextResponse.json({ error: "시리즈 이름을 입력해 주세요." }, { status: 400 });
      series = await prisma.examSeries.upsert({
        where: { ownerId_subject_name: { ownerId: user.id, subject: data.subject, name } },
        create: { ownerId: user.id, subject: data.subject, name },
        update: {},
      });
    }
    seriesId = series.id;
    title = series.name; // display title is derived from series+round; keep a sane fallback in `title`.
  } else if (!title) {
    return NextResponse.json({ error: "시험지 이름을 입력해 주세요." }, { status: 400 });
  }

  const paper = await prisma.examPaper.create({
    data: {
      ownerId: user.id,
      kind: "SUBJECT",
      subject: data.subject,
      seriesId,
      round: data.mode === "series" ? data.round : null,
      title,
      type,
      examDate: data.examDate,
      maxScore: data.maxScore,
    },
  });
  return NextResponse.json({ id: paper.id });
}
