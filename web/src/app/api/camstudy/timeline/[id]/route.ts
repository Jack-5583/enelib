import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Delete a study-verification timeline entry (its handwriting memo cascades).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await prisma.timelineEntry.deleteMany({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
