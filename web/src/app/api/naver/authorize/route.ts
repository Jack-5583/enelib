import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { getNaverAuthorizeUrl, naverConfigured } from "@/lib/naver";

const STATE_COOKIE = "naver_oauth_state";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  if (!naverConfigured()) {
    return NextResponse.json({ error: "네이버 로그인이 아직 설정되지 않았습니다." }, { status: 500 });
  }

  const state = randomBytes(16).toString("base64url");
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(getNaverAuthorizeUrl(state));
}
