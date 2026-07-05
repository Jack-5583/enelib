// Shared types + grading logic for the OMR (수능 답안지) marking feature.
// An OMR sheet is a list of questions, each a 5-지선다 choice or a 단답형 number
// (entered via a digit grid, like 수학 16–22 on the real 수능 answer sheet).

export type OmrQuestionType = "choice" | "short";

export interface OmrQuestion {
  no: number;
  type: OmrQuestionType;
  /** Correct answer: "1".."5" for choice, an integer string (e.g. "98") for short. */
  answer: string;
  /** Points awarded when correct. */
  points: number;
  /** 공통과목 / 선택과목 grouping, as on the real sheet (undefined = single section). */
  section?: "공통" | "선택";
}

export type OmrConfig = OmrQuestion[];

/** A map of question number → the student's marked value ("1".."5" or a number). */
export type OmrAnswers = Record<string, string>;

export interface OmrGradeResult {
  raw: number;
  total: number;
  correctCount: number;
  answeredCount: number;
  questionCount: number;
  wrongNos: number[];
  blankNos: number[];
  /** Per-question correctness for review rendering. */
  perQuestion: { no: number; correct: boolean; blank: boolean; answer: string; marked: string }[];
}

/** Grade a set of marked answers against a sheet's config. Unanswered questions
 * count as neither correct nor "wrong" (they're listed as blanks). Short answers
 * are compared numerically so leading zeros don't matter. */
export function gradeOmr(config: OmrConfig, answers: OmrAnswers): OmrGradeResult {
  let raw = 0;
  let total = 0;
  let correctCount = 0;
  let answeredCount = 0;
  const wrongNos: number[] = [];
  const blankNos: number[] = [];
  const perQuestion: OmrGradeResult["perQuestion"] = [];

  for (const q of config) {
    total += q.points;
    const marked = (answers[String(q.no)] ?? "").trim();
    const blank = marked === "";
    let correct = false;
    if (!blank) {
      answeredCount += 1;
      correct = q.type === "short" ? numEq(marked, q.answer) : marked === q.answer.trim();
    }
    if (correct) {
      raw += q.points;
      correctCount += 1;
    } else if (blank) {
      blankNos.push(q.no);
    } else {
      wrongNos.push(q.no);
    }
    perQuestion.push({ no: q.no, correct, blank, answer: q.answer, marked });
  }

  return { raw, total, correctCount, answeredCount, questionCount: config.length, wrongNos, blankNos, perQuestion };
}

function numEq(a: string, b: string): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a.trim() === b.trim();
  return na === nb;
}

type Section = "공통" | "선택" | undefined;

export const SUBJECT_PRESETS: { id: string; label: string; subject: string; build: () => OmrConfig }[] = [
  {
    id: "korean",
    label: "국어 (공통 1–34 · 선택 35–45)",
    subject: "국어",
    build: () => [...choices(1, 34, 2, "공통"), ...choices(35, 45, 2, "선택")],
  },
  {
    id: "math",
    label: "수학 (공통 1–22 · 선택 23–30)",
    subject: "수학",
    // 공통: 1–15 choice, 16–22 단답형 / 선택: 23–28 choice, 29–30 단답형
    build: () => [
      ...choices(1, 15, 3, "공통"),
      ...shorts(16, 22, 4, "공통"),
      ...choices(23, 28, 4, "선택"),
      ...shorts(29, 30, 4, "선택"),
    ],
  },
  { id: "english", label: "영어 (45문항)", subject: "영어", build: () => choices(1, 45, 2) },
  { id: "history", label: "한국사 (20문항)", subject: "한국사", build: () => choices(1, 20, 2) },
  { id: "tamgu", label: "탐구 (20문항)", subject: "탐구", build: () => choices(1, 20, 2) },
];

function choices(from: number, to: number, points: number, section?: Section): OmrConfig {
  const out: OmrConfig = [];
  for (let n = from; n <= to; n += 1) out.push({ no: n, type: "choice", answer: "", points, section });
  return out;
}
function shorts(from: number, to: number, points: number, section?: Section): OmrConfig {
  const out: OmrConfig = [];
  for (let n = from; n <= to; n += 1) out.push({ no: n, type: "short", answer: "", points, section });
  return out;
}

/** Build a plain custom sheet of N choice questions. */
export function customChoiceConfig(count: number, points = 2): OmrConfig {
  return choices(1, Math.max(1, Math.min(100, count)), points);
}

export function sumPoints(config: OmrConfig): number {
  return config.reduce((s, q) => s + (q.points || 0), 0);
}
