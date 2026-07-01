import "server-only";
import { randomInt } from "node:crypto";

// Unambiguous alphanumeric charset (no 0/O, 1/I/L) — user explicitly requested
// a long, high-entropy mixed letters+digits verification string (30+ chars)
// embedded in the SMS body OCTOMO matches against.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 32;

export function generateVerifyCode(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += CHARSET[randomInt(CHARSET.length)];
  }
  // Group into 4-char chunks for readability in the SMS body / QR text.
  return out.match(/.{1,4}/g)!.join("-");
}
