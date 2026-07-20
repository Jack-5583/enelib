import "server-only";
import { getResearchLab } from "@/lib/researchLabs";

// Client for inclass-platform research labs (e.g. 박종민 gomathtop, 김범찬
// tigerchan). The site has no public API; auth is carried by inclass session
// cookies across *.inclass.co.kr (chiefly `www_auth_token`, plus a per-visit
// `ASPSESSIONID…`). We post through one shared account per lab — no captcha,
// just a plain form POST to the board's write handler. The board list is
// rendered client-side from an ajax fragment, so we read that fragment (not the
// list page shell) to find our just-posted article id.

// File uploads go to a separate JWT-authed API and land in this S3 bucket.
const API = "https://api.inclass.kr";
const S3_BUCKET = "https://inclass-file.s3.ap-northeast-2.amazonaws.com/";
const FILE_FOLDER = "board/qna";
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

/** The shared inclass session cookie for each lab. Overridable via env so a
 * live session can be refreshed without a redeploy. `www_auth_token` is the
 * persistent auth; the ASP session is re-minted per request. */
const INCLASS_COOKIES: Record<string, () => string> = {
  parkjongmin: () =>
    process.env.INCLASS_COOKIE ||
    [
      "siteVisited%5Fgomathtop=Y",
      "www_auth_token=5f3039d984ec47b8be54052be23a71c15f3039d984ec47b8be54052be23a71c1",
      "inclass=paramKey=gomathtop",
      "ASPSESSIONIDQQDAQDCB=AKOODMKALHEAFOJAAPLEPDHG",
    ].join("; "),
  kimbeomchan: () =>
    process.env.INCLASS_COOKIE_TIGERCHAN ||
    [
      "siteVisited%5Ftigerchan=Y",
      "www_auth_token=653b1b9bcea24fb990b522a097e21fd9653b1b9bcea24fb990b522a097e21fd9",
      "inclass=paramKey=tigerchan",
      "ASPSESSIONIDSSCCRBDB=LOACOAJCAHINBHGBEAJBIFDB",
    ].join("; "),
};

export interface InclassCtx {
  labId: string;
  labName: string;
  subject: string;
  host: string;
  cookie: string;
  boardPath: string;
  siteMenuIdx: string;
}

/** Build the request context (site host, board path, session cookie) for a
 * given lab + board. Throws if the lab isn't an inclass lab. */
export function inclassContext(labId: string, boardId?: string): InclassCtx {
  const lab = getResearchLab(labId);
  if (!lab || lab.kind !== "inclass" || !lab.host) {
    throw new InclassError("잘못된 연구소입니다.");
  }
  const board = lab.boards.find((b) => b.id === boardId) ?? lab.boards[0];
  return {
    labId,
    labName: lab.name,
    subject: lab.subject,
    host: lab.host,
    cookie: (INCLASS_COOKIES[labId]?.() ?? "").trim(),
    boardPath: board.path ?? "boardQnAS",
    siteMenuIdx: board.menuid,
  };
}

function requireCookie(ctx: InclassCtx): string {
  if (!ctx.cookie) {
    throw new InclassError(`${ctx.labName} inclass 인증 정보가 아직 설정되지 않았습니다.`);
  }
  return ctx.cookie;
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

/** A photo attachment, already uploaded to inclass and moved to its permanent
 * location, ready to be referenced in the write form. */
export interface InclassAttachment {
  fileUpNM: string;
  fileKey: string;
  url: string;
}

interface PostQuestionParams {
  title: string;
  contentHtml: string;
  /** false → 공개 질문; true → 비공개 (default here). */
  secret?: boolean;
  attachments?: InclassAttachment[];
}

/** Fetch a fresh short-lived (≈10s) upload token from the lab's site. */
async function inclassToken(ctx: InclassCtx): Promise<string> {
  const res = await fetch(`${ctx.host}/_common/xhr/token.asp`, {
    headers: { "User-Agent": UA, Cookie: requireCookie(ctx), Referer: `${ctx.host}/${ctx.boardPath}/write/` },
  });
  if (!res.ok) throw new InclassError("inclass 업로드 토큰을 받지 못했습니다.");
  return (await res.text()).trim().replace(/^["']|["']$/g, "");
}

/** Upload one image on the lab's shared account, then move it from temp to the
 * board's permanent folder — mirroring the site's uploader.saveFiles(). */
export async function inclassUploadImage(
  ctx: InclassCtx,
  image: { buffer: Buffer; filename: string; contentType: string }
): Promise<InclassAttachment> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(image.buffer)], { type: image.contentType }), image.filename);
  form.append("folderName", "temp");
  form.append("fileName", encodeURIComponent(image.filename));

  const up = await fetch(`${API}/sls/v1/file/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await inclassToken(ctx)}`, Origin: ctx.host, Referer: `${ctx.host}/` },
    body: form,
  });
  const upData = (await up.json().catch(() => null)) as { Key?: string; key?: string } | null;
  const tempKey = upData?.Key || upData?.key;
  if (!tempKey) throw new InclassError("이미지 업로드에 실패했습니다.");

  const save = await fetch(`${API}/sls/v1/file`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await inclassToken(ctx)}`,
      "Content-Type": "application/json",
      Origin: ctx.host,
      Referer: `${ctx.host}/`,
    },
    body: JSON.stringify({ folderName: FILE_FOLDER, key: tempKey }),
  });
  const saveData = (await save.json().catch(() => null)) as { key?: string; Key?: string } | null;
  const permKey = saveData?.key || saveData?.Key;
  if (!permKey) throw new InclassError("이미지 저장에 실패했습니다.");

  return { fileUpNM: permKey.split("/").pop() || permKey, fileKey: permKey, url: `${S3_BUCKET}${permKey}` };
}

/** Submit a new question to the lab's board. Success is a redirect (or success
 * alert) back to the list; genuine validation failures are surfaced verbatim. */
export async function inclassPostQuestion(ctx: InclassCtx, params: PostQuestionParams): Promise<void> {
  const cookie = requireCookie(ctx);
  const fp = new URLSearchParams({
    tblBoardQNAIdx: "",
    isMode: "",
    groupCode: "",
    tblProductCode: "",
    titles: params.title,
    contents: params.contentHtml,
    isTitleSecret: "N",
  });
  // Always 비공개 (작성자만 열람).
  fp.set("isOpen", "N");
  for (const a of params.attachments ?? []) {
    fp.append("fileUpNM", a.fileUpNM);
    fp.append("fileKey", a.fileKey);
  }

  let res: Response;
  try {
    res = await fetch(`${ctx.host}/${ctx.boardPath}/write/proc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": UA,
        Referer: `${ctx.host}/${ctx.boardPath}/write/`,
        Origin: ctx.host,
        Cookie: cookie,
      },
      body: fp.toString(),
      redirect: "manual",
    });
  } catch {
    throw new InclassError(`${ctx.labName}에 연결하지 못했습니다.`);
  }

  if (res.status >= 300 && res.status < 400) return;

  const text = await res.text().catch(() => "");
  const alert = extractAlert(text);
  // proc/ replies 200 with a script that alerts then redirects. A success alert
  // (e.g. "등록되었습니다") must NOT be treated as an error.
  if (alert) {
    const isFailure = /실패|오류|에러|없|선택해|입력해|초과|불가|아닙니다|주세요|다시/.test(alert);
    if (!isFailure) return;
    throw new InclassError(alert, text);
  }
  if (new RegExp(`location\\.(href|replace)|/${ctx.boardPath}/list`).test(text)) return;
  if (/member\/login|로그인/.test(text)) {
    throw new InclassError("inclass 세션이 만료되었습니다. 관리자 인증 정보를 갱신해 주세요.", text);
  }
  return;
}

export function inclassViewUrl(ctx: InclassCtx, articleId: string): string {
  return `${ctx.host}/${ctx.boardPath}/view/?tblBoardQNAIdx=${articleId}`;
}

/** The board list is rendered from an ajax fragment; fetch it and read the rows
 * (public rows link to `../view/?tblBoardQNAIdx=NNN`). Returns rows newest-first. */
async function inclassFetchListRows(ctx: InclassCtx): Promise<{ id: string; title: string; answered: boolean }[]> {
  // The list is rendered from an ajax fragment at …/list/xhr/ (relative to the
  // list page), not …/xhr/.
  const res = await fetch(`${ctx.host}/${ctx.boardPath}/list/xhr/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${ctx.host}/${ctx.boardPath}/list/?siteMenuIdx=${ctx.siteMenuIdx}`,
      Origin: ctx.host,
      Cookie: requireCookie(ctx),
    },
    body: "=&aGotoPage=1&boardCategory=&boardTotalCounts=0&searchTitles=&aTotalPageCountFix=0&contentstotalCountsFix=0",
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

/** Look up the just-posted article's id from the board list. Best-effort. */
export async function inclassFindArticleId(ctx: InclassCtx, title: string): Promise<string | null> {
  try {
    const rows = await inclassFetchListRows(ctx);
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

/** Scrape the teacher's reply from a question's view page, if one exists. */
export async function inclassFetchAnswer(ctx: InclassCtx, articleId: string): Promise<{ text: string } | null> {
  try {
    const res = await fetch(inclassViewUrl(ctx, articleId), {
      headers: { "User-Agent": UA, Cookie: requireCookie(ctx) },
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
