import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getResearchLab, getResearchLabBoard } from "@/lib/researchLabs";
import {
  buildInclassContentHtml,
  inclassContext,
  inclassPostQuestion,
  inclassFindArticleId,
  inclassViewUrl,
  InclassError,
} from "@/lib/inclass";

const attachmentSchema = z.object({
  fileUpNM: z.string().min(1),
  fileKey: z.string().min(1),
  url: z.string().min(1),
});

const createSchema = z.object({
  labId: z.string().min(1),
  boardId: z.string().min(1),
  subject: z.string().trim().min(1, "제목을 입력해주세요.").max(200), // question title
  body: z.string().trim().min(1, "내용을 입력해주세요."),
  secret: z.boolean().optional(),
  groupCode: z.string().max(60).optional(),
  attachments: z.array(attachmentSchema).max(3).optional(),
});

/** Resolve a stored question's lab/board display info, defaulting old rows
 * (before labId existed) to 박종민수학연구소. */
function labInfo(labId: string | null, boardId: string | null) {
  const id = labId ?? "parkjongmin";
  const lab = getResearchLab(id);
  const board = boardId ? getResearchLabBoard(id, boardId)?.board : lab?.boards[0];
  return {
    labName: lab?.name ?? "박종민수학연구소",
    subject: lab?.subject ?? "수학",
    boardName: board?.name ?? null,
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const questions = await prisma.inclassQuestion.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    questions.map((q) => {
      const info = labInfo(q.labId, q.boardId);
      return {
        id: q.id,
        kind: "inclass" as const,
        labName: info.labName,
        boardName: info.boardName,
        subject: info.subject,
        title: q.subject,
        body: q.body,
        imagePaths: q.imagePaths,
        articleUrl: q.articleUrl,
        answerText: q.answerText,
        answerImages: q.answerImages,
        answeredAt: q.answeredAt,
        commentCount: q.commentCount,
        hasUnseenReply: q.hasUnseenReply,
        done: q.done,
        createdAt: q.createdAt,
      };
    })
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 질문할 수 있습니다." }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  }
  const { labId, boardId, subject, body, secret, groupCode, attachments } = parsed.data;

  if (!getResearchLabBoard(labId, boardId)) {
    return NextResponse.json({ error: "잘못된 연구소/게시판입니다." }, { status: 400 });
  }

  let ctx;
  try {
    ctx = inclassContext(labId, boardId);
    await inclassPostQuestion(ctx, { title: subject, contentHtml: buildInclassContentHtml(body), secret, groupCode, attachments });
  } catch (err) {
    const message = err instanceof InclassError ? err.message : "질문 등록에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const articleId = await inclassFindArticleId(ctx, subject).catch(() => null);

  const q = await prisma.inclassQuestion.create({
    data: {
      ownerId: user.id,
      labId,
      boardId,
      subject,
      body,
      imagePaths: (attachments ?? []).map((a) => a.url),
      articleId,
      articleUrl: articleId ? inclassViewUrl(ctx, articleId) : null,
    },
  });
  return NextResponse.json({ id: q.id });
}
