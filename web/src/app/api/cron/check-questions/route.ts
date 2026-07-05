import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCommentCount } from "@/lib/naverScrape";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const questions = await prisma.question.findMany({
    where: { postStatus: "posted", cafeArticleUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let checked = 0;
  let updated = 0;
  for (const q of questions) {
    checked += 1;
    const count = await fetchCommentCount(q.cafeArticleUrl!);
    if (count != null && count > q.commentCount) {
      updated += 1;
      await prisma.question.update({
        where: { id: q.id },
        data: { commentCount: count, hasUnseenReply: true },
      });
    }
  }

  return NextResponse.json({ checked, updated });
}
