import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCommentCount } from "@/lib/naverScrape";
import { getResearchLab } from "@/lib/researchLabs";
import { hohoonLogin, hohoonFindArticleId, hohoonFetchAnswer, hohoonViewUrl, hohoonCredentials } from "@/lib/hohoon";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Naver cafe comment counts.
  const questions = await prisma.question.findMany({
    where: { postStatus: "posted", cafeArticleId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let checked = 0;
  let updated = 0;
  for (const q of questions) {
    const clubid = getResearchLab(q.labId)?.clubid;
    if (!clubid) continue;
    checked += 1;
    const count = await fetchCommentCount(clubid, q.cafeArticleId!);
    if (count != null && count > q.commentCount) {
      updated += 1;
      await prisma.question.update({
        where: { id: q.id },
        data: { commentCount: count, hasUnseenReply: true },
      });
    }
  }

  // hohoonmath teacher answers (one shared login for all of them).
  let hohoonChecked = 0;
  let hohoonUpdated = 0;
  const hohoonPending = await prisma.hohoonQuestion.findMany({
    where: { done: false, answeredAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (hohoonPending.length > 0) {
    try {
      const { userId, userPass } = hohoonCredentials();
      const cookie = await hohoonLogin(userId, userPass);
      for (const q of hohoonPending) {
        hohoonChecked += 1;
        const articleId = q.articleId || (await hohoonFindArticleId(cookie, q.subject));
        if (!articleId) continue;
        const answer = await hohoonFetchAnswer(cookie, articleId);
        if (answer) {
          hohoonUpdated += 1;
          await prisma.hohoonQuestion.update({
            where: { id: q.id },
            data: {
              articleId,
              articleUrl: hohoonViewUrl(articleId),
              answerText: answer.text,
              answeredAt: new Date(),
              commentCount: 1,
              hasUnseenReply: true,
            },
          });
        } else if (!q.articleId && articleId) {
          await prisma.hohoonQuestion.update({ where: { id: q.id }, data: { articleId, articleUrl: hohoonViewUrl(articleId) } });
        }
      }
    } catch {
      // shared login failed this run; try again next tick
    }
  }

  return NextResponse.json({ checked, updated, hohoonChecked, hohoonUpdated });
}
