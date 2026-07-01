import "server-only";
import QRCode from "qrcode";

/**
 * OCTOMO (https://api.octoverse.kr) phone verification client.
 *
 * OCTOMO's flow is MO ("mobile originated" / 수신): the *user's own phone*
 * sends an SMS to OCTOMO's shared receiving number (1666-3538), and the
 * server side asks OCTOMO whether a matching message arrived.
 *
 * Confirmed API contract (2026-07-01):
 *   POST /octomo/v1/public/message/exists   { mobileNum, text, withinMinutes? } -> { verified }
 *   POST /octomo/v1/public/message/qr-code  { text, errorCorrectionLevel?, margin?, width? } -> { qrCode: dataURL }
 *   Auth header: `Authorization: Octomo {API_KEY}` (custom scheme, not Bearer).
 */

const API_BASE = "https://api.octoverse.kr/octomo/v1/public";
const API_KEY = process.env.OCTOMO_API_KEY;
export const OCTOMO_RECEIVE_NUMBER = process.env.OCTOMO_RECEIVE_NUMBER || "16663538";
export const OCTOMO_RECEIVE_NUMBER_LABEL = "1666-3538";

// Sandbox/dev-only: this environment cannot reach api.octoverse.kr (not on
// the network egress allowlist), so real verification can't be end-to-end
// tested here. Setting this flag auto-verifies after a short delay so the
// rest of the app is testable. Must be unset (default) for any real deploy.
const DEV_BYPASS = process.env.OCTOMO_DEV_BYPASS === "true";

function normalizePhone(v: string) {
  return v.replace(/\D/g, "").replace(/^82/, "0");
}

function authHeaders() {
  return {
    Authorization: `Octomo ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** The exact text the user's phone must send — used identically for the QR
 * body, the mobile `sms:` deep link, and the `/message/exists` check, so
 * whatever OCTOMO actually received always matches what we ask about. */
export function buildOctomoMessageBody(code: string) {
  return `OCTOMO 인증 ${code}`;
}

export interface OctomoCheckOutcome {
  status: "verified" | "pending" | "unavailable";
  /** Safe-to-display diagnostic string (never includes the API key). */
  reason?: string;
}

export async function checkOctomoVerification(
  phone: string,
  code: string,
  createdAtIso: string,
  withinMinutes = 5
): Promise<OctomoCheckOutcome> {
  if (DEV_BYPASS) {
    // Simulate the SMS arriving ~2.5s after the request was created.
    const elapsed = Date.now() - new Date(createdAtIso).getTime();
    return { status: elapsed > 2500 ? "verified" : "pending" };
  }

  if (!API_KEY) {
    return { status: "unavailable", reason: "OCTOMO_API_KEY 환경변수가 설정되지 않았습니다." };
  }

  try {
    const res = await fetch(`${API_BASE}/message/exists`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        mobileNum: normalizePhone(phone),
        text: buildOctomoMessageBody(code),
        withinMinutes,
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const reason = `OCTOMO 응답 오류 (HTTP ${res.status}): ${bodyText.slice(0, 300)}`;
      console.error("[octomo] message/exists error", res.status, bodyText);
      return { status: "unavailable", reason };
    }
    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      return {
        status: "unavailable",
        reason: `OCTOMO 응답을 해석할 수 없습니다: ${bodyText.slice(0, 300)}`,
      };
    }
    // Docs say the field is `verified`, but the real API returns `exists`.
    // Accept either so a future doc-matching change on OCTOMO's side doesn't
    // break us again.
    const parsed = data as { exists?: boolean; verified?: boolean } | null;
    const found = parsed?.exists ?? parsed?.verified;
    if (typeof found !== "boolean") {
      return {
        status: "unavailable",
        reason: `OCTOMO 응답 형식이 예상과 다릅니다: ${JSON.stringify(data).slice(0, 300)}`,
      };
    }
    return { status: found ? "verified" : "pending" };
  } catch (err) {
    const reason = `OCTOMO 서버에 연결할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`;
    console.error("[octomo] verification check failed:", err);
    return { status: "unavailable", reason };
  }
}

/** Local fallback QR (used only when OCTOMO's QR endpoint is unreachable,
 * e.g. this sandbox's network allowlist) — encodes the same SMSTO deep link
 * OCTOMO's own hosted generator produces. */
async function localQrFallback(text: string) {
  const uri = `SMSTO:${OCTOMO_RECEIVE_NUMBER}:${text}`;
  return QRCode.toDataURL(uri, { margin: 2, width: 200, color: { dark: "#161616", light: "#ffffff" } });
}

export async function getOctomoQrCode(text: string): Promise<string> {
  if (!DEV_BYPASS && API_KEY) {
    try {
      const res = await fetch(`${API_BASE}/message/qr-code`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text, width: 200, margin: 2 }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.qrCode === "string") return data.qrCode;
      } else {
        console.error("[octomo] qr-code error", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[octomo] qr-code request failed:", err);
    }
  }
  return localQrFallback(text);
}
