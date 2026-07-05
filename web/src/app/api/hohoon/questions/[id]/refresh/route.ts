import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hohoonLogin, hohoonFindArticleId, hohoonFetchAnswer, hohoonViewUrl, hohoonCredentials } from "@/lib/hohoon";

// On-demand fetch of the teacher's answer for one question (used when the
// student opens the detail). Clears the unseen-reply flag since they're looking.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = await prisma.hohoonQuestion.findUnique({ where: { id } });
  if (!q || q.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const { userId, userPass } = hohoonCredentials();
    const cookie = await hohoonLogin(userId, userPass);

    let articleId = q.articleId;
    if (!articleId) {
      articleId = await hohoonFindArticleId(cookie, q.subject);
    }
    if (!articleId) {
      return NextResponse.json({ answerText: q.answerText, answeredAt: q.answeredAt });
    }

    const answer = await hohoonFetchAnswer(cookie, articleId);
    const updated = await prisma.hohoonQuestion.update({
      where: { id: q.id },
      data: {
        articleId,
        articleUrl: hohoonViewUrl(articleId),
        answerText: answer?.text ?? q.answerText,
        answeredAt: answer ? (q.answeredAt ?? new Date()) : q.answeredAt,
        commentCount: answer ? 1 : 0,
        hasUnseenReply: false,
      },
    });
    return NextResponse.json({ answerText: updated.answerText, answeredAt: updated.answeredAt });
  } catch {
    // Don't surface login hiccups here; just return what we already have.
    if (q.hasUnseenReply) await prisma.hohoonQuestion.update({ where: { id: q.id }, data: { hasUnseenReply: false } }).catch(() => {});
    return NextResponse.json({ answerText: q.answerText, answeredAt: q.answeredAt });
  }
}
