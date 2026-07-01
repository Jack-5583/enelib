import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { firstLinkedStudent } from "@/lib/access";
import { computeDashboardStats } from "@/lib/stats";

function fmtTimeLabel(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const student = await firstLinkedStudent(user.id);
  if (!student) return NextResponse.json({ student: null });

  const stats = await computeDashboardStats(student.id);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const entries = await prisma.timelineEntry.findMany({
    where: { ownerId: student.id, capturedAt: { gte: start } },
    include: { memo: true },
    orderBy: { capturedAt: "asc" },
  });

  const todayDone = stats.totalCount ? Math.round((stats.doneCount / stats.totalCount) * 100) : 0;

  return NextResponse.json({
    student: { id: student.id, name: student.name, schoolLabel: student.schoolLabel },
    parentStats: [
      { label: "오늘 완료율", value: `${todayDone}%` },
      { label: "이번 주 완료율", value: `${stats.weekPct}%` },
      { label: "오늘 학습시간", value: stats.weekHours },
      { label: "연속 학습", value: stats.streakDays },
    ],
    timelineEntries: entries.map((e) => ({
      id: e.id,
      time: fmtTimeLabel(e.capturedAt),
      subject: e.subject,
      title: e.todoTitle,
      photoUrl: e.memo?.dataUrl || e.photoUrl,
    })),
  });
}
