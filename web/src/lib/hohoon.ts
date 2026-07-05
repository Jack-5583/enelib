import "server-only";

// Client for hohoonmath.com — a legacy PHP/jQuery board with no API. We act on
// behalf of a logged-in member: log in for a PHP session, then reuse that same
// session (PHPSESSID) for the captcha, image uploads, and the write itself.
// All flows were verified live against the real site before this was written.

const BASE = "https://www.hohoonmath.com";
const BBSID = "studyquestions";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class HohoonError extends Error {
  constructor(
    message: string,
    public raw?: string
  ) {
    super(message);
    this.name = "HohoonError";
  }
}

function firstCookies(setCookie: string | null): string {
  if (!setCookie) return "";
  return setCookie
    .split(/,(?=[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function extractAlert(html: string): string | null {
  const m = /alert\('([^']*)'/.exec(html);
  return m ? m[1].replace(/\\n/g, " ").trim() : null;
}

/** Log in and return the authenticated PHP session cookie. Throws HohoonError
 * (with the site's own message) on bad credentials. */
export async function hohoonLogin(userId: string, userPass: string): Promise<string> {
  const r0 = await fetch(`${BASE}/`, { headers: { "User-Agent": UA }, redirect: "manual" });
  let cookie = firstCookies(r0.headers.get("set-cookie"));

  const body = new URLSearchParams({ Mode: "login", user_id: userId, user_pass: userPass }).toString();
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
  const text = await r1.text();

  // Success sends the parent frame home; failure pops an alert with the reason.
  const alert = extractAlert(text);
  const success = /parent\.location|location\.href\s*=\s*'\.\.\//.test(text);
  if (alert && !success) throw new HohoonError(alert, text);
  if (!success && !/location/.test(text)) {
    throw new HohoonError("hohoonmath 로그인에 실패했습니다. 아이디/비밀번호를 확인해 주세요.", text);
  }
  if (!cookie) throw new HohoonError("hohoonmath 세션을 받지 못했습니다.");
  return cookie;
}

/** Read the writer nickname the board prefills into the write form (readonly),
 * so posts show the member's real board name rather than a default. */
export async function hohoonFetchWriterName(cookie: string): Promise<string | null> {
  const res = await fetch(`${BASE}/weekly/${BBSID}.html?bbsid=${BBSID}&gbn=new`, {
    headers: { "User-Agent": UA, Cookie: cookie },
  });
  const html = await res.text();
  const m = /name=["']name["'][^>]*value=["']([^"']*)["']/.exec(html);
  return m && m[1] ? m[1] : null;
}

/** Fetch the spam-prevention image for the current session, as a data URI to
 * show the user. The answer is stored in the PHP session, so the post must be
 * submitted on this same session/cookie. */
export async function hohoonFetchCaptcha(cookie: string): Promise<string> {
  const res = await fetch(`${BASE}/captcha/CaptchaSecurityImages.php?width=100&height=40&characters=5`, {
    headers: { "User-Agent": UA, Cookie: cookie, Referer: `${BASE}/weekly/${BBSID}.html` },
  });
  const ct = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${ct};base64,${buf.toString("base64")}`;
}

/** Upload one image under the given imgcode folder; returns the web path to use
 * in the article HTML. Reuse the same imgcode for every image of one post. */
export async function hohoonUploadImage(
  cookie: string,
  imgcode: string,
  image: { buffer: Buffer; filename: string; contentType: string }
): Promise<string> {
  const form = new FormData();
  form.append("imagepath", `/upload/temp/${imgcode}`);
  form.append("imgcode", imgcode);
  form.append("irid", "");
  form.append("bbsid", BBSID);
  form.append("file1", new Blob([new Uint8Array(image.buffer)], { type: image.contentType }), image.filename);

  const res = await fetch(`${BASE}/smart_editor/imgupload_pro.php`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Cookie: cookie,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE}/smart_editor/imgupload.php`,
      Origin: BASE,
    },
    body: form,
  });
  const data = (await res.json().catch(() => null)) as
    | { code?: number; file_name?: string; file?: { file_name?: string } }
    | null;
  const fileName = data?.file?.file_name || data?.file_name;
  if (!data || !fileName) throw new HohoonError("이미지 업로드에 실패했습니다.");
  return `/upload/temp/${imgcode}/${fileName}`;
}

interface PostArticleParams {
  cookie: string;
  imgcode: string;
  writerName: string;
  subject: string;
  contentHtml: string;
  captcha: string;
}

/** Submit the article. Success is a redirect script with no alert; the site
 * reports every failure (bad captcha, etc.) via an alert we surface verbatim. */
export async function hohoonPostArticle(params: PostArticleParams): Promise<void> {
  const fp = new URLSearchParams({
    code: "",
    subp: "",
    bbsid: BBSID,
    gbn: "new",
    ix: "",
    returl: `/weekly/${BBSID}.html`,
    oldfilecnt: "",
    imgcode: params.imgcode,
    isopen: "Y",
    name: params.writerName,
    pwd: "",
    cate: "0",
    subject: params.subject,
    irid: "",
    ir1: params.contentHtml,
    contents: params.contentHtml,
    security_code1: params.captcha,
  });
  // The browser's file <select multiple> always submits one placeholder entry;
  // the server computes bbs_filecnt = count(attfile) - 1, so we send it too.
  fp.append("attfile[]", "");

  const res = await fetch(`${BASE}/board/pb_board_ok.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer: `${BASE}/weekly/${BBSID}.html`,
      Origin: BASE,
      Cookie: params.cookie,
    },
    body: fp.toString(),
    redirect: "manual",
  });
  const text = await res.text();
  const alert = extractAlert(text);
  if (alert) throw new HohoonError(alert, text);
  if (!/location\.href|parent\.location/.test(text)) {
    throw new HohoonError("글 등록에 실패했습니다.", text);
  }
}

/** Turn a student's plain-text body + uploaded image paths into the HTML the
 * board stores (bbs_htmlyn = Y). */
export function buildArticleHtml(text: string, imagePaths: string[]): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const imgs = imagePaths.map((p) => `<p><img src="${p}" border="0"></p>`).join("");
  return escaped + imgs;
}

/** A fresh imgcode (temp image folder id) for one composing session. */
export function newImgcode(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** The shared hohoonmath account questions are posted through. Overridable via
 * env; falls back to the configured default so no setup is required. */
export function hohoonCredentials(): { userId: string; userPass: string } {
  return {
    userId: process.env.HOHOON_USER_ID || "ksh5583",
    userPass: process.env.HOHOON_USER_PASS || "hohoon",
  };
}
