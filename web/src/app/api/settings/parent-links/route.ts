import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: user.id },
    include: { parent: true },
    orderBy: { linkedAt: "desc" },
  });
  return NextResponse.json(
    links.map((l) => ({ parentId: l.parentId, name: l.parent.name, linkedAt: l.linkedAt }))
  );
}
