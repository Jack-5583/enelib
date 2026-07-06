// Shared types + grading logic for the OMR (수능 답안지) marking feature.
// The visual sheet is the real PDF (as SVG); these types describe the answer key
// and grading. A question is a 5-지선다 choice or a 단답형 number.
import { OMR_TEMPLATES } from "@/lib/omrTemplates";

export type OmrQuestionType = "choice" | "short";

export interface OmrQuestion {
  no: number;
  type: OmrQuestionType;
  /** Correct answer: "1".."5" for choice, an integer string (e.g. "98") for short. */
  answer: string;
  /** Points awarded when correct. */
  points: number;
  /** Optional grouping label (공통/선택/제1선택…) — display only. */
  section?: string;
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
  perQuestion: { no: number; correct: boolean; blank: boolean; answer: string; marked: string }[];
}

/** Grade marked answers against a sheet's config. Unanswered questions are listed
 * as blanks (not "wrong"). Short answers compare numerically. */
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

/** Build a blank answer-key config from a subject template (default points:
 * choice 2, 단답형 4 — editable later). */
export function configFromTemplate(templateId: string): OmrConfig {
  const tpl = OMR_TEMPLATES[templateId];
  if (!tpl) return [];
  return tpl.questions.map((q) => ({
    no: q.no,
    type: q.type,
    answer: "",
    points: q.type === "short" ? 4 : 2,
    section: q.sec,
  }));
}

export function sumPoints(config: OmrConfig): number {
  return config.reduce((s, q) => s + (q.points || 0), 0);
}
