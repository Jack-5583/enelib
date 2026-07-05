import "server-only";
import iconv from "iconv-lite";

const CLIENT_ID = process.env.NAVER_CLIENT_ID || "";
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.NAVER_REDIRECT_URI || "";

export function naverConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

export function getNaverAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params}`;
}

interface NaverTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  error?: string;
  error_description?: string;
}

export async function exchangeNaverCode(code: string, state: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    state,
  });
  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params}`);
  const data = (await res.json()) as NaverTokenResponse;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error_description || "네이버 로그인 연동에 실패했습니다.");
  }
  return data;
}

export async function getNaverProfile(accessToken: string) {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data?.resultcode !== "00") throw new Error("네이버 프로필 조회에 실패했습니다.");
  return data.response as { id: string; nickname?: string; name?: string };
}

/** Naver's legacy Cafe write API expects request text re-encoded as MS949 (CP949)
 * bytes, percent-encoded — not the UTF-8 bytes a normal encodeURIComponent produces.
 * Getting this wrong is the #1 cause of garbled Korean text on the posted article. */
function cp949PercentEncode(str: string): string {
  const bytes = iconv.encode(str, "cp949");
  let out = "";
  for (const byte of bytes) {
    const ch = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-_.!~*'()]/.test(ch)) out += ch;
    else out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

function safeJsonParse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) || {};
  } catch {
    return {};
  }
}

export class NaverCafeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public raw?: string
  ) {
    super(message);
  }
}

/** Naver's error body shape isn't precisely documented across every failure case,
 * so this pulls an error code / message out of whichever plausible field path is
 * present instead of assuming one fixed schema. */
function extractNaverError(data: unknown): { code?: string; msg?: string } {
  const d = data as Record<string, unknown> | null;
  const candidates = [d, (d?.error as Record<string, unknown>) || null, (d?.message as Record<string, unknown>)?.error as Record<string, unknown> | null];
  for (const c of candidates) {
    if (!c) continue;
    const code = (c.errorCode || c.error_code || c.code) as string | undefined;
    const msg = (c.msg || c.message || c.error_description) as string | undefined;
    if (code || msg) return { code, msg };
  }
  return {};
}

/** Join a cafe on behalf of the logged-in Naver member. Safe to call even if
 * already a member — Naver returns error code CA004 in that case, which we treat as success. */
export async function joinNaverCafe(accessToken: string, clubid: string, nickname: string) {
  const body = `nickname=${cp949PercentEncode(nickname)}`;
  const res = await fetch(`https://openapi.naver.com/v1/cafe/${clubid}/members`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const raw = await res.text();
  const data = safeJsonParse(raw);
  const { code, msg } = extractNaverError(data);
  if (code === "CA004") return; // already a member
  if (!res.ok || data?.status !== 200) {
    throw new NaverCafeError(msg || "카페 가입에 실패했습니다.", code, raw);
  }
}

interface PostArticleParams {
  accessToken: string;
  clubid: string;
  menuid: string;
  subject: string;
  content: string;
  images: { buffer: Buffer; filename: string; contentType: string }[];
  openyn?: boolean;
}

interface PostArticleResult {
  cafeUrl: string;
  articleId: string;
  articleUrl: string;
}

export async function postNaverCafeArticle(params: PostArticleParams): Promise<PostArticleResult> {
  const form = new FormData();
  form.append("subject", new Blob([new Uint8Array(iconv.encode(params.subject, "cp949"))]));
  form.append("content", new Blob([new Uint8Array(iconv.encode(params.content, "cp949"))]));
  form.append("openyn", String(params.openyn ?? true));
  form.append("replyyn", "true");
  for (const img of params.images) {
    form.append("image", new Blob([new Uint8Array(img.buffer)], { type: img.contentType }), img.filename);
  }

  const res = await fetch(`https://openapi.naver.com/v1/cafe/${params.clubid}/menu/${params.menuid}/articles`, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  });
  const raw = await res.text();
  const data = safeJsonParse(raw);
  // Documented shape is flat ({status, cafeUrl, articleId, articleUrl}), but some
  // Naver open APIs wrap results in a "message.result" envelope — accept either.
  const result = (data.message as Record<string, unknown>)?.result as Record<string, unknown> | undefined;
  const flat = result ?? data;
  if (!res.ok || flat.status !== 200 || !flat.articleUrl) {
    const { code, msg } = extractNaverError(data);
    throw new NaverCafeError(msg || "카페 글쓰기에 실패했습니다.", code, raw);
  }
  return {
    cafeUrl: String(flat.cafeUrl),
    articleId: String(flat.articleId),
    articleUrl: String(flat.articleUrl),
  };
}
