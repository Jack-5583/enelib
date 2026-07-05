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
