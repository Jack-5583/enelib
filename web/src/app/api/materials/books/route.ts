import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const tag = url.searchParams.get("tag")?.trim() || "";

  const books = await prisma.book.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { todos: true } } },
  });

  const filtered = books.filter((b) => {
    const matchesQ =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q) ||
      b.tags.some((t) => t.toLowerCase().includes(q));
    const matchesTag = !tag || tag === "전체" || b.tags.includes(tag);
    return matchesQ && matchesTag;
  });

  return NextResponse.json(
    filtered.map((b) => ({
      id: b.id,
      subject: b.subject,
      title: b.title,
      publisher: b.publisher,
      tags: b.tags,
      todoCount: b._count.todos,
    }))
  );
}

const createSchema = z.object({
  subject: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const book = await prisma.book.create({ data: { ownerId: user.id, ...parsed.data } });
  return NextResponse.json({ id: book.id });
}
