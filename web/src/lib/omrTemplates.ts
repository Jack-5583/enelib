import raw from "./omrTemplates.json";

// Coordinate maps extracted from the provided 수능 답안지 PDF (one per subject
// page). The matching /omr/<id>.svg is the exact PDF artwork; these coords place
// the interactive bubbles on top of it. All coordinates are in the SVG viewBox.

export type OmrChoiceTQ = { no: number; type: "choice"; bubbles: [number, number][]; sec?: string };
export type OmrShortCell = { d: number; x: number; y: number };
export type OmrShortTQ = { no: number; type: "short"; cols: OmrShortCell[][]; sec?: string };
export type OmrTemplateQ = OmrChoiceTQ | OmrShortTQ;
export interface OmrTemplate {
  subject: string;
  viewBox: [number, number];
  questions: OmrTemplateQ[];
}

export const OMR_TEMPLATES = raw as unknown as Record<string, OmrTemplate>;

export const TEMPLATE_LIST: { id: string; subject: string; label: string }[] = [
  { id: "korean", subject: "국어", label: "국어 (45문항)" },
  { id: "math", subject: "수학", label: "수학 (공통 1–22 · 선택 23–30, 단답형 포함)" },
  { id: "english", subject: "영어", label: "영어 (45문항)" },
  { id: "history", subject: "한국사", label: "한국사 (20문항)" },
  { id: "tamgu", subject: "탐구", label: "탐구 (제1선택 · 제2선택 각 20문항)" },
];

export function templateIdForSubject(subject: string): string {
  const hit = TEMPLATE_LIST.find((t) => t.subject === subject || subject.startsWith(t.subject));
  return hit?.id ?? "korean";
}

export function svgUrl(templateId: string): string {
  return `/omr/${templateId}.svg`;
}
