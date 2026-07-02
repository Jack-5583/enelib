import { kstEpochDay } from "@/lib/kst";

export const QUOTES = [
  { text: "오늘 걷지 않으면 내일은 뛰어야 한다.", author: "토마스 홉스" },
  { text: "포기하지 않는 한 실패는 없다.", author: "토머스 에디슨" },
  { text: "가장 느리게 가는 사람도 목표를 잃지 않으면 빨리 가는 사람보다 앞선다.", author: "레싱" },
  { text: "노력은 배신하지 않는다. 다만 시간이 걸릴 뿐이다.", author: "—" },
  { text: "성공은 매일 반복한 작은 노력들의 합이다.", author: "로버트 콜리어" },
  { text: "천 리 길도 한 걸음부터.", author: "속담" },
  { text: "할 수 있다고 믿든 할 수 없다고 믿든, 믿는 대로 될 것이다.", author: "헨리 포드" },
  { text: "고통 없이는 아무것도 얻을 수 없다.", author: "속담" },
  { text: "지금 이 순간이 가장 젊고 가장 빠른 때다.", author: "—" },
  { text: "포기하고 싶을 때가 바로 성공이 가까워진 때다.", author: "—" },
  { text: "꿈을 이루는 방법은 그것을 향해 계속 나아가는 것뿐이다.", author: "월트 디즈니" },
  { text: "실패는 성공으로 가는 과정일 뿐이다.", author: "—" },
  { text: "오늘 하루도 최선을 다한 나에게 박수를.", author: "—" },
  { text: "노력하는 자는 즐기는 자를 이길 수 없지만, 즐기려면 먼저 노력해야 한다.", author: "—" },
  { text: "작은 습관이 큰 결과를 만든다.", author: "제임스 클리어" },
  { text: "시작이 반이다.", author: "속담" },
  { text: "어제와 똑같이 살면서 다른 미래를 기대하지 마라.", author: "아인슈타인" },
  { text: "네가 지금 하는 노력은 반드시 어딘가에 남는다.", author: "—" },
  { text: "높이 나는 새가 멀리 본다.", author: "리처드 바크" },
  { text: "행운은 준비가 기회를 만났을 때 찾아온다.", author: "세네카" },
  { text: "가장 큰 위험은 위험 없는 삶이다.", author: "—" },
  { text: "포기하지 않으면 늦더라도 결국 도착한다.", author: "—" },
  { text: "인내는 쓰지만 그 열매는 달다.", author: "장 자크 루소" },
  { text: "오늘의 노력이 내일의 나를 만든다.", author: "—" },
  { text: "남과 비교하지 말고 어제의 나와 비교하라.", author: "—" },
  { text: "될 때까지 하면 안 되는 게 없다.", author: "—" },
  { text: "공부는 배신하지 않는다.", author: "—" },
  { text: "지금 흘리는 땀은 미래의 웃음이 된다.", author: "—" },
  { text: "결국 해내는 사람은 포기하지 않은 사람이다.", author: "—" },
  { text: "완벽보다 완주가 중요하다.", author: "—" },
  { text: "매일 1%씩 나아지면 1년 뒤엔 37배 성장한다.", author: "제임스 클리어" },
  { text: "가장 어두운 밤도 끝나고 해는 뜬다.", author: "빅토르 위고" },
  { text: "지금의 어려움은 훗날 좋은 이야깃거리가 된다.", author: "—" },
  { text: "노력한 시간은 절대 배신하지 않는다.", author: "—" },
  { text: "실패를 두려워하지 말고, 도전하지 않음을 두려워하라.", author: "—" },
  { text: "합격은 재능이 아니라 꾸준함이 만든다.", author: "—" },
  { text: "오늘 미룬 일은 내일의 짐이 된다.", author: "—" },
  { text: "작은 진전도 진전이다.", author: "—" },
  { text: "너의 속도로 가도 괜찮다, 멈추지만 마라.", author: "—" },
  { text: "힘든 순간은 지나가지만 그때의 노력은 남는다.", author: "—" },
  { text: "간절히 원하면 온 우주가 도와준다.", author: "파울로 코엘료" },
];

interface Quote {
  text: string;
  author: string;
}

function localQuote(date: Date): Quote {
  const dayIndex = kstEpochDay(date) % QUOTES.length;
  return QUOTES[dayIndex];
}

/** Kept for any existing synchronous callers — deterministic local rotation only. */
export function todayQuote(date: Date = new Date()): Quote {
  return localQuote(date);
}

/**
 * Best-effort fetch from a free public Korean quotes API for extra variety,
 * falling back to the local curated list (deterministic by day) if the
 * request fails, times out, or the response shape doesn't match — this is a
 * small community-run API with no uptime guarantee, so it must never block
 * or break the dashboard.
 */
export async function getDailyQuote(date: Date = new Date()): Promise<Quote> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://korean-advice-open-api.vercel.app/api/advice", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return localQuote(date);
    const data = await res.json();
    const text = typeof data?.message === "string" ? data.message.trim() : "";
    const author = typeof data?.author === "string" ? data.author.trim() : "";
    if (!text) return localQuote(date);
    return { text, author: author || "—" };
  } catch {
    return localQuote(date);
  }
}
