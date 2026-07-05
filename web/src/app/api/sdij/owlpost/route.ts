import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { sdijFetchOwlPost, buildStandaloneDoc, refreshBody, SdijError } from "@/lib/sdij";

// Renders the SDIJ 부엉이 포스트 report as a self-contained HTML document, meant
// to be loaded inside an <iframe>. GET uses the stored request as-is; POST is the
// same page's own form re-submit (회차/과목 change), whose body we forward.
async function handle(req: NextRequest, submittedBody?: string): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return errorDoc("로그인이 필요합니다.", false);

  const acct = await prisma.sdijAccount.findUnique({ where: { ownerId: user.id } });
  if (!acct) return errorDoc("SDIJ 인증 정보가 없습니다.", true);

  const cookie = decryptSecret(acct.cookieEnc);
  const storedBody = decryptSecret(acct.bodyEnc);
  const auth = { cookie, body: storedBody };

  try {
    const html = await sdijFetchOwlPost(auth, submittedBody);
    const nextBody = refreshBody(submittedBody || storedBody, html);
    if (nextBody !== storedBody) {
      await prisma.sdijAccount
        .update({ where: { ownerId: user.id }, data: { bodyEnc: encryptSecret(nextBody) } })
        .catch(() => {});
    }
    return new Response(buildStandaloneDoc(html), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof SdijError ? err.message : "부엉이 포스트를 불러오지 못했습니다.";
    const reauth = err instanceof SdijError && err.code === "auth";
    return errorDoc(message, reauth);
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return handle(req, body);
}

// A minimal in-iframe error page. When re-auth is needed it asks the parent app
// to open the auth form.
function errorDoc(message: string, reauth: boolean): Response {
  const safe = message.replace(/</g, "&lt;");
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin: 0; font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    display: flex; align-items: center; justify-content: center; min-height: 60vh; background: #fff; }
  .box { text-align: center; padding: 40px 24px; color: #161616; }
  .box p { margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #161616; }
  .box button { border: 1px solid #161616; background: #161616; color: #fff; padding: 12px 22px;
    font-size: 14px; border-radius: 2px; cursor: pointer; }
</style></head><body><div class="box">
  <p>${safe}</p>
  ${reauth ? `<button onclick="parent.postMessage('sdij-reauth','*')">다시 인증하기</button>` : ""}
</div></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
