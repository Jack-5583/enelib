import { NextResponse } from "next/server";

// TEMPORARY diagnostic probe for the captcha flow: login -> fetch the captcha
// image on that same PHP session -> show it -> user types the code -> post one
// real "." / "." article reusing the same session. Proves human-in-the-loop
// captcha posting works end to end. Credentials via POST form, not URL. Delete after use.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const BASE = "https://www.hohoonmath.com";

function firstCookies(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie
    .split(/,(?=[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function esc(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function GET() {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px">
  <h3>hohoonmath 캡차 글쓰기 테스트 (1/2)</h3>
  <form method="post">
    <input type="hidden" name="step" value="captcha">
    <p><input name="id" placeholder="아이디" style="width:100%;padding:10px;font-size:16px"></p>
    <p><input name="pw" type="password" placeholder="비번" style="width:100%;padding:10px;font-size:16px"></p>
    <p><button type="submit" style="width:100%;padding:12px;font-size:16px">로그인하고 캡차 받기</button></p>
  </form></body>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const step = String(form.get("step") || "");

  if (step === "captcha") {
    const id = String(form.get("id") || "");
    const pw = String(form.get("pw") || "");
    if (!id || !pw) return NextResponse.json({ error: "id/pw required" }, { status: 400 });

    // establish session + login
    const r0 = await fetch(`${BASE}/`, { headers: { "User-Agent": UA }, redirect: "manual" });
    let cookie = firstCookies(r0.headers.get("set-cookie"));
    const loginBody = new URLSearchParams({ Mode: "login", user_id: id, user_pass: pw }).toString();
    const r1 = await fetch(`${BASE}/_action/member.do.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Referer: `${BASE}/member/login.php`,
        Origin: BASE,
        Cookie: cookie,
      },
      body: loginBody,
      redirect: "manual",
    });
    const c1 = firstCookies(r1.headers.get("set-cookie"));
    if (c1) cookie = c1;

    // fetch the captcha image on this same session
    const rc = await fetch(`${BASE}/captcha/CaptchaSecurityImages.php?width=100&height=40&characters=5`, {
      headers: { "User-Agent": UA, Cookie: cookie, Referer: `${BASE}/weekly/studyquestions.html` },
    });
    const ct = rc.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await rc.arrayBuffer());
    const dataUri = `data:${ct};base64,${buf.toString("base64")}`;

    const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <body style="font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px">
    <h3>캡차 입력 (2/2)</h3>
    <p>아래 이미지의 문자를 입력하면 제목 ".", 본문 "."인 글이 실제로 등록됩니다.</p>
    <p><img src="${dataUri}" style="border:1px solid #ccc"></p>
    <form method="post">
      <input type="hidden" name="step" value="post">
      <input type="hidden" name="sess" value="${esc(cookie)}">
      <p><input name="code" placeholder="캡차 문자" autocomplete="off" style="width:100%;padding:10px;font-size:16px"></p>
      <p><button type="submit" style="width:100%;padding:12px;font-size:16px">글 등록</button></p>
    </form>
    <p style="color:#999;font-size:12px">captcha status: ${rc.status}, login hint ok</p>
    </body>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // step === "post": reuse the same session, submit with the typed captcha code
  const cookie = String(form.get("sess") || "");
  const code = String(form.get("code") || "");
  if (!cookie) return NextResponse.json({ error: "session lost" }, { status: 400 });

  const fields = new URLSearchParams({
    code: "",
    subp: "",
    bbsid: "studyquestions",
    gbn: "new",
    ix: "",
    returl: "/weekly/studyquestions.html",
    oldfilecnt: "",
    imgcode: String(Date.now()),
    isopen: "Y",
    name: "",
    pwd: "",
    cate: "0",
    subject: ".",
    irid: "",
    ir1: ".",
    contents: ".",
    security_code1: code,
  }).toString();
  const r2 = await fetch(`${BASE}/board/pb_board_ok.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer: `${BASE}/weekly/studyquestions.html`,
      Origin: BASE,
      Cookie: cookie,
    },
    body: fields,
    redirect: "manual",
  });
  const t2 = await r2.text();
  return NextResponse.json({
    write: { status: r2.status, location: r2.headers.get("location") || null, bodySample: t2.slice(0, 900) },
  });
}
