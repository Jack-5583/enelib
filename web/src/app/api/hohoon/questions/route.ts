import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const questions = await prisma.hohoonQuestion.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      subject: q.subject,
      body: q.body,
      imagePaths: q.imagePaths.map((p) => `https://www.hohoonmath.com${p}`),
      articleUrl: q.articleUrl,
      commentCount: q.commentCount,
      hasUnseenReply: q.hasUnseenReply,
      createdAt: q.createdAt,
    }))
  );
}
