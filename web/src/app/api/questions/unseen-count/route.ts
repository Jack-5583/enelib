import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const count = await prisma.question.count({ where: { ownerId: user.id, hasUnseenReply: true } });
  return NextResponse.json({ count });
}
