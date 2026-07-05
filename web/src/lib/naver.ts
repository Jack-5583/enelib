import "server-only";

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

export async function refreshNaverToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params}`);
  const data = (await res.json()) as NaverTokenResponse;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error_description || "네이버 로그인 갱신에 실패했습니다.");
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
    const code = [c.errorCode, c.error_code, c.code].find((v) => typeof v === "string") as string | undefined;
    const msg = [c.msg, c.message, c.error_description].find((v) => typeof v === "string") as string | undefined;
    if (code || msg) return { code, msg };
  }
  return {};
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

/** The mobile "comments only" view of a public article — light enough to embed
 * in an iframe and to scrape for a comment count, without needing a Naver login.
 * Confirmed real shape: https://m.cafe.naver.com/ca-fe/web/cafes/{clubid}/articles/{articleId}/comments */
export function getCommentsEmbedUrl(clubid: string, articleId: string): string {
  return `https://m.cafe.naver.com/ca-fe/web/cafes/${clubid}/articles/${articleId}/comments`;
}

/** Naver's own multipart write example (APIExamCafePostMultipart.java / MultipartUtil.java)
 * sends subject/content as UTF-8 percent-encoded text fields — not re-encoded to any
 * legacy charset. application/x-www-form-urlencoded style (space -> "+") to match
 * java.net.URLEncoder.encode(str, "UTF-8"), which is what that reference example uses. */
function naverFormEncode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, "+");
}

export async function postNaverCafeArticle(params: PostArticleParams): Promise<PostArticleResult> {
  const form = new FormData();
  form.append("subject", naverFormEncode(params.subject));
  form.append("content", naverFormEncode(params.content));
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
  // articleUrl is the actual proof of success — don't gate on flat.status too, since
  // Naver's docs show it as an int but some responses may send it as a numeric string.
  if (!res.ok || !flat.articleUrl) {
    const { code, msg } = extractNaverError(data);
    const fallback = raw.trim() ? `카페 글쓰기에 실패했습니다. (서버 응답: ${raw.slice(0, 300)})` : "카페 글쓰기에 실패했습니다. (빈 응답)";
    throw new NaverCafeError(msg || fallback, code, raw);
  }
  return {
    cafeUrl: String(flat.cafeUrl),
    articleId: String(flat.articleId),
    articleUrl: String(flat.articleUrl),
  };
}
