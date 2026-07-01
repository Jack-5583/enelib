import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() || "";

  const papers = await prisma.examPaper.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const filtered = papers.filter(
    (p) => !q || p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q)
  );

  return NextResponse.json(
    filtered.map((p) => ({ id: p.id, subject: p.subject, title: p.title, tag: p.tag, examDate: p.examDate }))
  );
}

const createSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(1),
  tag: z.string().min(1),
  examDate: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const paper = await prisma.examPaper.create({ data: { ownerId: user.id, ...parsed.data } });
  return NextResponse.json({ id: paper.id });
}
