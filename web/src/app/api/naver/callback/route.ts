import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exchangeNaverCode, getNaverProfile } from "@/lib/naver";

const STATE_COOKIE = "naver_oauth_state";

function redirectTo(base: string, query: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL(`${base}?${query}`, appUrl));
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return redirectTo("/", "");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectTo("/questions", "naver=error");
  }

  try {
    const token = await exchangeNaverCode(code, state);
    const profile = await getNaverProfile(token.access_token);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        naverAccessToken: token.access_token,
        naverRefreshToken: token.refresh_token,
        naverTokenExpiresAt: new Date(Date.now() + Number(token.expires_in) * 1000),
        naverNickname: profile.nickname || profile.name || null,
      },
    });
    return redirectTo("/questions", "naver=connected");
  } catch {
    return redirectTo("/questions", "naver=error");
  }
}
