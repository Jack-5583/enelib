import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { inclassContext, inclassFindArticleId, inclassFetchAnswer, inclassFetchFile } from "@/lib/inclass";

// Diagnostic: open in a browser (while logged into the app) to see, for your
// most recent inclass question, whether the reply/images parse and whether the
// server can actually download each attachment. Safe: only your own data.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = await prisma.inclassQuestion.findFirst({
    where: { ownerId: user.id, labId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!q) return NextResponse.json({ error: "no inclass question found" });

  const out: Record<string, unknown> = {
    questionId: q.id,
    subject: q.subject,
    labId: q.labId,
    boardId: q.boardId,
    storedArticleId: q.articleId,
    storedAnswerTextLen: q.answerText?.length ?? 0,
    storedAnswerImages: q.answerImages,
  };

  try {
    const ctx = inclassContext(q.labId ?? "parkjongmin", q.boardId ?? undefined);
    const articleId = q.articleId ?? (await inclassFindArticleId(ctx, q.subject));
    out.resolvedArticleId = articleId;

    if (articleId) {
      const answer = await inclassFetchAnswer(ctx, articleId);
      out.liveAnswerFound = !!answer;
      out.liveAnswerTextLen = answer?.text.length ?? 0;
      out.liveAnswerImages = answer?.images ?? [];

      const probes: unknown[] = [];
      for (const url of answer?.images ?? []) {
        try {
          const res = await inclassFetchFile(ctx, url);
          const ab = await res.arrayBuffer();
          const b = Buffer.from(ab);
          probes.push({
            url,
            status: res.status,
            ok: res.ok,
            contentType: res.headers.get("content-type"),
            contentDisposition: res.headers.get("content-disposition"),
            bytes: b.length,
            firstBytesHex: b.subarray(0, 12).toString("hex"),
          });
        } catch (e) {
          probes.push({ url, error: String(e) });
        }
      }
      out.fileProbes = probes;
    }
  } catch (e) {
    out.error = String(e);
  }

  return NextResponse.json(out);
}
