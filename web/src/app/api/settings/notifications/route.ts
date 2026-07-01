import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const settings =
    user.notificationSettings ||
    (await prisma.notificationSettings.create({ data: { userId: user.id } }));
  return NextResponse.json({
    todoEnabled: settings.todoEnabled,
    examEnabled: settings.examEnabled,
    camEnabled: settings.camEnabled,
  });
}

const schema = z.object({
  todoEnabled: z.boolean().optional(),
  examEnabled: z.boolean().optional(),
  camEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  await prisma.notificationSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
