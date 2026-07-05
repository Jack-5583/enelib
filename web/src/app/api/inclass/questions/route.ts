import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab } from "@/lib/researchLabs";
import { buildInclassContentHtml, inclassPostQuestion, inclassFindArticleId, inclassViewUrl, InclassError } from "@/lib/inclass";

const LAB = getResearchLab("parkjongmin");

const createSchema = z.object({
  subject: z.string().trim().min(1, "제목을 입력해주세요.").max(200), // question title
  body: z.string().trim().min(1, "내용을 입력해주세요."),
  secret: z.boolean().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const questions = await prisma.inclassQuestion.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      kind: "inclass" as const,
      labName: LAB?.name ?? "박종민수학연구소",
      subject: LAB?.subject ?? "수학",
      title: q.subject,
      body: q.body,
      imagePaths: q.imagePaths,
      articleUrl: q.articleUrl,
      answerText: q.answerText,
      answeredAt: q.answeredAt,
      commentCount: q.commentCount,
      hasUnseenReply: q.hasUnseenReply,
      done: q.done,
      createdAt: q.createdAt,
    }))
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 질문할 수 있습니다." }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  }
  const { subject, body, secret } = parsed.data;

  try {
    await inclassPostQuestion({ title: subject, contentHtml: buildInclassContentHtml(body), secret });
  } catch (err) {
    const message = err instanceof InclassError ? err.message : "질문 등록에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const articleId = await inclassFindArticleId(subject).catch(() => null);

  const q = await prisma.inclassQuestion.create({
    data: {
      ownerId: user.id,
      subject,
      body,
      articleId,
      articleUrl: articleId ? inclassViewUrl(articleId) : null,
    },
  });
  return NextResponse.json({ id: q.id });
}
