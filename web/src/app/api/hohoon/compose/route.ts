import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hohoonLogin, hohoonFetchWriterName, hohoonFetchCaptcha, hohoonCredentials, newImgcode, HohoonError } from "@/lib/hohoon";

// Start a compose session: log in with the shared account, mint an imgcode,
// fetch the captcha on that live session, and persist it as a draft so the
// later image uploads and the submit reuse the exact same PHP session.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 질문할 수 있습니다." }, { status: 403 });

  let cookie: string;
  let writerName: string;
  try {
    const { userId, userPass } = hohoonCredentials();
    cookie = await hohoonLogin(userId, userPass);
    writerName = (await hohoonFetchWriterName(cookie)) || "";
  } catch (err) {
    const message = err instanceof HohoonError ? err.message : "호형훈제수학연구소 로그인에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
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
