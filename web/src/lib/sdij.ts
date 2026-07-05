import "server-only";

// Client for the SDIJ (시대인재) "부엉이 포스트" grade report. The site has no API
// and no clean login endpoint we can drive headlessly — the report at
// /aca/owlPost/tail/ is produced by POSTing the authenticated `studeepForm` to
// my_std.asp, with auth carried by ASP session cookies plus the form's hidden
// fields (authIdx / authNumber / UserDate). The student authenticates once in
// their own browser and hands us that request (Copy as cURL); we replay it
// server-side and re-render the exact content in-app. The UserDate token rotates
// per request, so we refresh our stored copy from every successful response.

const ORIGIN = "https://www.sdij.com";
const OWL_PATH = "/aca/owlPost/tail";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class SdijError extends Error {
  constructor(
    message: string,
    public code: "auth" | "network" | "parse" | "input" = "network"
  ) {
    super(message);
    this.name = "SdijError";
  }
}

export type SdijAuth = { cookie: string; body: string };
export type SdijSubKind = "anssheet" | "top3";

/** Parse a browser "Copy as cURL" of the authenticated my_std.asp request into
 * the Cookie header and the POST body we need to replay it. Accepts both the
 * bash (single-quote) and cmd (double-quote) cURL dialects. */
export function parseSdijCurl(raw: string): SdijAuth {
  const text = raw.trim();

  const headers: string[] = [];
  const hRe = /(?:-H|--header)\s+(['"])([\s\S]*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(text))) headers.push(m[2]);

  let cookie = "";
  for (const h of headers) {
    const c = /^\s*cookie\s*:\s*([\s\S]*)$/i.exec(h);
    if (c) cookie = c[1].trim();
  }
  if (!cookie) {
    const bm = /(?:-b|--cookie)\s+(['"])([\s\S]*?)\1/.exec(text);
    if (bm) cookie = bm[2].trim();
  }

  let body = "";
  const dm = /(?:--data-raw|--data-binary|--data-ascii|--data|-d)\s+(['"])([\s\S]*?)\1/.exec(text);
  if (dm) body = dm[2];

  if (!cookie || !/aspsession/i.test(cookie)) {
    throw new SdijError("SDIJ 세션 쿠키를 찾지 못했습니다. my_std.asp 요청을 'cURL로 복사'해서 붙여넣어 주세요.", "input");
  }
  if (!body || !/(authIdx|UserDate)/.test(body)) {
    throw new SdijError("요청 본문(studeepForm)을 찾지 못했습니다. POST 요청(my_std.asp)을 그대로 복사했는지 확인해 주세요.", "input");
  }
  return { cookie, body };
}

function baseHeaders(cookie: string): Record<string, string> {
  return {
    "User-Agent": UA,
    Cookie: cookie,
    Referer: `${ORIGIN}${OWL_PATH}/`,
    Origin: ORIGIN,
    "Accept-Language": "ko-KR,ko;q=0.9",
  };
}

/** POST the studeepForm to my_std.asp and return the raw HTML of the report page. */
export async function sdijFetchOwlPost(auth: SdijAuth, bodyOverride?: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${ORIGIN}${OWL_PATH}/my_std.asp`, {
      method: "POST",
      headers: { ...baseHeaders(auth.cookie), "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyOverride ?? auth.body,
      redirect: "manual",
    });
  } catch {
    throw new SdijError("SDIJ에 연결하지 못했습니다.", "network");
  }
  const html = await res.text();
  if (res.status >= 300 && res.status < 400) {
    throw new SdijError("SDIJ 인증이 만료되었습니다. 다시 인증해 주세요.", "auth");
  }
  if (!html.includes('id="studeepForm"')) {
    throw new SdijError("SDIJ 인증이 만료되었습니다. 다시 인증해 주세요.", "auth");
  }
  return html;
}

/** POST the form to one of the ajax sub-endpoints (문항별 답안지 / top3). */
export async function sdijFetchSub(auth: SdijAuth, kind: SdijSubKind, body: string): Promise<string> {
  const ep = kind === "top3" ? "ajax_top3.asp" : "ajax_Anssheelist.asp";
  let res: Response;
  try {
    res = await fetch(`${ORIGIN}${OWL_PATH}/${ep}`, {
      method: "POST",
      headers: {
        ...baseHeaders(auth.cookie),
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    });
  } catch {
    throw new SdijError("SDIJ에 연결하지 못했습니다.", "network");
  }
  const html = await res.text();
  return absolutizeAssets(html);
}

/** Rewrite site-absolute (/…) and protocol-relative (//…) asset refs to point at
 * SDIJ so a standalone/iframe document loads the real CSS, JS and images. Leaves
 * "./…" refs alone — those are our authenticated sub-requests, proxied later. */
function absolutizeAssets(html: string): string {
  return html
    .replace(/\b(src|href)=(["'])\/\/(?!\/)/gi, `$1=$2https://`)
    .replace(/\b(src|href)=(["'])\/(?!\/)/gi, `$1=$2${ORIGIN}/`)
    .replace(/url\((["']?)\/(?!\/)/gi, `url($1${ORIGIN}/`);
}

/** Pull the studeepForm hidden fields out of a report page so we can refresh our
 * stored request body (chiefly the rotating UserDate token). */
export function extractHiddenFields(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const formStart = html.indexOf('id="studeepForm"');
  if (formStart < 0) return out;
  const region = html.slice(formStart, formStart + 4000);
  const re = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    const tag = m[0];
    const name = /name=["']([^"']+)["']/.exec(tag);
    const value = /value=["']([^"']*)["']/.exec(tag);
    if (name) out[name[1]] = value ? value[1] : "";
  }
  return out;
}

/** Merge the freshest auth fields from a response back into our stored body,
 * preserving any other params. Returns the new body string. */
export function refreshBody(oldBody: string, html: string): string {
  const fields = extractHiddenFields(html);
  if (!fields.UserDate) return oldBody;
  const params = new URLSearchParams(oldBody);
  for (const key of ["authIdx", "authHp1", "authHp2", "authHp3", "authNumber", "UserDate", "tabCode"]) {
    if (fields[key] != null) params.set(key, fields[key]);
  }
  return params.toString();
}

/** Build a self-contained HTML document from a fetched report page: the real
 * <main> content plus its behaviour script, the SDIJ stylesheets, and jQuery —
 * with asset URLs absolutized and the authenticated sub-requests pointed back at
 * our own proxy so dropdowns and the 문항별 expander keep working in the iframe. */
export function buildStandaloneDoc(reportHtml: string): string {
  const mainStart = reportHtml.indexOf('<main class="container-sub">');
  const mainClose = reportHtml.indexOf("</main>", mainStart);
  if (mainStart < 0 || mainClose < 0) {
    throw new SdijError("부엉이 포스트 내용을 찾지 못했습니다.", "parse");
  }
  const mainHtml = reportHtml.slice(mainStart, mainClose + "</main>".length);

  // The page's behaviour (search_data / IfMTestGubun / fnAnssheet / openModal)
  // lives in the first attribute-less <script> right after </main>.
  let scriptHtml = "";
  const scriptRe = /<script>([\s\S]*?)<\/script>/g;
  scriptRe.lastIndex = mainClose;
  let sm: RegExpExecArray | null;
  while ((sm = scriptRe.exec(reportHtml))) {
    if (/search_data|IfMTestGubun|fnAnssheet|openModal/.test(sm[1])) {
      scriptHtml = sm[0];
      break;
    }
  }

  let doc = mainHtml + "\n" + scriptHtml;
  doc = absolutizeAssets(doc);
  doc = doc
    .replace(new RegExp(`${ORIGIN}/aca/owlPost/tail/my_std\\.asp\\?`, "g"), "/api/sdij/owlpost")
    .replace(/\.\/my_std\.asp/g, "/api/sdij/owlpost")
    .replace(/\.\/ajax_Anssheelist\.asp/g, "/api/sdij/sub?kind=anssheet")
    .replace(/\.\/ajax_top3\.asp/g, "/api/sdij/sub?kind=top3");

  const styles = [
    "/common/css/layout/layout.css",
    "/common/css/typography.css",
    "/common/css/button.css",
    "/common/css/pagination.css",
    "/common/css/tab.css",
    "/common/css/dropdown.css",
    "/common/css/modal.css",
    "/common/css/sd2019/chart1.css",
    "/common/css/sd2019/board.css",
    "/common/css/owlPost-my-std.css",
  ]
    .map((href) => `<link rel="stylesheet" href="${ORIGIN}${href}" />`)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>부엉이 포스트</title>
    ${styles}
    <script src="${ORIGIN}/common/js/sd2019/lib/jquery-1.12.4.min.js"></script>
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      main.container-sub { padding: 0 !important; }
    </style>
  </head>
  <body>
    ${doc}
  </body>
</html>`;
}
