import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateVerifyCode } from "@/lib/verifyCode";
import {
  buildOctomoMessageBody,
  getOctomoQrCode,
  OCTOMO_RECEIVE_NUMBER,
  OCTOMO_RECEIVE_NUMBER_LABEL,
} from "@/lib/octomo";

const REQUEST_TTL_MS = 5 * 60 * 1000;

const schema = z.object({
  phone: z.string().min(10),
  purpose: z.enum(["LOGIN", "SIGNUP"]),
  role: z.enum(["STUDENT", "PARENT"]).optional(),
  name: z.string().trim().min(1).max(20).optional(),
  studentCode: z.string().trim().optional(),
});

function normalizePhone(v: string) {
  return v.replace(/\D/g, "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { purpose, role, name, studentCode } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);
  if (phone.length !== 11) {
    return NextResponse.json({ error: "휴대폰 번호를 확인해 주세요." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (purpose === "LOGIN") {
    if (!existing) {
      return NextResponse.json({ error: "가입되지 않은 휴대폰 번호입니다." }, { status: 404 });
    }
  } else {
    if (existing) {
      return NextResponse.json({ error: "이미 가입된 휴대폰 번호입니다." }, { status: 409 });
    }
    if (!role) {
      return NextResponse.json({ error: "역할을 선택해 주세요." }, { status: 400 });
    }
    if (role === "PARENT") {
      const code = (studentCode || "").trim().toUpperCase();
      if (!code) {
        return NextResponse.json({ error: "학생 코드를 입력해 주세요." }, { status: 400 });
      }
      const authCode = await prisma.studentAuthCode.findUnique({ where: { code } });
      if (!authCode || authCode.usedAt || authCode.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "학생 코드가 올바르지 않거나 만료되었습니다." },
          { status: 400 }
        );
      }
    }
  }

  const verifyCode = generateVerifyCode();
  const request = await prisma.verificationRequest.create({
    data: {
      phone,
      purpose,
      verifyCode,
      pendingRole: purpose === "SIGNUP" ? role : undefined,
      pendingName: purpose === "SIGNUP" ? name || null : null,
      pendingStudentCode:
        purpose === "SIGNUP" && role === "PARENT" ? (studentCode || "").trim().toUpperCase() : null,
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
    },
  });

  const smsBody = buildOctomoMessageBody(verifyCode);
  const qrCodeDataUrl = await getOctomoQrCode(smsBody);

  return NextResponse.json({
    requestId: request.id,
    smsBody,
    qrCodeDataUrl,
    octomoNumber: OCTOMO_RECEIVE_NUMBER,
    octomoNumberLabel: OCTOMO_RECEIVE_NUMBER_LABEL,
  });
}
