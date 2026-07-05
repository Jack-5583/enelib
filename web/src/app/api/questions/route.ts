import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab } from "@/lib/researchLabs";
import { joinNaverCafe, postNaverCafeArticle, NaverCafeError } from "@/lib/naver";

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

  const lab = getResearchLab(data.labId);
  if (!lab) return NextResponse.json({ error: "존재하지 않는 연구소입니다." }, { status: 400 });
  if (!lab.clubid || !lab.menuid) {
    return NextResponse.json({ error: "이 연구소는 아직 카페 연동 설정이 완료되지 않았습니다." }, { status: 503 });
  }
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
      subject: data.subject,
      title: data.title,
      content: data.content,
      photoUrls: data.photoDataUrls,
      postStatus: "pending",
    },
  });

  try {
    await joinNaverCafe(user.naverAccessToken, lab.clubid, user.naverNickname || user.name);
    const result = await postNaverCafeArticle({
      accessToken: user.naverAccessToken,
      clubid: lab.clubid,
      menuid: lab.menuid,
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
    await prisma.question.update({
      where: { id: question.id },
      data: { postStatus: "failed", postError: message },
    });
    return NextResponse.json({ error: message, questionId: question.id }, { status: 502 });
  }
}
