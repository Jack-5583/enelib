import "server-only";
import { put } from "@vercel/blob";

/** True when a Vercel Blob store is connected (token present). */
export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Upload inline image data URLs to Vercel Blob and return their public URLs.
 * Values that are already URLs pass through unchanged. Storing images in Blob
 * (rather than as base64 in Postgres) keeps DB rows — and DB compute — tiny.
 */
export async function storeImageDataUrls(userId: string, urls: string[]): Promise<string[]> {
  if (!blobConfigured()) {
    throw new Error("사진 저장소(Blob)가 아직 연결되지 않았습니다.");
  }
  const out: string[] = [];
  for (const u of urls) {
    if (/^https?:\/\//i.test(u)) {
      out.push(u);
      continue;
    }
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(u);
    if (!m) continue; // ignore anything that isn't an inline image
    const contentType = m[1];
    const buf = Buffer.from(m[2], "base64");
    const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const key = `camstudy/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const res = await put(key, buf, { access: "public", contentType });
    out.push(res.url);
  }
  return out;
}
