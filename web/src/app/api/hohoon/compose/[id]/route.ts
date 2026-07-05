import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hohoonPostArticle, buildArticleHtml, hohoonFindArticleId, hohoonViewUrl, HohoonError } from "@/lib/hohoon";

const submitSchema = z.object({
  subject: z.string().min(1).max(100),
  body: z.string().min(1).max(5000),
  captcha: z.string().min(1).max(10),
});

// Submit the draft: build the HTML (text + already-uploaded images) and post it
// on the draft's session with the user-typed captcha. On success, mirror it to
// a HohoonQuestion and clear the draft.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const draft = await prisma.hohoonDraft.findUnique({ where: { id } });
  if (!draft || draft.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = submitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
  const { subject, body, captcha } = parsed.data;

  try {
    await hohoonPostArticle({
      cookie: draft.phpsessid,
      imgcode: draft.imgcode,
      writerName: draft.writerName,
      subject,
      contentHtml: buildArticleHtml(body, draft.imagePaths),
      captcha,
    });
  } catch (err) {
    // The site's own message (e.g. "스팸방지가 틀렸습니다") comes back verbatim so
    // the student can just re-enter the captcha without losing their draft.
    const message = err instanceof HohoonError ? err.message : "글 등록에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Find the just-posted article's id (for later answer scraping) while the
  // session is still alive. Best-effort — a post shouldn't fail over this.
  let articleId: string | null = null;
  try {
    articleId = await hohoonFindArticleId(draft.phpsessid, subject);
  } catch {
    articleId = null;
  }

  const question = await prisma.hohoonQuestion.create({
    data: {
      ownerId: user.id,
      subject,
      body,
      imagePaths: draft.imagePaths,
      articleId,
      articleUrl: articleId ? hohoonViewUrl(articleId) : null,
    },
  });
  await prisma.hohoonDraft.delete({ where: { id: draft.id } }).catch(() => {});

  return NextResponse.json({ id: question.id });
}

// Cancel/discard the draft.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await prisma.hohoonDraft.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
