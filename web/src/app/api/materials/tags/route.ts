import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const tags = await prisma.materialTag.findMany({ where: { ownerId: user.id }, orderBy: { order: "asc" } });
  return NextResponse.json(tags.map((t) => ({ id: t.id, name: t.name })));
}

const createSchema = z.object({ name: z.string().trim().min(1).max(20) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const existing = await prisma.materialTag.findUnique({
    where: { ownerId_name: { ownerId: user.id, name: parsed.data.name } },
  });
  if (existing) return NextResponse.json({ error: "이미 있는 태그입니다." }, { status: 409 });

  const max = await prisma.materialTag.aggregate({ where: { ownerId: user.id }, _max: { order: true } });
  const tag = await prisma.materialTag.create({
    data: { ownerId: user.id, name: parsed.data.name, order: (max._max.order ?? -1) + 1 },
  });
  return NextResponse.json({ id: tag.id, name: tag.name });
}
