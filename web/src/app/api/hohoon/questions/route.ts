import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab } from "@/lib/researchLabs";

const HOHOON = getResearchLab("hohoon");

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
      kind: "hohoon" as const,
      labName: HOHOON?.name ?? "호형훈제수학연구소",
      subject: HOHOON?.subject ?? "수학",
      title: q.subject, // stored article title
      body: q.body,
      imagePaths: q.imagePaths.map((p) => `https://www.hohoonmath.com${p}`),
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
