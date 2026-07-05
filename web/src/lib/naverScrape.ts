import "server-only";
import { getCommentsEmbedUrl } from "@/lib/naver";

/**
 * Best-effort, unauthenticated read of a public cafe article's comment count.
 * Naver's Cafe Open API has no comment-read endpoint at all, so this is the
 * only way to detect a new reply — it fetches the mobile "comments only" page
 * (no login, no session) and looks for a comment-count marker in the HTML.
 * Naver can change this markup at any time without notice, so a null return
 * just means "couldn't tell this time," not "zero comments."
 */
export async function fetchCommentCount(clubid: string, articleId: string): Promise<number | null> {
  try {
    const res = await fetch(getCommentsEmbedUrl(clubid, articleId), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; enelib-bot/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const jsonMatch = /"commentCount"\s*:\s*(\d+)/.exec(html);
    if (jsonMatch) return Number(jsonMatch[1]);
    const textMatch = /댓글\s*(?:\(|<[^>]*>)?\s*(\d+)/.exec(html);
    if (textMatch) return Number(textMatch[1]);
    return null;
  } catch {
    return null;
  }
}

export interface ScrapedComment {
  nickname: string;
  content: string;
  date?: string;
}

const CONTENT_KEYS = ["content", "commentContent", "refContent", "body", "text"];
const NICKNAME_KEYS = ["nickName", "nickname", "writerNickname", "writer", "memberNickname", "authorNickname", "name"];
const DATE_KEYS = ["regDate", "createDate", "addDate", "writeDate", "date", "regDt"];

function pickStringField(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

function looksLikeComment(obj: Record<string, unknown>): boolean {
  return !!pickStringField(obj, CONTENT_KEYS) && !!pickStringField(obj, NICKNAME_KEYS);
}

/** Naver's mobile cafe pages are server-rendered React apps that embed their full
 * page state (including the comment list) as JSON in a __NEXT_DATA__ script tag.
 * We don't know the exact field names in advance, so this walks the tree looking
 * for an array of objects that look like comments, rather than assuming one path. */
function findCommentArrays(node: unknown, depth: number, out: Record<string, unknown>[][]): void {
  if (depth > 10 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((el) => el && typeof el === "object" && looksLikeComment(el as Record<string, unknown>))) {
      out.push(node as Record<string, unknown>[]);
      return;
    }
    for (const el of node) findCommentArrays(el, depth + 1, out);
    return;
  }
  for (const key of Object.keys(node as Record<string, unknown>)) {
    findCommentArrays((node as Record<string, unknown>)[key], depth + 1, out);
  }
}

/** Diagnostic-only: walks the tree recording every array found (path, length, and
 * the first element's keys) without filtering for "looks like a comment" — lets us
 * see what shape the page's embedded data actually has when the heuristic in
 * fetchComments comes back empty, without needing to dump the whole payload. */
function collectArrayInfo(
  node: unknown,
  path: string,
  depth: number,
  out: { path: string; length: number; sampleKeys: string[] }[]
): void {
  if (depth > 14 || out.length > 300 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    if (node.length > 0) {
      const first = node[0];
      const sampleKeys = first && typeof first === "object" && !Array.isArray(first) ? Object.keys(first as object).slice(0, 25) : [];
      out.push({ path, length: node.length, sampleKeys });
      collectArrayInfo(first, `${path}[0]`, depth + 1, out);
    }
    return;
  }
  for (const key of Object.keys(node as Record<string, unknown>)) {
    collectArrayInfo((node as Record<string, unknown>)[key], `${path}.${key}`, depth + 1, out);
  }
}

export async function debugScrapeComments(clubid: string, articleId: string): Promise<Record<string, unknown>> {
  const res = await fetch(getCommentsEmbedUrl(clubid, articleId), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; enelib-bot/1.0)" },
    cache: "no-store",
  });
  const html = await res.text();
  const result: Record<string, unknown> = {
    url: getCommentsEmbedUrl(clubid, articleId),
    status: res.status,
    htmlLength: html.length,
  };
  const nextDataMatch = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  result.foundNextData = !!nextDataMatch;
  if (!nextDataMatch) {
    result.htmlSample = html.slice(0, 800);
    return result;
  }
  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const arrays: { path: string; length: number; sampleKeys: string[] }[] = [];
    collectArrayInfo(nextData, "root", 0, arrays);
    result.arrayCandidates = arrays;
  } catch (e) {
    result.parseError = String(e);
    result.nextDataSample = nextDataMatch[1].slice(0, 800);
  }
  return result;
}

/** Best-effort: returns the parsed comment list, or null if the page's markup
 * doesn't match the shape we expect this time (Naver can change it without notice). */
export async function fetchComments(clubid: string, articleId: string): Promise<ScrapedComment[] | null> {
  try {
    const res = await fetch(getCommentsEmbedUrl(clubid, articleId), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; enelib-bot/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const nextDataMatch = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (!nextDataMatch) return null;
    let nextData: unknown;
    try {
      nextData = JSON.parse(nextDataMatch[1]);
    } catch {
      return null;
    }
    const arrays: Record<string, unknown>[][] = [];
    findCommentArrays(nextData, 0, arrays);
    if (arrays.length === 0) return null;
    const best = arrays.reduce((a, b) => (b.length > a.length ? b : a));
    return best
      .map((c) => ({
        nickname: pickStringField(c, NICKNAME_KEYS) || "익명",
        content: pickStringField(c, CONTENT_KEYS) || "",
        date: pickStringField(c, DATE_KEYS),
      }))
      .filter((c) => c.content);
  } catch {
    return null;
  }
}
