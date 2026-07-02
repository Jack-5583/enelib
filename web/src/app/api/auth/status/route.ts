import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOctomoVerification } from "@/lib/octomo";
import { createSession } from "@/lib/session";
import { generateStudentAuthCode } from "@/lib/studentCode";
import { DEFAULT_MATERIAL_TAGS, DEFAULT_EXAM_TYPES } from "@/lib/grades";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const request = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "존재하지 않는 요청입니다." }, { status: 404 });

  if (request.status === "VERIFIED") {
    // Already completed (e.g. duplicate poll) — just ensure a session exists.
    const user = await prisma.user.findUnique({ where: { phone: request.phone } });
    if (user) await createSession(user.id);
    return NextResponse.json({ status: "verified", role: user?.role });
  }

  if (request.expiresAt < new Date()) {
    await prisma.verificationRequest.update({ where: { id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ status: "expired" });
  }

  const result = await checkOctomoVerification(
    request.phone,
    request.verifyCode,
    request.createdAt.toISOString()
  );

  if (result.status !== "verified") {
    if (request.status === "PENDING") {
      await prisma.verificationRequest.update({ where: { id }, data: { status: "CHECKING" } });
    }
    return NextResponse.json({ status: result.status, reason: result.reason });
  }

  // First time seeing verified — finalize login/signup.
  let user = await prisma.user.findUnique({ where: { phone: request.phone } });

  if (!user) {
    if (request.purpose !== "SIGNUP" || !request.pendingRole) {
      return NextResponse.json({ error: "가입 정보가 유효하지 않습니다." }, { status: 400 });
    }

    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: request.phone,
          role: request.pendingRole!,
          name: request.pendingName || (request.pendingRole === "PARENT" ? "학부모" : "학생"),
          notificationSettings: { create: {} },
        },
      });

      if (request.pendingRole === "STUDENT") {
        // Give every new student a fresh linking code right away.
        await tx.studentAuthCode.create({
          data: {
            studentId: created.id,
            code: generateStudentAuthCode(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        // Seed the customizable material-tag and exam-type pickers so they aren't empty.
        await tx.materialTag.createMany({
          data: DEFAULT_MATERIAL_TAGS.map((name, order) => ({ ownerId: created.id, name, order })),
        });
        await tx.examTypeOption.createMany({
          data: DEFAULT_EXAM_TYPES.map((name, order) => ({ ownerId: created.id, name, order })),
        });
      }

      if (request.pendingRole === "PARENT" && request.pendingStudentCode) {
        const authCode = await tx.studentAuthCode.findUnique({
          where: { code: request.pendingStudentCode },
        });
        if (authCode && !authCode.usedAt && authCode.expiresAt > new Date()) {
          await tx.parentStudentLink.create({
            data: { parentId: created.id, studentId: authCode.studentId },
          });
          await tx.studentAuthCode.update({
            where: { id: authCode.id },
            data: { usedAt: new Date(), usedByParentId: created.id },
          });
        }
      }

      return created;
    });
  }

  await prisma.verificationRequest.update({
    where: { id },
    data: { status: "VERIFIED", verifiedAt: new Date() },
  });
  await createSession(user.id);

  return NextResponse.json({ status: "verified", role: user.role });
}
