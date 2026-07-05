import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { gradeOmr, type OmrConfig, type OmrAnswers } from "@/lib/omr";

const gradeSchema = z.object({
  answers: z.record(z.string(), z.string()),
  save: z.boolean().optional(),
});

// Grade a set of marked answers against the sheet's key and (optionally) store
// the run. Returns the score breakdown + per-question correctness for review.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = gradeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const sheet = await prisma.omrSheet.findUnique({ where: { id } });
  if (!sheet || sheet.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const config = sheet.config as unknown as OmrConfig;
  if (config.some((q) => q.answer === "")) {
    return NextResponse.json({ error: "정답이 모두 입력되지 않았습니다. 먼저 정답을 완성해주세요." }, { status: 400 });
  }

  const result = gradeOmr(config, parsed.data.answers as OmrAnswers);

  if (parsed.data.save !== false) {
    await prisma.omrResult.create({
      data: {
        ownerId: user.id,
        sheetId: sheet.id,
        answers: parsed.data.answers as never,
        raw: result.raw,
        total: result.total,
        correctCount: result.correctCount,
        wrongNos: result.wrongNos.map(String),
      },
    });
  }

  return NextResponse.json(result);
}
