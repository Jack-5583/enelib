import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab, getResearchLabBoard } from "@/lib/researchLabs";
import { postNaverCafeArticle, NaverCafeError } from "@/lib/naver";

// Error codes the cafe write API returns when the account isn't (yet) a member
// eligible to post — the fix on our side is to send the student to join once
// on Naver, not to retry the write.
const MEMBERSHIP_REQUIRED_CODES = new Set(["0005", "AP002", "AP003", "AP004"]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const questions = await prisma.question.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      labId: q.labId,
      labName: getResearchLab(q.labId)?.name || q.labId,
      boardId: q.boardId,
      boardName: getResearchLabBoard(q.labId, q.boardId)?.board.name || q.boardId,
      subject: q.subject,
      title: q.title,
      postStatus: q.postStatus,
      postError: q.postError,
      cafeArticleUrl: q.cafeArticleUrl,
      commentCount: q.commentCount,
      hasUnseenReply: q.hasUnseenReply,
      createdAt: q.createdAt,
    }))
  );
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

const createSchema = z.object({
  labId: z.string().min(1),
  boardId: z.string().min(1),
  subject: z.string().min(1),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  photoDataUrls: z.array(z.string()).max(10).default([]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 질문할 수 있습니다." }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const data = parsed.data;

  const found = getResearchLabBoard(data.labId, data.boardId);
  if (!found) return NextResponse.json({ error: "존재하지 않는 연구소 또는 게시판입니다." }, { status: 400 });
  const { lab, board } = found;
  if (!user.naverAccessToken) {
    return NextResponse.json({ error: "네이버 계정을 먼저 연결해 주세요.", needsNaverConnect: true }, { status: 409 });
  }

  const images = data.photoDataUrls
    .map((url, i) => {
      const parsed = dataUrlToBuffer(url);
      if (!parsed) return null;
      const ext = parsed.contentType.split("/")[1] || "jpg";
      return { buffer: parsed.buffer, contentType: parsed.contentType, filename: `photo${i + 1}.${ext}` };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const question = await prisma.question.create({
    data: {
      ownerId: user.id,
      labId: lab.id,
      boardId: board.id,
      subject: data.subject,
      title: data.title,
      content: data.content,
      photoUrls: data.photoDataUrls,
      postStatus: "pending",
    },
  });

  try {
    const result = await postNaverCafeArticle({
      accessToken: user.naverAccessToken,
      clubid: lab.clubid,
      menuid: board.menuid,
      subject: `[TA질문] ${data.title}`,
      content: data.content.replace(/\n/g, "<br>"),
      images,
      openyn: true,
    });
    await prisma.question.update({
      where: { id: question.id },
      data: {
        postStatus: "posted",
        cafeClubUrl: result.cafeUrl,
        cafeArticleId: result.articleId,
        cafeArticleUrl: result.articleUrl,
      },
    });
    return NextResponse.json({ id: question.id, cafeArticleUrl: result.articleUrl });
  } catch (err) {
    const message = err instanceof NaverCafeError ? err.message : "카페에 글을 올리는 데 실패했습니다.";
    const needsJoin = err instanceof NaverCafeError && !!err.code && MEMBERSHIP_REQUIRED_CODES.has(err.code);
    await prisma.question.update({
      where: { id: question.id },
      data: { postStatus: "failed", postError: message },
    });
    return NextResponse.json(
      {
        error: needsJoin ? `${message} 먼저 네이버에서 해당 카페에 가입한 뒤 다시 시도해 주세요.` : message,
        questionId: question.id,
        joinUrl: needsJoin ? lab.homeUrl : undefined,
      },
      { status: 502 }
    );
  }
}
