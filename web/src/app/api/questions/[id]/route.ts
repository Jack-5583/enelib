import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab, getResearchLabBoard } from "@/lib/researchLabs";

const patchSchema = z.object({ done: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const result = await prisma.question.updateMany({
    where: { id, ownerId: user.id },
    data: { done: parsed.data.done },
  });
  if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

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
    boardName: getResearchLabBoard(question.labId, question.boardId)?.board.name || question.boardId,
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
