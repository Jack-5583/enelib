import "server-only";
import { prisma } from "@/lib/prisma";
import { EXAM_TYPE_LABEL } from "@/lib/grades";

export function roundLabel(round: number): string {
  return `${String(round).padStart(2, "0")}회`;
}

interface PaperTitleShape {
  title: string;
  round: number | null;
  series?: { name: string } | null;
}

/** Series papers are titled by their series name + round; everything else keeps its own title. */
export function examPaperDisplayTitle(paper: PaperTitleShape): string {
  if (paper.series) {
    return paper.round != null ? `${paper.series.name} ${roundLabel(paper.round)}` : paper.series.name;
  }
  return paper.title;
}

/** Resolves the max score for a given subject on a given exam paper (SUBJECT papers have one max score, FULL papers have one per subject). */
export async function maxScoreForPaperSubject(examPaperId: string, subject: string): Promise<number | null> {
  const paper = await prisma.examPaper.findUnique({
    where: { id: examPaperId },
    include: { subjects: true },
  });
  if (!paper) return null;
  if (paper.kind === "SUBJECT") return paper.maxScore;
  return paper.subjects.find((s) => s.subject === subject)?.maxScore ?? null;
}

interface PaperListShape extends PaperTitleShape {
  id: string;
  kind: "FULL" | "SUBJECT";
  subject: string | null;
  type: string;
  examDate: string;
  maxScore: number | null;
  subjects: { subject: string; maxScore: number }[];
}

export function examPaperListItemDTO(paper: PaperListShape) {
  return {
    id: paper.id,
    kind: paper.kind,
    subject: paper.subject,
    title: examPaperDisplayTitle(paper),
    type: EXAM_TYPE_LABEL[paper.type],
    examDate: paper.examDate,
    maxScore: paper.maxScore,
    subjects: paper.subjects.map((s) => ({ subject: s.subject, maxScore: s.maxScore })),
  };
}
