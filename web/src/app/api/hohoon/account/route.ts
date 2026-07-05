import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { encryptSecret } from "@/lib/crypto";
import { hohoonLogin, hohoonFetchWriterName, HohoonError } from "@/lib/hohoon";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const acct = await prisma.hohoonAccount.findUnique({ where: { ownerId: user.id } });
  return NextResponse.json({ connected: !!acct, writerName: acct?.writerName ?? null });
}

const connectSchema = z.object({
  userId: z.string().min(1).max(40),
  userPass: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 연동할 수 있습니다." }, { status: 403 });

  const parsed = connectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { userId, userPass } = parsed.data;

  // Verify the credentials by actually logging in, and grab the board nickname.
  let writerName: string | null = null;
  try {
    const cookie = await hohoonLogin(userId, userPass);
    writerName = await hohoonFetchWriterName(cookie);
  } catch (err) {
    const message = err instanceof HohoonError ? err.message : "hohoonmath 연동에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await prisma.hohoonAccount.upsert({
    where: { ownerId: user.id },
    create: {
      ownerId: user.id,
      userIdEnc: encryptSecret(userId),
      userPassEnc: encryptSecret(userPass),
      writerName,
    },
    update: {
      userIdEnc: encryptSecret(userId),
      userPassEnc: encryptSecret(userPass),
      writerName,
    },
  });

  return NextResponse.json({ connected: true, writerName });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await prisma.hohoonAccount.deleteMany({ where: { ownerId: user.id } });
  await prisma.hohoonDraft.deleteMany({ where: { ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
