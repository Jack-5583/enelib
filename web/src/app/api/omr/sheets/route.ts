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
  section: z.string().max(20).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(120),
  subject: z.string().trim().min(1).max(30),
  examPaperId: z.string().nullable().optional(),
  config: z.array(questionSchema).min(1, "문항을 1개 이상 추가해주세요.").max(120),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sheets = await prisma.omrSheet.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return NextResponse.json(
    sheets.map((s) => {
      const config = s.config as unknown as OmrConfig;
      const last = s.results[0];
      return {
        id: s.id,
        title: s.title,
        subject: s.subject,
        questionCount: config.length,
        maxScore: s.maxScore,
        keyComplete: config.every((q) => q.answer !== ""),
        lastResult: last ? { raw: last.raw, total: last.total, correctCount: last.correctCount, createdAt: last.createdAt } : null,
        createdAt: s.createdAt,
      };
    })
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 사용할 수 있습니다." }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });

  const { title, subject, examPaperId, config } = parsed.data;
  const sheet = await prisma.omrSheet.create({
    data: {
      ownerId: user.id,
      title,
      subject,
      examPaperId: examPaperId ?? null,
      config: config as never,
      maxScore: sumPoints(config as OmrConfig),
    },
  });
  return NextResponse.json({ id: sheet.id });
}
