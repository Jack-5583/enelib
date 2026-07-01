import "server-only";
import { randomInt } from "node:crypto";

// Short, human-typeable parent-linking code (distinct from the long OCTOMO
// SMS verification string) — matches the "ENE-XXXX-XX" format from the
// original prototype.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function block(n: number) {
  let out = "";
  for (let i = 0; i < n; i++) out += CHARSET[randomInt(CHARSET.length)];
  return out;
}

export function generateStudentAuthCode() {
  return `ENE-${block(4)}-${block(2)}`;
}
