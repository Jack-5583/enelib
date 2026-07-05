import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab } from "@/lib/researchLabs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (question.hasUnseenReply) {
    await prisma.question.update({ where: { id }, data: { hasUnseenReply: false } });
  }

  return NextResponse.json({
    id: question.id,
    labId: question.labId,
    labName: getResearchLab(question.labId)?.name || question.labId,
    subject: question.subject,
    title: question.title,
    content: question.content,
    photoUrls: question.photoUrls,
    postStatus: question.postStatus,
    postError: question.postError,
    cafeArticleUrl: question.cafeArticleUrl,
    commentCount: question.commentCount,
    createdAt: question.createdAt,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
