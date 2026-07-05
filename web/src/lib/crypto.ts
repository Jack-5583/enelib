import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// Symmetric encryption for third-party credentials we must store to act on the
// user's behalf (e.g. their hohoonmath login). Key is derived from AUTH_SECRET
// so no extra env var is required; rotating AUTH_SECRET invalidates stored blobs.
function key(): Buffer {
  return createHash("sha256").update(process.env.AUTH_SECRET || "").digest();
}

/** Returns "iv.tag.ciphertext", all base64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 3) throw new Error("malformed secret");
  const [iv, tag, enc] = parts.map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
