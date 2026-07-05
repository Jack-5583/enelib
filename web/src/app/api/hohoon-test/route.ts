import { NextResponse } from "next/server";

// TEMPORARY diagnostic probe: logs in to hohoonmath and attempts to post one
// real article ("." / ".") to the studyquestions board, to confirm the write
// fields work and whether the captcha is enforced for logged-in members.
// Credentials are taken from a POST body (a small form), not the URL. Delete after use.
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

export function GET() {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px">
  <h3>hohoonmath 글쓰기 테스트</h3>
  <p style="color:#666;font-size:14px">아이디/비번 입력 후 "테스트 글 올리기"를 누르면 제목 ".", 본문 "."인 글 1개가 실제로 등록됩니다.</p>
  <form method="post">
    <p><input name="id" placeholder="아이디" style="width:100%;padding:10px;font-size:16px"></p>
    <p><input name="pw" type="password" placeholder="비번" style="width:100%;padding:10px;font-size:16px"></p>
    <p><button type="submit" style="width:100%;padding:12px;font-size:16px">테스트 글 올리기</button></p>
  </form></body>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("id") || "");
  const pw = String(form.get("pw") || "");
  if (!id || !pw) return NextResponse.json({ error: "id/pw required" }, { status: 400 });

  const out: Record<string, unknown> = {};
  let cookie = "";

  // 1) establish a PHP session
  try {
    const r0 = await fetch(`${BASE}/`, { headers: { "User-Agent": UA }, redirect: "manual" });
    cookie = firstCookies(r0.headers.get("set-cookie"));
    out.homepage = { status: r0.status, gotCookie: !!cookie };
  } catch (e) {
    out.homepage = { error: String(e) };
    return NextResponse.json(out);
  }

  // 2) log in
  try {
    const body = new URLSearchParams({ Mode: "login", user_id: id, user_pass: pw }).toString();
    const r1 = await fetch(`${BASE}/_action/member.do.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Referer: `${BASE}/member/login.php`,
        Origin: BASE,
        Cookie: cookie,
      },
      body,
      redirect: "manual",
    });
    const c1 = firstCookies(r1.headers.get("set-cookie"));
    if (c1) cookie = c1;
    const t1 = await r1.text();
    out.login = { status: r1.status, loggedInHint: /parent\.location|location\.href\s*=\s*'\.\.\//.test(t1) };
  } catch (e) {
    out.login = { error: String(e) };
    return NextResponse.json(out);
  }

  // 3) attempt the write
  try {
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
      security_code1: "",
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
    out.write = {
      status: r2.status,
      location: r2.headers.get("location") || null,
      bodySample: t2.slice(0, 900),
    };
  } catch (e) {
    out.write = { error: String(e) };
  }

  return NextResponse.json(out);
}
