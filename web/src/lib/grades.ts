import "server-only";
import { prisma } from "@/lib/prisma";
import { SUBJECTS } from "@/lib/subjects";

export const DEFAULT_SUBJECTS = SUBJECTS.filter((s) => s !== "기타");
export const DEFAULT_EXAM_TYPES = ["모평", "학평", "내신", "사설", "수능"];
export const DEFAULT_MATERIAL_TAGS = ["기출", "모평", "학평", "독서", "유형", "어법", "오답"];

export async function getSubjectChips(ownerId: string) {
  const rows = await prisma.exam.findMany({ where: { ownerId }, select: { subject: true }, distinct: ["subject"] });
  const subjects = new Set(DEFAULT_SUBJECTS);
  for (const r of rows) subjects.add(r.subject);
  return [...subjects];
}

export function buildSubjectTrend(exams: { date: string; grade: number }[], width: number, height: number) {
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
  const padX = width * 0.065;
  const padTop = height * 0.15;
  const padBot = height * 0.15;
  const n = sorted.length;
  const x = (i: number) => padX + (n <= 1 ? (width - 2 * padX) / 2 : (i * (width - 2 * padX)) / (n - 1));
  const y = (g: number) => padTop + ((g - 1) / 8) * (height - padTop - padBot);
  return {
    W: width,
    H: height,
    points: sorted.map((e, i) => `${x(i).toFixed(1)},${y(e.grade).toFixed(1)}`).join(" "),
    dots: sorted.map((e, i) => ({ cx: x(i).toFixed(1), cy: y(e.grade).toFixed(1), label: e.date.slice(3) })),
  };
}

export function buildSubjectSummary(exams: { type: string; grade: number }[]) {
  const grades = exams.map((e) => e.grade);
  const stdEx = exams.filter((e) => e.type === "모평" || e.type === "학평");
  let deltaLabel = exams.length ? `기록 ${exams.length}개` : "기록 없음";
  if (stdEx.length >= 2) {
    const d = stdEx[1].grade - stdEx[0].grade;
    deltaLabel = d > 0 ? `▾ ${d}등급 상승` : d < 0 ? `▴ ${-d}등급 하락` : "변동 없음";
  }
  return {
    latest: grades.length ? grades[0] : null,
    best: grades.length ? Math.min(...grades) : null,
    count: exams.length,
    deltaLabel,
  };
}
