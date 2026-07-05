import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab } from "@/lib/researchLabs";
import { fetchComments } from "@/lib/naverScrape";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (question.postStatus !== "posted" || !question.cafeArticleId) {
    return NextResponse.json({ comments: null });
  }

  const clubid = getResearchLab(question.labId)?.clubid;
  if (!clubid) return NextResponse.json({ comments: null });

  const comments = await fetchComments(clubid, question.cafeArticleId);
  return NextResponse.json({ comments });
}
