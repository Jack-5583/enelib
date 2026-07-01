import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.parentStudentLink.deleteMany({ where: { parentId: user.id, studentId } });
  return NextResponse.json({ ok: true });
}
