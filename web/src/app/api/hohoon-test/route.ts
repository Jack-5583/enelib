import { NextResponse } from "next/server";

// TEMPORARY diagnostic probe. Tests whether Vercel's server can reach
// hohoonmath.com (it blocks datacenter IPs with 403 for some clients) and
// whether a plain form login succeeds. Delete after use.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function firstCookies(setCookie: string | null): string {
  if (!setCookie) return "";
  // Header may contain multiple cookies comma-joined; keep only name=value pairs.
  return setCookie
    .split(/,(?=[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  const pw = url.searchParams.get("pw") || "";
  if (!id || !pw) {
    return NextResponse.json({ error: "Add ?id=<아이디>&pw=<비번> to the URL." }, { status: 400 });
  }

  const out: Record<string, unknown> = {};
  let cookie = "";

  // Step 0: hit the homepage to (a) test raw reachability from Vercel and
  // (b) pick up an initial PHPSESSID before logging in.
  try {
    const res0 = await fetch("https://www.hohoonmath.com/", {
      headers: { "User-Agent": UA },
      redirect: "manual",
    });
    cookie = firstCookies(res0.headers.get("set-cookie"));
    out.homepage = { status: res0.status, gotCookie: !!cookie };
  } catch (e) {
    out.homepage = { error: String(e) };
  }

  // Step 1: submit the login form.
  try {
    const body = new URLSearchParams({ Mode: "login", user_id: id, user_pass: pw }).toString();
    const res1 = await fetch("https://www.hohoonmath.com/_action/member.do.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Referer: "https://www.hohoonmath.com/member/login.php",
        Origin: "https://www.hohoonmath.com",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body,
      redirect: "manual",
    });
    const loginCookie = firstCookies(res1.headers.get("set-cookie"));
    if (loginCookie) cookie = loginCookie;
    const text = await res1.text();
    out.login = {
      status: res1.status,
      location: res1.headers.get("location") || null,
      setCookiePresent: !!res1.headers.get("set-cookie"),
      bodySample: text.slice(0, 600),
    };
  } catch (e) {
    out.login = { error: String(e) };
  }

  // Step 2: load a members page with the session cookie to confirm we're in.
  try {
    const res2 = await fetch("https://www.hohoonmath.com/weekly/studyquestions.html", {
      headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
    });
    const text2 = await res2.text();
    out.boardPage = {
      status: res2.status,
      length: text2.length,
      mentionsLoggedInName: /로그아웃|logout/i.test(text2),
    };
  } catch (e) {
    out.boardPage = { error: String(e) };
  }

  return NextResponse.json(out);
}
