export const QUOTES = [
  { text: "오늘 걷지 않으면 내일은 뛰어야 한다.", author: "토마스 홉스" },
  { text: "포기하지 않는 한 실패는 없다.", author: "토머스 에디슨" },
  { text: "가장 느리게 가는 사람도 목표를 잃지 않으면 빨리 가는 사람보다 앞선다.", author: "레싱" },
  { text: "노력은 배신하지 않는다. 다만 시간이 걸릴 뿐이다.", author: "—" },
];

export function todayQuote(date: Date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000) % QUOTES.length;
  return QUOTES[dayIndex];
}
