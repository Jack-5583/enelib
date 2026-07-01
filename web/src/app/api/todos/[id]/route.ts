import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const patchSchema = z.object({
  done: z.boolean().optional(),
  memo: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo || todo.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const updated = await prisma.todo.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ id: updated.id, done: updated.done });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo || todo.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
