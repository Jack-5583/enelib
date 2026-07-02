import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const subject = new URL(req.url).searchParams.get("subject");
  if (!subject) return NextResponse.json({ error: "subject가 필요합니다." }, { status: 400 });

  const series = await prisma.examSeries.findMany({
    where: { ownerId: user.id, subject },
    include: { papers: { select: { round: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    series.map((s) => ({
      id: s.id,
      name: s.name,
      nextRound: Math.max(0, ...s.papers.map((p) => p.round ?? 0)) + 1,
    }))
  );
}
