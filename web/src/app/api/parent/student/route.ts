import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { firstLinkedStudent } from "@/lib/access";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const student = await firstLinkedStudent(user.id);
  if (!student) return NextResponse.json({ student: null });
  return NextResponse.json({ student: { id: student.id, name: student.name, schoolLabel: student.schoolLabel } });
}
