import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ parentId: string }> }) {
  const { parentId } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.parentStudentLink.deleteMany({ where: { studentId: user.id, parentId } });
  return NextResponse.json({ ok: true });
}
