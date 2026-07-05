import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { sdijFetchSub, SdijError, SdijSubKind } from "@/lib/sdij";

// Proxy for the report page's authenticated ajax sub-requests (문항별 답안지 목록 /
// top3), so they carry the stored SDIJ session cookie from inside our iframe.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("", { status: 401 });

  const kindParam = req.nextUrl.searchParams.get("kind");
  const kind: SdijSubKind = kindParam === "top3" ? "top3" : "anssheet";

  const acct = await prisma.sdijAccount.findUnique({ where: { ownerId: user.id } });
  if (!acct) return new NextResponse("", { status: 401 });

  const cookie = decryptSecret(acct.cookieEnc);
  const body = await req.text();

  try {
    const html = await sdijFetchSub({ cookie, body }, kind, body);
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err instanceof SdijError && err.code === "auth" ? 401 : 502;
    return new NextResponse("", { status });
  }
}
