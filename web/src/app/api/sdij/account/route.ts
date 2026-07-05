import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { encryptSecret } from "@/lib/crypto";
import { parseSdijCurl, sdijFetchOwlPost, refreshBody, SdijError } from "@/lib/sdij";

// Whether the current student has a stored SDIJ session.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const acct = await prisma.sdijAccount.findUnique({ where: { ownerId: user.id }, select: { updatedAt: true } });
  return NextResponse.json({ configured: !!acct, updatedAt: acct?.updatedAt ?? null });
}

// Save the student's SDIJ auth. The body is the "Copy as cURL" of the
// authenticated my_std.asp request; we verify it works before storing it.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 사용할 수 있습니다." }, { status: 403 });

  const { curl } = (await req.json().catch(() => ({}))) as { curl?: string };
  if (!curl || !curl.trim()) return NextResponse.json({ error: "요청 내용을 붙여넣어 주세요." }, { status: 400 });

  let auth;
  try {
    auth = parseSdijCurl(curl);
  } catch (err) {
    const message = err instanceof SdijError ? err.message : "요청을 해석하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let body = auth.body;
  try {
    const html = await sdijFetchOwlPost(auth);
    body = refreshBody(auth.body, html);
  } catch (err) {
    const message = err instanceof SdijError ? err.message : "SDIJ 조회에 실패했습니다.";
    const status = err instanceof SdijError && err.code === "auth" ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  await prisma.sdijAccount.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, cookieEnc: encryptSecret(auth.cookie), bodyEnc: encryptSecret(body) },
    update: { cookieEnc: encryptSecret(auth.cookie), bodyEnc: encryptSecret(body) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await prisma.sdijAccount.deleteMany({ where: { ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
