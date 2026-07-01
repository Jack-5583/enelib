import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { generateStudentAuthCode } from "@/lib/studentCode";

const CODE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let code = await prisma.studentAuthCode.findFirst({
    where: { studentId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!code) {
    code = await prisma.studentAuthCode.create({
      data: { studentId: user.id, code: generateStudentAuthCode(), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
  }
  return NextResponse.json({ code: code.code, expiresAt: code.expiresAt });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const code = await prisma.studentAuthCode.create({
    data: { studentId: user.id, code: generateStudentAuthCode(), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  return NextResponse.json({ code: code.code, expiresAt: code.expiresAt });
}
