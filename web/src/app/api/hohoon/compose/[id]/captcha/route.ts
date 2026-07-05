import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hohoonFetchCaptcha } from "@/lib/hohoon";

// Refresh the captcha image on the draft's existing session (e.g. it expired or
// is unreadable). Same session, so a newly-fetched answer stays valid to submit.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const draft = await prisma.hohoonDraft.findUnique({ where: { id } });
  if (!draft || draft.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const captcha = await hohoonFetchCaptcha(draft.phpsessid);
    return NextResponse.json({ captcha });
  } catch {
    return NextResponse.json({ error: "캡차 이미지를 불러오지 못했습니다." }, { status: 502 });
  }
}
