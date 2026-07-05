import "server-only";

// Client for 박종민수학연구소 on the inclass platform (gomathtop.inclass.co.kr).
// The site has no public API; auth is carried by inclass session cookies across
// *.inclass.co.kr (chiefly `www_auth_token`, plus a per-visit `ASPSESSIONID…`).
// We post through one shared account, exactly like the 호형훈제 integration —
// no captcha here, just a plain form POST to the board's write handler. The
// board list is rendered client-side from an ajax fragment, so we read that
// fragment (not the list page shell) to find our just-posted article id.

const BASE = "https://gomathtop.inclass.co.kr";
// The "수학 질문" board (boardQnAS) menu id, from the write/list URLs.
const SITE_MENU_IDX = "137567";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class InclassError extends Error {
  constructor(
    message: string,
    public raw?: string
  ) {
    super(message);
    this.name = "InclassError";
  }
}

/** The shared inclass session all questions are posted through. Overridable via
 * env (INCLASS_COOKIE) so the live session can be refreshed without a redeploy;
 * falls back to the captured session so no setup is required. `www_auth_token`
 * is the persistent auth; the ASP session is re-minted per request. */
export function inclassCookie(): string {
  return (
    process.env.INCLASS_COOKIE ||
    [
      "siteVisited%5Fgomathtop=Y",
      "www_auth_token=5f3039d984ec47b8be54052be23a71c15f3039d984ec47b8be54052be23a71c1",
      "inclass=paramKey=gomathtop",
      "ASPSESSIONIDQQDAQDCB=AKOODMKALHEAFOJAAPLEPDHG",
    ].join("; ")
  );
}

/** The shared inclass login (kept for a future server-side re-login; posting
 * currently relies on the stored cookie). */
export function inclassCredentials(): { userId: string; userPass: string } {
  return {
    userId: process.env.INCLASS_USER_ID || "enexoene@gmail.com",
    userPass: process.env.INCLASS_USER_PASS || "gomathtop",
  };
}

function extractAlert(html: string): string | null {
  const m = /alert\(\s*['"]([^'"]*)['"]/.exec(html);
  return m ? m[1].replace(/\\n/g, " ").trim() : null;
}

/** Turn a student's plain-text question into the HTML the CKEditor board stores. */
export function buildInclassContentHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

interface PostQuestionParams {
  title: string;
  contentHtml: string;
  /** false → 공개 질문 (default; needed so we can find & read it back); true → 비공개. */
  secret?: boolean;
}

/** Submit a new question to the board. Success is a redirect back to the list;
 * inclass reports validation problems (e.g. a required 분류/상품) via an alert we
 * surface verbatim. */
export async function inclassPostQuestion(params: PostQuestionParams): Promise<void> {
  const cookie = inclassCookie();
  const fp = new URLSearchParams({
    tblBoardQNAIdx: "",
    isMode: "",
    groupCode: "",
    tblProductCode: "",
    titles: params.title,
    contents: params.contentHtml,
    isTitleSecret: "N",
  });
  // The 공개여부 checkbox only submits (isOpen=N) when the student hides the post.
  if (params.secret) fp.set("isOpen", "N");

  let res: Response;
  try {
    res = await fetch(`${BASE}/boardQnAS/write/proc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": UA,
        Referer: `${BASE}/boardQnAS/write/`,
        Origin: BASE,
        Cookie: cookie,
      },
      body: fp.toString(),
      redirect: "manual",
    });
  } catch {
    throw new InclassError("박종민수학연구소에 연결하지 못했습니다.");
  }

  // A redirect (to the list) is the success signal.
  if (res.status >= 300 && res.status < 400) return;

  const text = await res.text().catch(() => "");
  const alert = extractAlert(text);
  if (alert) throw new InclassError(alert, text);
  if (/location\.(href|replace)|\/boardQnAS\/list/.test(text)) return;
  if (/member\/login|로그인/.test(text)) {
    throw new InclassError("inclass 세션이 만료되었습니다. 관리자 인증 정보를 갱신해 주세요.", text);
  }
  throw new InclassError("질문 등록에 실패했습니다.", text);
}

export function inclassViewUrl(articleId: string): string {
  return `${BASE}/boardQnAS/view/?tblBoardQNAIdx=${articleId}`;
}

/** The board list is rendered client-side from an ajax fragment, so we fetch that
 * fragment (not the list page shell) and read the rows. Each public row links to
 * `../view/?tblBoardQNAIdx=NNN` and carries an 답변 완료/대기 status; private posts
 * have a `javascript:` alert instead of a link. Returns rows newest-first. */
async function inclassFetchListRows(): Promise<{ id: string; title: string; answered: boolean }[]> {
  const res = await fetch(`${BASE}/boardQnAS/xhr/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE}/boardQnAS/list/?siteMenuIdx=${SITE_MENU_IDX}`,
      Origin: BASE,
      Cookie: inclassCookie(),
    },
    body: "aGotoPage=1&boardCategory=&boardTotalCounts=0&searchTitles=",
  });
  if (!res.ok) return [];
  const html = await res.text();

  const rows: { id: string; title: string; answered: boolean }[] = [];
  for (const chunk of html.split(/<li\b/i).slice(1)) {
    const link = /href="[^"]*\bview\/\?tblBoardQNAIdx=(\d+)[^"]*"[^>]*class="tit"[^>]*>([\s\S]*?)<\/a>/i.exec(chunk);
    if (!link) continue;
    const title = htmlToText(link[2]);
    if (!title) continue;
    rows.push({ id: link[1], title, answered: /답변\s*완료/.test(chunk) });
  }
  return rows;
}

/** Posting doesn't return the new article id, so right after a successful post we
 * look it up from the list: the newest public row whose title matches ours (else
 * the largest id on the first page). Best-effort — null if nothing matches. */
export async function inclassFindArticleId(title: string): Promise<string | null> {
  try {
    const rows = await inclassFetchListRows();
    if (!rows.length) return null;
    const want = htmlToText(title);
    const match = rows.find((r) => r.title === want) || rows.find((r) => r.title.includes(want));
    if (match) return match.id;
    const maxId = rows.map((r) => Number(r.id)).filter((n) => n > 0).sort((a, b) => b - a)[0];
    return maxId ? String(maxId) : null;
  } catch {
    return null;
  }
}

/** Scrape the teacher's reply from a question's view page, if one exists.
 * Best-effort: inclass renders the answer inside a reply/답변 block; returns null
 * when there's no answer or the markup isn't recognised. */
export async function inclassFetchAnswer(articleId: string): Promise<{ text: string } | null> {
  try {
    const res = await fetch(inclassViewUrl(articleId), {
      headers: { "User-Agent": UA, Cookie: inclassCookie() },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const markers = [
      /class=["'][^"']*(?:answer|reply|comment|re-?content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|dd|section)>/i,
      /답변[\s\S]{0,80}?<(?:div|dd|p)[^>]*>([\s\S]*?)<\/(?:div|dd|p)>/i,
    ];
    for (const re of markers) {
      const m = re.exec(html);
      if (m && m[1]) {
        const text = htmlToText(m[1]);
        if (text) return { text };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
