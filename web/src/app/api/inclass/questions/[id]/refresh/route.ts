import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { inclassContext, inclassFindArticleId, inclassFetchAnswer, inclassViewUrl } from "@/lib/inclass";

// On-demand fetch of the teacher's reply for one question (used when the student
// opens the detail). Clears the unseen-reply flag since they're looking.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = await prisma.inclassQuestion.findUnique({ where: { id } });
  if (!q || q.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const ctx = inclassContext(q.labId ?? "parkjongmin", q.boardId ?? undefined);
    let articleId = q.articleId;
    if (!articleId) articleId = await inclassFindArticleId(ctx, q.subject);
    if (!articleId) return NextResponse.json({ answerText: q.answerText, answeredAt: q.answeredAt });

    const answer = await inclassFetchAnswer(ctx, articleId);
    const updated = await prisma.inclassQuestion.update({
      where: { id: q.id },
      data: {
        articleId,
        articleUrl: inclassViewUrl(ctx, articleId),
        answerText: answer?.text ?? q.answerText,
        answerImages: answer ? answer.images : q.answerImages,
        answeredAt: answer ? (q.answeredAt ?? new Date()) : q.answeredAt,
        commentCount: answer ? 1 : q.commentCount,
        hasUnseenReply: false,
      },
    });
    return NextResponse.json({ answerText: updated.answerText, answerImages: updated.answerImages, answeredAt: updated.answeredAt });
  } catch {
    if (q.hasUnseenReply) await prisma.inclassQuestion.update({ where: { id: q.id }, data: { hasUnseenReply: false } }).catch(() => {});
    return NextResponse.json({ answerText: q.answerText, answerImages: q.answerImages, answeredAt: q.answeredAt });
  }
}
