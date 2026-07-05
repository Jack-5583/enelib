import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { hohoonLogin, hohoonFetchWriterName, hohoonFetchCaptcha, newImgcode, HohoonError } from "@/lib/hohoon";

// Start a compose session: log in with the stored credentials, mint an imgcode,
// fetch the captcha on that live session, and persist it as a draft so the
// later image uploads and the submit reuse the exact same PHP session.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 질문할 수 있습니다." }, { status: 403 });

  const acct = await prisma.hohoonAccount.findUnique({ where: { ownerId: user.id } });
  if (!acct) return NextResponse.json({ error: "hohoonmath 계정을 먼저 연동해 주세요.", needsConnect: true }, { status: 409 });

  let cookie: string;
  let writerName: string;
  try {
    cookie = await hohoonLogin(decryptSecret(acct.userIdEnc), decryptSecret(acct.userPassEnc));
    writerName = acct.writerName || (await hohoonFetchWriterName(cookie)) || "";
  } catch (err) {
    const message = err instanceof HohoonError ? err.message : "hohoonmath 로그인에 실패했습니다.";
    return NextResponse.json({ error: message, needsConnect: true }, { status: 409 });
  }

  let captcha: string;
  try {
    captcha = await hohoonFetchCaptcha(cookie);
  } catch {
    return NextResponse.json({ error: "캡차 이미지를 불러오지 못했습니다." }, { status: 502 });
  }

  // One in-flight draft per user is enough; clear any stale ones.
  await prisma.hohoonDraft.deleteMany({ where: { ownerId: user.id } });
  const draft = await prisma.hohoonDraft.create({
    data: { ownerId: user.id, phpsessid: cookie, imgcode: newImgcode(), writerName },
  });

  return NextResponse.json({ draftId: draft.id, writerName, captcha });
}
