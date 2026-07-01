import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Resolves which student's data the current request should read.
 * - STUDENT: always their own id.
 * - PARENT: must supply a `studentId` that's actually linked to them.
 */
export async function resolveStudentId(
  user: { id: string; role: "STUDENT" | "PARENT" },
  requestedStudentId: string | null
): Promise<{ studentId: string } | { error: string; status: number }> {
  if (user.role === "STUDENT") return { studentId: user.id };

  if (!requestedStudentId) return { error: "studentId가 필요합니다.", status: 400 };
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId: requestedStudentId } },
  });
  if (!link) return { error: "연동되지 않은 학생입니다.", status: 403 };
  return { studentId: requestedStudentId };
}

export async function firstLinkedStudent(parentId: string) {
  const link = await prisma.parentStudentLink.findFirst({
    where: { parentId },
    orderBy: { linkedAt: "desc" },
    include: { student: true },
  });
  return link?.student || null;
}
