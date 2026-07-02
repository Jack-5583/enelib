import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const type = await prisma.examTypeOption.findUnique({ where: { id } });
  if (!type || type.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.examTypeOption.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
