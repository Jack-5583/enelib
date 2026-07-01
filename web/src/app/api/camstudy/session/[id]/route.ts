import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const schema = z.object({ totalSeconds: z.number().int().min(0) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const session = await prisma.camSession.findUnique({ where: { id } });
  if (!session || session.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  await prisma.camSession.update({
    where: { id },
    data: { totalSeconds: parsed.data.totalSeconds, endedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
